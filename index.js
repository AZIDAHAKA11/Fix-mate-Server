const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("FixMate server is running");
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`FixMate server listening on port ${port}`);
});