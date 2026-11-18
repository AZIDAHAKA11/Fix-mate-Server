const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const router = express.Router();
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("fixmate_db");

// 1. Get All Users
router.get('/users', async (req, res) => {
  try {
    const users = await db.collection('user').find().toArray();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Get All Services
router.get('/services', async (req, res) => {
  try {
    const services = await db.collection('services').find().toArray();
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Get All Bookings
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await db.collection('bookings').find().toArray();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;// update
