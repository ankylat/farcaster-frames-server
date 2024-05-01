require("dotenv").config();
const cors = require("cors");
const express = require("express");
const prisma = require("./lib/prismaClient");
const bodyParser = require("body-parser");

const framesRoutes = require("./routes/farcaster-frames");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
const port = 3000;

app.use("/farcaster-frames", framesRoutes);

// ********* ROUTES ***********

app.get("/", (req, res) => {
  res.send("hello to the farcaster frames server");
});

// ********* FINISHED ***********

app.listen(port, () => {
  console.log(`anky server is listening on port ${port}`);
});
