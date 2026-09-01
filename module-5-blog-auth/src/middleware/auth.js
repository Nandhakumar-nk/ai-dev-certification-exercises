const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.slice("Bearer ".length);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const blacklisted = await prisma.blacklistedToken.findUnique({
      where: { token },
    });

    if (blacklisted) {
      return res.status(401).json({ error: "Token has been revoked" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify token" });
  }

  req.user = { id: payload.id, email: payload.email };
  req.token = token;

  next();
}

module.exports = { requireAuth };
