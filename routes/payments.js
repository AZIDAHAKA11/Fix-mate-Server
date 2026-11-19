const express = require('express');
const { ObjectId } = require('mongodb');
const { MongoClient } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config();

const router = express.Router();
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("fixmate_db");

// 1. Create Checkout Session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(bookingId) });
    
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    // Payment Gate Check (Challenge 3)
    if (booking.status !== 'completed' || booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Booking is not eligible for payment. It must be completed and unpaid.' });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: booking.serviceTitle,
            },
            unit_amount: Math.round(booking.finalAmount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`,
      metadata: {
        bookingId: booking._id.toString(),
        customerEmail: booking.customerEmail
      }
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Verify Payment
router.get('/verify', async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ message: 'Session ID required' });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      const { bookingId, customerEmail } = session.metadata;

      const existingPayment = await db.collection('payments').findOne({ stripeSessionId: session_id });
      
      if (!existingPayment) {
        const booking = await db.collection('bookings').findOne({ _id: new ObjectId(bookingId) });

        await db.collection('payments').insertOne({
          bookingId,
          serviceTitle: booking.serviceTitle,
          customerName: booking.customerName,
          customerEmail,
          technicianName: booking.technicianName,
          technicianEmail: booking.technicianEmail,
          amount: session.amount_total / 100,
          currency: session.currency,
          transactionId: session.payment_intent,
          stripeSessionId: session_id,
          paymentStatus: 'paid',
          paidAt: new Date()
        });

        await db.collection('bookings').updateOne(
          { _id: new ObjectId(bookingId) },
          { $set: { paymentStatus: 'paid' } }
        );
      }

      res.status(200).json({ message: 'Payment verified successfully', session });
    } else {
      res.status(400).json({ message: 'Payment not successful' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Get Payments for Customer
router.get('/my', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: "Email required" });

    const payments = await db.collection('payments')
      .find({ customerEmail: email })
      .sort({ paidAt: -1 })
      .toArray();

    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

module.exports = router;