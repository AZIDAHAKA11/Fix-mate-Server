const jwt = require('jsonwebtoken');
require('dotenv').config();

// 1. Verify Token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // BetterAuth uses its own secret for JWT
    const decoded = jwt.verify(token, process.env.BETTER_AUTH_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

// 2. Role-Based Middlewares
const verifyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Access denied' });
    }
    next();
  };
};

const verifyCustomer = verifyRole(['customer']);
const verifyTechnician = verifyRole(['technician']);
const verifyAdmin = verifyRole(['admin']);

module.exports = {
  verifyToken,
  verifyCustomer,
  verifyTechnician,
  verifyAdmin
};// update
