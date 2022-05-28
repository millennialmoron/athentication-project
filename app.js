require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

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
  });

  userSchema.plugin(passportLocalMongoose);

  const User = new mongoose.model("User", userSchema);

  passport.use(User.createStrategy());
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

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

  app.get("/secrets", function (req, res) {
    if (req.isAuthenticated()) {
      res.render("secrets.ejs");
    } else {
      res.redirect("/login");
    }
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
