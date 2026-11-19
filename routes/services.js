
const express = require('express');
const { ObjectId, MongoClient } = require('mongodb');
require('dotenv').config();

const {
  verifyToken,
  verifyTechnician,
} = require('../middlewares/auth');

const router = express.Router();

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("fixmate_db");
const servicesCollection = db.collection("services");

// ==========================================
// GET ALL SERVICES
// Public: approved & available services
// Private: technician's own services
// ==========================================

router.get(
  '/',
  (req, res, next) => {
    if (req.query.technicianEmail) {
      return verifyToken(req, res, (error) => {
        if (error) return next(error);
        return verifyTechnician(req, res, next);
      });
    }

    next();
  },
  async (req, res) => {
    try {
      const { search, category, mode, sort, technicianEmail } = req.query;

      let query = {};

      // Technician's own services
      if (technicianEmail) {
        if (req.decoded.email !== technicianEmail) {
          return res.status(403).json({
            message: "You can only view your own services",
          });
        }

        query.technicianEmail = req.decoded.email;
      } else {
        // Public services
        query = {
          approvalStatus: "approved",
          isAvailable: true,
        };
      }

      // Search
      if (search) {
        query.$and = [
          {
            $or: [
              { title: { $regex: search, $options: "i" } },
              { category: { $regex: search, $options: "i" } },
            ],
          },
        ];
      }

      // Category filter
      if (category) {
        query.category = category;
      }

      // Service mode filter
      if (mode) {
        query.serviceMode = mode;
      }

      // Sorting
      let sortOption = { createdAt: -1 };

      if (sort === "price-low") {
        sortOption = { basePrice: 1 };
      }

      if (sort === "price-high") {
        sortOption = { basePrice: -1 };
      }

      const services = await servicesCollection
        .find(query)
        .sort(sortOption)
        .toArray();

      res.status(200).json(services);

    } catch (error) {
      console.error("Get services error:", error);

      res.status(500).json({
        message: "Server Error",
        error: error.message,
      });
    }
  }
);

// ==========================================
// DELETE SERVICE
// Only the owner technician can delete
// ==========================================

router.delete('/:id', verifyToken, verifyTechnician, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid service ID",
      });
    }

    const service = await servicesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    // Ownership check
    if (service.technicianEmail !== req.decoded.email) {
      return res.status(403).json({
        message: "You can only delete your own services",
      });
    }

    await servicesCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.status(200).json({
      message: "Service deleted successfully",
    });

  } catch (error) {
    console.error("Delete service error:", error);

    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE SERVICE
// Availability toggle does NOT reset approval
// Editing details resets approval
// ==========================================

router.patch('/:id', verifyToken, verifyTechnician, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid service ID",
      });
    }

    const service = await servicesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    // Ownership check
    if (service.technicianEmail !== req.decoded.email) {
      return res.status(403).json({
        message: "You can only update your own services",
      });
    }

    const body = req.body;

    // Availability toggle
    if (
      Object.keys(body).length === 1 &&
      typeof body.isAvailable === "boolean"
    ) {
      await servicesCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            isAvailable: body.isAvailable,
            updatedAt: new Date(),
          },
        }
      );

      return res.status(200).json({
        message: "Availability updated successfully",
      });
    }

    // Service details edit
    const allowedFields = [
      "title",
      "category",
      "basePrice",
      "description",
      "serviceMode",
      "serviceArea",
      "estimatedDuration",
      "image",
    ];

    const updatedData = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updatedData[field] = body[field];
      }
    }

    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update",
      });
    }

    // Validate price
    if (updatedData.basePrice !== undefined) {
      const price = Number(updatedData.basePrice);

      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({
          message: "Price must be greater than 0",
        });
      }

      updatedData.basePrice = price;
    }

    // Validate text fields
    if (
      updatedData.title !== undefined &&
      (typeof updatedData.title !== 'string' || !updatedData.title.trim())
    ) {
      return res.status(400).json({
        message: "Service title cannot be empty",
      });
    }

    if (
      updatedData.category !== undefined &&
      (typeof updatedData.category !== 'string' || !updatedData.category.trim())
    ) {
      return res.status(400).json({
        message: "Category cannot be empty",
      });
    }

    // Reset approval after editing
    updatedData.approvalStatus = "pending";
    updatedData.updatedAt = new Date();

    await servicesCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: updatedData,
      }
    );

    res.status(200).json({
      message: "Service updated successfully",
      approvalStatus: "pending",
    });

  } catch (error) {
    console.error("Update service error:", error);

    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
});

// ==========================================
// ADD NEW SERVICE
// Only authenticated technicians can add
// ==========================================

router.post('/', verifyToken, verifyTechnician, async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      basePrice,
      estimatedDuration,
      serviceMode,
      serviceArea,
      image,
    } = req.body;

    // Required field validation
    if (
      typeof title !== 'string' || !title.trim() ||
      typeof category !== 'string' || !category.trim() ||
      typeof description !== 'string' || !description.trim() ||
      typeof estimatedDuration !== 'string' || !estimatedDuration.trim() ||
      typeof serviceMode !== 'string' || !serviceMode.trim() ||
      typeof serviceArea !== 'string' || !serviceArea.trim() ||
      typeof image !== 'string' || !image.trim() ||
      basePrice === undefined ||
      basePrice === null ||
      basePrice === ''
    ) {
      return res.status(400).json({
        message: 'All service fields are required',
      });
    }

    // Price validation
    const price = Number(basePrice);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        message: 'Price must be greater than 0',
      });
    }

    // Create service using trusted server-side data
    const newService = {
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      basePrice: price,
      estimatedDuration: estimatedDuration.trim(),
      serviceMode: serviceMode.trim(),
      serviceArea: serviceArea.trim(),
      image: image.trim(),

      technicianEmail: req.decoded.email,
      technicianName:
        req.decoded.name || req.body.technicianName || 'Technician',

      approvalStatus: 'pending',
      isAvailable: true,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await servicesCollection.insertOne(newService);

    res.status(201).json({
      message: 'Service added successfully',
      insertedId: result.insertedId,
    });

  } catch (error) {
    console.error('Add service error:', error);

    res.status(500).json({
      message: 'Server Error',
      error: error.message,
    });
  }
});

module.exports = router;
