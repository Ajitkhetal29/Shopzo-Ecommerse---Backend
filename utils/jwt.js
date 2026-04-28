import jwt from "jsonwebtoken";
import "../config/env.js";

// Validate JWT_SECRET on module load
if (!process.env.JWT_SECRET) {
  console.error("⚠️  JWT_SECRET is not set in environment variables!");
  console.error("Please set JWT_SECRET in your env file");
}

const generateToken = (payload) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
};

const verifyToken = (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Re-throw with more context
    if (error.name === "JsonWebTokenError") {
      if (error.message === "invalid signature") {
        throw new Error("Token signature invalid - JWT_SECRET may have changed or token was signed with different secret");
      }
      throw new Error(`JWT Error: ${error.message}`);
    }
    throw error;
  }
};



export { generateToken, verifyToken };
