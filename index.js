require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { verifyToken, verifyCustomer } = require("./middlewares/auth");

const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB successfully!");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
}
run();

app.get("/", (req, res) => {
  res.send("FixMate server is running");
});

app.get("/api/test-protected", verifyToken, verifyCustomer, (req, res) => {
  res.send({ message: "You are a verified customer!", user: req.decoded });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`FixMate server listening on port ${port}`);
});