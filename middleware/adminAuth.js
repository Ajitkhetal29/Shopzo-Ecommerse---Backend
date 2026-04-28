import { verifyToken } from "../utils/jwt.js";
import User from "../models/user.js";
import Department from "../models/department.js";
import Role from "../models/role.js";

// Cache admin department and admin role IDs
let adminRoleId = null;

const getAdminIds = async () => {
  const admin = await Role.findOne({ name: "Admin" }).populate("name");

  if (!admin) {
    throw new Error("Admin role not found");
  }

  adminRoleId = admin._id;
  

  return adminRoleId;

};

const adminAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }


    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const adminRoleId = await getAdminIds();

    if (adminRoleId.toString() !== decoded.role.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden: Admins only" });
    }

    next();
  } catch (error) {
    console.error("Admin auth error:", error.message || error);
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};

export default adminAuth;
