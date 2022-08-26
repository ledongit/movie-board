const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary");
// session 처리
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");

app.use(
  session({
    secret: "비밀코드",
    resave: true,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

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

app.get("/list", isLogged, (req, res) => {
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

app.get("/success", (req, res) => {
  res.render("registerSuccess", { title: "회원가입 완료!" });
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

function isLogged(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.send(
      `<script>alert("로그인이 필요합니다."); location.href="/"</script>`
    );
  }
}

passport.use(
  new LocalStrategy(
    {
      usernameField: "userID",
      passwordField: "userPW",
      session: true,
      passReqToCallback: false,
    },
    (id, password, done) => {
      console.log(id, "===", password);
      db.collection("member").findOne({ userID: id }, (err, result) => {
        if (err) {
          console.log(err);
          return done(err);
        }
        if (!result) {
          console.log("result 없음");
          return done(null, false, { message: "존재하지 않는 아이디 입니다." });
        } else {
          if (password === result.userPW) {
            console.log("로그인 성공");
            return done(null, result);
          } else {
            console.log("로그인 실패");
            return done(null, false, { message: "password를 확인해주세요" });
          }
        }
      });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("serializeUser===", user);
  done(null, user.userID);
});
passport.deserializeUser((id, done) => {
  db.collection("movie_member").findOne({ id: id }, (err, result) => {
    console.log("====", result);
    done(null, result);
  });
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/",
    successRedirect: "/list",
  })
);
app.get("/aa", (req, res) => {
  console.log(req.user);
  res.send("dfdf");
});

app.listen(PORT, () => {
  console.log(`${PORT}에서 서버 대기중`);
});
