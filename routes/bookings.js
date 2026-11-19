const express = require('express');
const { ObjectId } = require('mongodb');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const { verifyToken, verifyCustomer, verifyTechnician } = require('../middlewares/auth');

const router = express.Router();
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("fixmate_db");

// Customer: get their own bookings
router.get('/my', verifyToken, verifyCustomer, async (req, res) => {
  try {
    const email = req.decoded.email;

    const bookings = await db.collection('bookings').find({ customerEmail: email }).toArray();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Technician: get bookings assigned to them
router.get('/technician', verifyToken, verifyTechnician, async (req, res) => {
  try {
    const email = req.decoded.email;

    const bookings = await db.collection('bookings').find({ technicianEmail: email }).toArray();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Customer: create a repair request
router.post('/', verifyToken, verifyCustomer, async (req, res) => {
  try {
    const customerEmail = req.decoded.email;
    const { serviceId, technicianEmail } = req.body;

    if (!serviceId || !technicianEmail) {
      return res.status(400).json({ message: 'serviceId and technicianEmail are required' });
    }

    // prevent a customer from booking their own service / wrong role booking
    if (customerEmail === technicianEmail) {
      return res.status(400).json({ message: 'You cannot request your own service' });
    }

    // prevent duplicate active requests for the same service
    const existing = await db.collection('bookings').findOne({
      customerEmail,
      serviceId,
      status: { $in: ['requested', 'accepted', 'in-progress'] },
    });

    if (existing) {
      return res.status(400).json({
        message: 'You already have an active request for this service',
      });
    }

    const newBooking = {
      ...req.body,
      customerEmail,
      status: 'requested',
      paymentStatus: 'unpaid',
      createdAt: new Date(),
    };

    const result = await db.collection('bookings').insertOne(newBooking);
    res.status(201).json({ message: 'Booking created', insertedId: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Technician: update job status (accept/reject/start/complete)
router.patch('/:id/status', verifyToken, verifyTechnician, async (req, res) => {
  try {
    const { status, finalAmount } = req.body;
    const bookingId = req.params.id;
    const technicianEmail = req.decoded.email;

    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(bookingId) });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // only the technician who owns this job can update it
    if (booking.technicianEmail !== technicianEmail) {
      return res.status(403).json({ message: 'Forbidden: this is not your job' });
    }

    const allowedTransitions = {
      requested: ['accepted', 'rejected'],
      accepted: ['in-progress'],
      'in-progress': ['completed'],
    };

    if (!allowedTransitions[booking.status]?.includes(status)) {
      return res.status(400).json({
        message: `Invalid status transition from '${booking.status}' to '${status}'`,
      });
    }

    const updateData = { status };

    if (status === 'completed') {
      if (!finalAmount || Number(finalAmount) <= 0) {
        return res.status(400).json({ message: 'Final amount must be greater than 0' });
      }
      updateData.finalAmount = Number(finalAmount);
    }

    await db.collection('bookings').updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: updateData }
    );

    res.status(200).json({ message: 'Status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Customer: cancel their own booking while still "requested"
router.patch('/:id/cancel', verifyToken, verifyCustomer, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const customerEmail = req.decoded.email;

    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(bookingId) });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.customerEmail !== customerEmail) {
      return res.status(403).json({ message: 'Forbidden: this is not your booking' });
    }

    if (booking.status !== 'requested') {
      return res.status(400).json({ message: 'Only a requested booking can be cancelled' });
    }

    await db.collection('bookings').updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: { status: 'cancelled' } }
    );

    res.status(200).json({ message: 'Booking cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

module.exports = router;