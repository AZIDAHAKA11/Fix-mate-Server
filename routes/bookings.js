const express = require('express');
const { ObjectId } = require('mongodb');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const router = express.Router();
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("fixmate_db");

// 1. Get bookings for a specific customer
router.get('/my', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: "Email required" });

    const bookings = await db.collection('bookings')
      .find({ customerEmail: email })
      .toArray();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// 2. Get bookings for a specific technician
router.get('/technician', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: "Email required" });

    const bookings = await db.collection('bookings')
      .find({ technicianEmail: email })
      .toArray();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// 3. Create a new booking
router.post('/', async (req, res) => {
  try {
    const newBooking = {
      ...req.body,
      status: 'requested',
      paymentStatus: 'unpaid',
      createdAt: new Date()
    };
    const result = await db.collection('bookings').insertOne(newBooking);
    res.status(201).json({ message: 'Booking created', insertedId: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// 4. Update booking status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, finalAmount } = req.body;
    const updateData = { status };
    
    if (status === 'completed' && finalAmount) {
      updateData.finalAmount = finalAmount;
    }

    await db.collection('bookings').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    res.status(200).json({ message: 'Status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

module.exports = router;// update
// update
