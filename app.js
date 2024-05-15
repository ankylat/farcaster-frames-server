require("dotenv").config();
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");

const farhackRoute = require("./routes/farhack");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
const port = 3001;

app.use("/farhack", farhackRoute);

// ********* ROUTES ***********

app.get("/", (req, res) => {
  res.send("hello to the farcaster frames server");
});

app.post("/cast-anon", (req, res) => {
  // ONLY ACCESIBLE FROM THE OFFICIAL FRONTEND OR FROM THE FRAME
  // RATE LIMITED, WITH SOME SORT OF MECHANISM TO PREVENT USERS FROM SPAMMING THE API
  // 
  res.send("hello to the farcaster frames server");
});

// ********* FINISHED ***********

app.listen(port, () => {
  console.log(`anky server is listening on port ${port}`);
});
