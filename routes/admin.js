const express = require('express');
const { ObjectId, MongoClient } = require('mongodb');
require('dotenv').config();

const { verifyToken, verifyAdmin } = require('../middlewares/auth');

const router = express.Router();

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db('fixmate_db');

// Protect all admin routes
router.use(verifyToken, verifyAdmin);


router.get('/users', async (req, res) => {
  try {
    const users = await db.collection('user')
      .find()
      .toArray();

    res.status(200).json(users);

  } catch (error) {
    console.error('Get users error:', error);

    res.status(500).json({
      message: 'Failed to fetch users'
    });
  }
});



router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid user ID'
      });
    }

    // Validate role
    if (!['customer', 'technician'].includes(role)) {
      return res.status(400).json({
        message: 'Invalid role. Role must be customer or technician.'
      });
    }

    // Find target user
    const targetUser = await db.collection('user').findOne({
      _id: new ObjectId(id)
    });

    if (!targetUser) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Prevent changing own role
    if (targetUser.email === req.decoded.email) {
      return res.status(403).json({
        message: 'You cannot change your own role'
      });
    }

    // Update role
    const result = await db.collection('user').updateOne(
      {
        _id: new ObjectId(id)
      },
      {
        $set: {
          role: role
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        message: 'Role was not changed'
      });
    }

    res.status(200).json({
      message: 'User role updated successfully',
      role: role
    });

  } catch (error) {
    console.error('Update role error:', error);

    res.status(500).json({
      message: 'Failed to update user role'
    });
  }
});


router.get('/services', async (req, res) => {
  try {
    const services = await db.collection('services')
      .find()
      .toArray();

    res.status(200).json(services);

  } catch (error) {
    console.error('Get services error:', error);

    res.status(500).json({
      message: 'Failed to fetch services'
    });
  }
});



router.patch('/services/:id/approval', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid service ID'
      });
    }

    // Validate approval status
    if (!['approved', 'pending', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({
        message: 'Invalid approval status'
      });
    }

    const result = await db.collection('services').updateOne(
      {
        _id: new ObjectId(id)
      },
      {
        $set: {
          approvalStatus: approvalStatus
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: 'Service not found'
      });
    }

    res.status(200).json({
      message: 'Service status updated successfully'
    });

  } catch (error) {
    console.error('Service approval error:', error);

    res.status(500).json({
      message: 'Failed to update service status'
    });
  }
});



router.get('/bookings', async (req, res) => {
  try {
    const bookings = await db.collection('bookings')
      .find()
      .toArray();

    res.status(200).json(bookings);

  } catch (error) {
    console.error('Get bookings error:', error);

    res.status(500).json({
      message: 'Failed to fetch bookings'
    });
  }
});



router.get('/transactions', async (req, res) => {
  try {
    const payments = await db.collection('payments')
      .find()
      .sort({ paidAt: -1 })
      .toArray();

    res.status(200).json(payments);

  } catch (error) {
    console.error('Get transactions error:', error);

    res.status(500).json({
      message: 'Failed to fetch transactions'
    });
  }
});


module.exports = router;