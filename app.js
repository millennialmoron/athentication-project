require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect("mongodb://localhost:27017/userDB");

  const userSchema = new mongoose.Schema({
    email: String,
    password: String,
  });

  userSchema.plugin(encrypt, {
    secret: process.env.SECRET,
    encryptedFields: ["password"],
  });

  const User = new mongoose.model("User", userSchema);

  app.get("/", function (req, res) {
    res.render("home.ejs");
  });

  app
    .route("/login")
    .get(function (req, res) {
      res.render("login.ejs");
    })
    .post(function (req, res) {
      const username = req.body.username;
      const password = req.body.password;

      User.findOne({ email: username }, function (err, foundUser) {
        if (err) {
          console.log(err);
        } else {
          if (foundUser) {
            if (foundUser.password === password) {
              res.render("secrets.ejs");
            }
          }
        }
      });
    });

  app
    .route("/register")
    .get(function (req, res) {
      res.render("register.ejs");
    })
    .post(function (req, res) {
      const newUser = new User();
      newUser.email = req.body.username;
      newUser.password = req.body.password;
      newUser.save(function (err) {
        if (err) {
          console.log("AHHH PANIC!!" + err);
        } else {
          res.render("secrets.ejs");
        }
      });
    });
}
app.listen(3000, function () {
  console.log("am listenin'");
});
