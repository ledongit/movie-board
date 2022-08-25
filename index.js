const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary");
const { count } = require("console");

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

const storage = multer.diskStorage({});

const fileUpload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.render("index", { title: "로그인" });
});

app.get("/join", (req, res) => {
  res.render("join", { title: "회원가입" });
});

app.get("/list", (req, res) => {
  db.collection("movie_board")
    .find()
    .toArray((err, result) => {
      res.render("list", { title: "게시판", list: result });
    });
});

app.get("/insert", (req, res) => {
  res.render("insert", { title: "영화 리뷰" });
});

app.get("/review/:id", (req, res) => {
  console.log(req.params.id);
  const review_id = parseInt(req.params.id);

  db.collection("movie_board").findOne({ id: review_id }, (err, result) => {
    if (result) {
      res.render("review", { title: "Review", result: result });
    }
  });
});

app.post("/signUp", (req, res) => {
  const id = req.body.userID;
  const password = req.body.userPW;

  db.collection("movie_member").insertOne(
    {
      id: id,
      password: password,
    },
    (err, result) => {
      if (err) {
        console.log(err);
        res.send(`<script>alert("잠시 후에 다시 시도해주세요");`);
      }
      res.redirect("/success");
    }
  );
});

app.get("/success", (req, res) => {
  res.render("registerSuccess", { title: "회원가입 완료!" });
});

app.post("/register", fileUpload.single("image"), (req, res) => {
  const postTitle = req.body.postTitle;
  const movieTitle = req.body.movieTitle;
  const date = req.body.date;
  const desc = req.body.desc;
  const point = req.body.point;
  let today = new Date();

  cloudinary.uploader.upload(req.file.path, (result) => {
    console.log(result);
    db.collection("movie_board_count").findOne(
      { name: "total" },
      (err, result_count) => {
        const count = result_count.count;
        db.collection("movie_board").insertOne(
          {
            id: count,
            postTitle: postTitle,
            movieTitle: movieTitle,
            date: date,
            desc: desc,
            point: point,
            image: result.url,
            now: today.toLocaleString(),
          },
          (err, result_insert) => {
            db.collection("movie_board_count").updateOne(
              { name: "total" },
              { $inc: { count: 1 } },
              (err, result_insert) => {
                if (err) {
                  console.log(err);
                }
                res.redirect("/list");
              }
            );
          }
        );
      }
    );
  });
});

app.listen(PORT, () => {
  console.log(`${PORT}에서 서버 대기중`);
});
