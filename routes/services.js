const express = require('express');
const { ObjectId } = require('mongodb');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const router = express.Router();
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("fixmate_db");

// Get all services (public route - also used by technician to filter by email)
router.get('/', async (req, res) => {
  try {
    const { search, category, mode, sort, technicianEmail } = req.query;
    let query = {};

    if (technicianEmail) {
      query.technicianEmail = technicianEmail;
    } else {
      query = { approvalStatus: 'approved', isAvailable: true };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (mode) query.serviceMode = mode;

    let sortOption = { createdAt: -1 };
    if (sort === 'price-low') sortOption = { basePrice: 1 };
    if (sort === 'price-high') sortOption = { basePrice: -1 };

    const services = await db.collection('services').find(query).sort(sortOption).toArray();
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Delete a service
router.delete('/:id', async (req, res) => {
  try {
    await db.collection('services').deleteOne({ _id: new ObjectId(req.params.id) });
    res.status(200).json({ message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Update a service (for toggling availability)
router.patch('/:id', async (req, res) => {
  try {
    await db.collection('services').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    res.status(200).json({ message: 'Service updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Add a new service
router.post('/', async (req, res) => {
  try {
    const newService = {
      ...req.body,
      createdAt: new Date()
    };
    const result = await db.collection('services').insertOne(newService);
    res.status(201).json({ message: 'Service added successfully', insertedId: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

module.exports = router;// update
