import bcrypt from "bcryptjs";
import User from "../models/user.js";
import Department from "../models/department.js";
import Role from "../models/role.js";

export const createUser = async (req, res) => {
  try {
    const { name, email, password, department, role } = req.body;

    if (!name || !email || !password || !department || !role) {
      return res.status(400).json({
        success: false,
        message: "All required fields are missing",
      });
    }

    // Validate department and role exist
    const dept = await Department.findById(department);
    const roleDoc = await Role.findById(role);

    if (!dept) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive department",
      });
    }

    if (!roleDoc) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive role",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      department,
      role,
    });

    const populatedUser = await User.findById(user._id)
      .populate("department", "name")
      .populate("role", "name");

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: populatedUser,
    });
  } catch (error) {
    console.error("Create user error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { department, role, limit, page } = req.query;
    console.log("Get users query:", req.query);
    const filter = {};

    // Always exclude buyer department users (ops panel shouldn't see buyers)
    const buyerDepartment = await Department.findOne({
      name: { $regex: /^Buyer$/i },
    });

    if (!buyerDepartment) {
      return res.status(500).json({
        success: false,
        message: "Buyer department not found in the system",
      });
    }

    if (department) {
      filter.department = department;
    }

    if (!department) {
      filter.department = { $ne: buyerDepartment._id };
    }

    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .populate("department", "name")
      .populate("role", "name level")
      .sort({ createdAt: -1 })
      .skip(((parseInt(page) || 1) - 1) * (parseInt(limit) || 10))
      .limit(parseInt(limit) || 10);

    return res.status(200).json({
      success: true,
      users,
      total: await User.countDocuments(filter),
    });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("getUserById called with id:", id);
    

    const user = await User.findById(id)
      .populate("department", "name code")
      .populate("role", "name code");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, role, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent updating to buyer department
    const buyerDepartment = await Department.findOne({
      name: { $regex: /^buyer$/i },
    });
    if (
      buyerDepartment &&
      department &&
      department.toString() === buyerDepartment._id.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot assign user to buyer department",
      });
    }

    if (name) user.name = name;
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }
      user.email = email;
    }

    // Update department first if provided
    if (department) {
      const dept = await Department.findById(department);
      if (!dept || !dept.isActive) {
        return res.status(400).json({
          success: false,
          message: "Invalid or inactive department",
        });
      }
      user.department = department;
    }

    // Update role - check against current department (which may have been updated above)
    if (role) {
      const roleDoc = await Role.findById(role);
      if (!roleDoc || !roleDoc.isActive) {
        return res.status(400).json({
          success: false,
          message: "Invalid or inactive role",
        });
      }
      // Check if role belongs to user's department (use updated department if changed)
      const currentDepartment = department ? department : user.department;
      if (roleDoc.department.toString() !== currentDepartment.toString()) {
        return res.status(400).json({
          success: false,
          message: "Role does not belong to user's department",
        });
      }
      user.role = role;
    }

    if (typeof isActive === "boolean") {
      user.isActive = isActive;
    }

    await user.save();

    const populatedUser = await User.findById(user._id)
      .populate("department", "name code")
      .populate("role", "name code");

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: populatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Soft delete
    user.isActive = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const allUserWihRoleAndDepartment = async (req, res) => {
  console.log("allUserWihRoleAndDepartment called");

  const { department } = req.query;

  let filter = {};

  if (department) {
    filter.department = department;
  }



  try {
    const users = await User.find(filter)
      .populate("department", "name")
      .populate("role", "name level");

      console.log('users',users);
      

    return res.status(200).json({
      success: true,
      users,
    });

  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
