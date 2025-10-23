import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import bcrypt from "bcrypt";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "TOPSECRETWORD",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "bookreview",
  password: "1328",
  port: 5432,
});
db.connect();

async function reviewData() {
  const result = await db.query(
    "SELECT bd.id, bd.book_title, bd.author_name, bd.rating, TO_CHAR(bd.posted_day, 'Month DD, YYYY') AS posted_day, br.book_image_url, br.short_summary FROM book_details AS bd JOIN book_review AS br ON bd.id=br.review_id"
  );
  return result.rows;
}
async function fullReview(id) {
  const result = await db.query(
    "SELECT bd.id, bd.book_title, bd.author_name, bd.rating, TO_CHAR(bd.posted_day, 'Month DD, YYYY') AS posted_day, br.book_image_url, br.short_summary, br.long_summary FROM book_details AS bd JOIN book_review AS br ON bd.id=br.review_id WHERE bd.id=$1",
    [id]
  );
  return result.rows;
}
async function filter(filter) {
  if (filter == "date") {
    const result = await db.query(
      "SELECT bd.id, bd.book_title, bd.author_name, bd.rating, TO_CHAR(bd.posted_day, 'Month DD, YYYY') AS posted_day, br.book_image_url, br.short_summary FROM book_details AS bd JOIN book_review AS br ON bd.id=br.review_id ORDER BY bd.posted_day DESC"
    );
    return result.rows;
  } else if (filter == "rating") {
    const result = await db.query(
      "SELECT bd.id, bd.book_title, bd.author_name, bd.rating, TO_CHAR(bd.posted_day, 'Month DD, YYYY') AS posted_day, br.book_image_url, br.short_summary FROM book_details AS bd JOIN book_review AS br ON bd.id=br.review_id ORDER BY bd.rating DESC"
    );
    return result.rows;
  } else if (filter == "name") {
    const result = await db.query(
      "SELECT bd.id, bd.book_title, bd.author_name, bd.rating, TO_CHAR(bd.posted_day, 'Month DD, YYYY') AS posted_day, br.book_image_url, br.short_summary FROM book_details AS bd JOIN book_review AS br ON bd.id=br.review_id ORDER BY bd.book_title ASC"
    );
    return result.rows;
  }
}
// home page with all book reviews
app.get("/", async (req, res) => {
  try {
    const bookDetails = await reviewData();
    res.render("index.ejs", { book: bookDetails });
  } catch (err) {
    console.log("not getting data from DB=>", err);
  }
});
// form for enter the name of book to add
app.get("/add", (req, res) => {
  res.render("add.ejs");
});
// form with book title image author name and input summary
app.post("/add", async (req, res) => {
  const bookName = req.body.name;
  try {
    const response = await axios.get(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(bookName)}`
    );
    if (!response.data.docs.length) {
      return res.redirect("/add");
    }
    const title = response.data.docs[0].title;
    const authorName = response.data.docs[0].author_name[0];
    const cover_i = response.data.docs[0].cover_i;
    const imageURL = `https://covers.openlibrary.org/b/id/${cover_i}-M.jpg`;
    res.render("newbook.ejs", {
      title: title,
      authorName: authorName,
      imageURL: imageURL,
    });
  } catch (err) {
    res.redirect("/");
  }
});
// full data of new book review
app.post("/books", async (req, res) => {
  const bookName = req.body.bookName;
  const imageURL = req.body.imageURL;
  const authorName = req.body.authorName;
  const shortSummary = req.body.shortSummary;
  const rating = req.body.rating;
  const longSummary = req.body.longSummary;
  try {
    const result = await db.query(
      "INSERT INTO book_details (book_title,author_name,rating) VALUES ($1,$2,$3) RETURNING id",
      [bookName, authorName, rating]
    );
    const reviewId = result.rows[0].id;
    await db.query(
      "INSERT INTO book_review (review_id,book_image_url,short_summary,long_summary) VALUES ($1,$2,$3,$4)",
      [reviewId, imageURL, shortSummary, longSummary]
    );
    res.redirect(`/books/${reviewId}`);
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
});

app.get("/books/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const bookReview = await fullReview(id);
    res.render("fullsizereview.ejs", { bookReview });
  } catch (err) {
    console.log(err);
  }
});

app.get("/books", async (req, res) => {
  const value = req.query.filter;
  const result = await filter(value);
  res.render("index.ejs", { book: result });
});
//admin section
app.get("/admin", async (req, res) => {
  if (req.isAuthenticated()) {
    const value = req.query.filter;
    if (!value) {
      try {
        const bookDetails = await reviewData();
        res.render("admin.ejs", { book: bookDetails });
      } catch (err) {
        console.log("not getting data from DB=>", err);
      }
    } else {
      const result = await filter(value);
      res.render("admin.ejs", { book: result });
    }
  } else {
    res.redirect("/login");
  }
});

app.get("/edit/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const bookReview = await fullReview(id);
    res.render("editing.ejs", { data: bookReview });
  } catch (err) {
    console.log(err);
  }
});
app.post("/edit", async (req, res) => {
  const data = req.body;
  try {
    await db.query("UPDATE book_details SET rating = $1 WHERE id = $2", [
      data.rating,
      data.id,
    ]);
    await db.query(
      "UPDATE book_review SET short_summary=$1,long_summary=$2 WHERE review_id = $3",
      [data.shortSummary, data.longSummary, data.id]
    );
    res.redirect(`/books/${data.id}`);
  } catch (error) {
    console.log(error);
  }
});
app.get("/delete/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const bookReview = await fullReview(id);
    res.render("deleting.ejs", { book: bookReview });
  } catch (err) {
    console.log(err);
  }
});
app.post("/delete/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await db.query("DELETE FROM book_details WHERE id = $1", [id]);
    res.redirect("/admin");
  } catch (error) {
    console.log(error);
  }
});

app.get("/signin", (req, res) => {
  res.render("signin.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/signin", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      username,
    ]);
    if (result.rows.length == 0) {
      bcrypt.hash(password, 10, async (err, hash) => {
        if (err) {
          console.log(err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [username, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            if (err) return res.redirect("/login");
            res.redirect("/admin");
          });
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/admin",
    failureRedirect: "/login",
  })
);

passport.use(
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const hash = user.password;
        await bcrypt.compare(password, hash, (err, value) => {
          if (err) {
            console.log(err);
            return cb(err);
          } else {
            if (value) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("user not found");
      }
    } catch (error) {
      console.log(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`server running on port no: ${port}`);
});
