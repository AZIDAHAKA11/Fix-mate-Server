const { jwtVerify, createRemoteJWKSet } = require("jose");
require("dotenv").config();

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.CLIENT_URL,
      audience: process.env.CLIENT_URL,
    });
    req.decoded = payload;
    next();
  } catch (error) {
    console.error("JWT verify failed:", error.message);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

const verifyRole = (roles) => {
  return (req, res, next) => {
    if (!req.decoded || !roles.includes(req.decoded.role)) {
      return res.status(403).json({ message: "Forbidden: Access denied" });
    }
    next();
  };
};

const verifyCustomer = verifyRole(["customer"]);
const verifyTechnician = verifyRole(["technician"]);
const verifyAdmin = verifyRole(["admin"]);

module.exports = {
  verifyToken,
  verifyCustomer,
  verifyTechnician,
  verifyAdmin,
};