import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "bookreview",
  password: 1328,
  port: 5432,
});
db.connect();

const book = [
  {
    id: 12,
    title: "The Particular Sadness of Lemon Cake",
    description: `The novel follows Rose Edelstein, a young girl who, on her ninth
                birthday, discovers she has a strange gift — or curse. When she
                bites into her mothers homemade lemon-chocolate cake, she
                tastes not just the ingredients but also her mothers feelings
                of sadness and emptiness. As Rose grows older, her ability
                deepens; she can taste emotions and secrets in any food prepared
                by others. This talent exposes the hidden emotional truths of
                her family — a mother struggling with loneliness, a brother
                withdrawing from the world, and a father who seems emotionally
                absent. Through magical realism, the novel explores family
                dynamics, emotional isolation, and the burden of empathy, all
                while Rose searches for connection and understanding.`,
    author: "Aimee Bender",
    imgurl: "https://covers.openlibrary.org/b/isbn/9780385533225-M.jpg",
    rating: 3,
  },
];
// home page
app.get("/", (req, res) => {
  res.render("index.ejs", { book: book });
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

app.post("/books", async (req, res) => {
  const bookName = req.body.bookName;
  const imageURL = req.body.imageURL;
  const authorName = req.body.authorName;
  const shortSummary = req.body.shortSummary;
  const rating = req.body.rating;
  const longSummary = req.body.longSummary;
  // try {
  //   await db.query(
  //     "INSERT INTO book_details (book_title,author_name,rating) VALUES ($1,$2,$3)",
  //     [bookName, authorName, rating]
  //   );
  //   await db.query(
  //     "INSERT INTO book_review (book_image_url,short_summary,long_summary) VALUES ($1,$2,$3)",
  //     [imageURL, shortSummary, longSummary]
  //   );
  // } catch (err) {
  //   console.log(err);
  // }

  console.log(
    bookName,
    imageURL,
    authorName,
    shortSummary,
    rating,
    longSummary
  );
});

app.listen(port, () => {
  console.log(`server running on port no: ${port}`);
});
