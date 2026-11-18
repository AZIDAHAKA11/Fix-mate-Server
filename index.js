const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Import Routes
const servicesRouter = require('./routes/services');
const bookingsRouter = require('./routes/bookings');
const paymentsRouter = require('./routes/payments');
const adminRouter = require('./routes/admin'); // Ensure this file exists

// Mount Routes (Must be before app.listen)
app.use('/api/services', servicesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter); 

// Test Route
app.get('/', (req, res) => {
  res.send('FixMate Server is running perfectly!');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});// update
// update
