const { jwtVerify, createRemoteJWKSet } = require("jose");

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.CLIENT_URL,
      audience: process.env.CLIENT_URL,
    });
    req.decoded = payload;
    next();
  } catch (err) {
    console.error("JWT verify failed:", err.message);
    return res.status(401).send({ message: "Unauthorized access" });
  }
}

function verifyCustomer(req, res, next) {
  if (req.decoded?.role !== "customer") {
    return res.status(403).send({ message: "Forbidden access" });
  }
  next();
}

function verifyTechnician(req, res, next) {
  if (req.decoded?.role !== "technician") {
    return res.status(403).send({ message: "Forbidden access" });
  }
  next();
}

function verifyAdmin(req, res, next) {
  if (req.decoded?.role !== "admin") {
    return res.status(403).send({ message: "Forbidden access" });
  }
  next();
}

module.exports = { verifyToken, verifyCustomer, verifyTechnician, verifyAdmin };