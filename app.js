require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret:
      "This is our little secret which no one will ever be able to guess or know.",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect("mongodb://localhost:27017/userDB");

  const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleID: String,
  });

  const secretSchema = new mongoose.Schema({
    secret: String,
  });

  userSchema.plugin(passportLocalMongoose);
  userSchema.plugin(findOrCreate);

  const User = new mongoose.model("User", userSchema);
  const Secret = new mongoose.model("Secret", secretSchema);

  passport.use(User.createStrategy());

  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
      },
      function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ googleID: profile.id }, function (err, user) {
          return cb(err, user);
        });
      }
    )
  );

  app.get("/", function (req, res) {
    res.render("home.ejs");
  });

  app
    .route("/register")
    .get(function (req, res) {
      res.render("register.ejs");
    })
    .post(function (req, res) {
      User.register(
        { username: req.body.username },
        req.body.password,
        function (err, user) {
          if (err) {
            console.log("AHHHH PANIC!!..." + err);
            res.redirect("/register");
          } else {
            passport.authenticate("local")(req, res, function () {
              res.redirect("/secrets");
            });
          }
        }
      );
    });

  app
    .route("/login")
    .get(function (req, res) {
      res.render("login.ejs");
    })
    .post(
      passport.authenticate("local", { failureRedirect: "/login" }),
      function (req, res) {
        res.redirect("/secrets");
      }
    );

  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
  );

  app.get(
    "/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
      res.redirect("/secrets");
    }
  );

  app.get("/secrets", function (req, res) {
    Secret.find({ secret: { $ne: null } }, function (err, foundSecrets) {
      if (err) {
        console.log(err);
      } else {
        if (foundSecrets) {
          res.render("secrets", { secrets: foundSecrets });
        }
      }
    });
  });

  app
    .route("/submit")
    .get(function (req, res) {
      if (req.isAuthenticated()) {
        res.render("submit.ejs");
      } else {
        res.redirect("/login");
      }
    })
    .post(function (req, res) {
      const submittedSecret = req.body.secret;

      const newSecret = Secret();
      newSecret.secret = submittedSecret;
      newSecret.save();
      res.redirect("/secrets");
    });

  app.get("/logout", function (req, res) {
    req.logOut(function (err) {
      if (err) {
        console.log(err);
        res.redirect("/");
      } else {
        res.redirect("/");
      }
    });
  });
}

app.listen(3000, function () {
  console.log("am listenin'");
});
