const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary");

app.set("port", process.env.PORT || 8099);
const PORT = app.get("port");

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "/public")));

// mongo db
const MongoClient = require("mongodb").MongoClient;
let db = null;
MongoClient.connect(
  process.env.MONGO_URL,
  { useUnifiedTopology: true },
  (err, client) => {
    console.log("연결");
    if (err) {
      console.log(err);
    }
    db = client.db("crudapp");
  }
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, path.join(__dirname, "upload"));
  },
  filename: (req, file, callback) => {
    callback(null, file.originalname);
  },
});

const fileUpload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.render("index", { title: "로그인" });
});

app.get("/list", (req, res) => {
  res.render("list", { title: "게시판" });
});

app.get("/insert", (req, res) => {
  res.render("insert", { title: "영화 리뷰" });
});

app.post("/register", fileUpload.single("image"), (req, res) => {
  const movieTitle = req.body.movieTitle;
  const date = req.body.date;
  const desc = req.body.desc;
  const point = req.body.point;

  // console.log(movieTitle);
  // console.log(date);
  // console.log(desc);
  // console.log(point);
  // console.log(req.file);

  cloudinary.uploader.upload(req.file.path, (result) => {
    // console.log(result);
    db.collection("movie_board").insertOne({
      movieTitle: movieTitle,
      date: date,
      desc: desc,
      point: point,
      image: result.url,
    });
    res.redirect("/list");
  });
});

app.listen(PORT, () => {
  console.log(`${PORT}에서 서버 대기중`);
});
