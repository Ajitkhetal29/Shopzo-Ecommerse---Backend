import bcrypt from "bcryptjs";
import User from "../models/user.js";
import Vendor from "../models/vendor.js";
import Department from "../models/department.js";
import Role from "../models/role.js";
import { generateToken } from "../utils/jwt.js";

/** Get or create default buyer department and role */
async function getOrCreateBuyerDeptAndRole() {
  let buyerDept = await Department.findOne({ name: { $regex: /^buyer$/i } });
  if (!buyerDept) {
    buyerDept = await Department.create({ name: "Buyer", description: "Buyer department for customer users" });
  }
  let buyerRole = await Role.findOne({ name: { $regex: /^buyer$/i } });
  if (!buyerRole) {
    buyerRole = await Role.create({ name: "Buyer", description: "Buyer role for customer users", level: 1 });
  }
  return { buyerDepartment: buyerDept, buyerRole };
}



const register = async (req, res) => {

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

// Default: buyer dept + buyer role (create if missing)
    const { buyerDepartment, buyerRole } = await getOrCreateBuyerDeptAndRole();

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      department: buyerDepartment._id,
      role: buyerRole._id,
    });


    const populatedUser = await User.findById(user._id)
      .select("-password")
      .populate("department", "name")
      .populate("role", "name");


    const token = generateToken({ id: user._id, role: user.role, name: user.name });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: populatedUser
    });

  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`Login attempt failed: User not found for email: ${email}`);
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if user has department and role assigned
    if (!user.department || !user.role) {
      console.log(`Login attempt failed: User ${user._id} missing department or role`);
      return res.status(400).json({
        success: false,
        message: "User account is incomplete. Please contact administrator.",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Please contact administrator.",
      });
    }

    // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    const isPasswordHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$');
    
    let isMatch = false;
    if (isPasswordHashed) {
      // Password is hashed, use bcrypt compare
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Password is plain text (legacy), compare directly
      isMatch = password === user.password;
      
      // If match and password is plain text, hash it for future use
      if (isMatch) {
        console.log(`Warning: User ${user._id} has plain text password. Hashing it now...`);
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.findByIdAndUpdate(user._id, { password: hashedPassword });
        console.log(`Password hashed successfully for user ${user._id}`);
      }
    }
    
    if (!isMatch) {
      console.log(`Login attempt failed: Incorrect password for email: ${email}`);
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Populate department and role - handle case where they might not exist
    let populatedUser;
    try {
      populatedUser = await User.findById(user._id)
        .select("-password")
        .populate("department", "name code")
        .populate("role", "name code");
      
      // If populate failed (department/role don't exist), return error
      if (!populatedUser.department || !populatedUser.role) {
        return res.status(400).json({
          success: false,
          message: "User account is incomplete. Please contact administrator.",
        });
      }
    } catch (populateError) {
      console.error("Populate error:", populateError);
      return res.status(500).json({
        success: false,
        message: "Error loading user data. Please contact administrator.",
      });
    }

    const token = generateToken({ id: user._id, role: user.role , name: user.name});

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: populatedUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const buyerRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // Default: buyer dept + buyer role (create if missing)
    const { buyerDepartment, buyerRole } = await getOrCreateBuyerDeptAndRole();

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      department: buyerDepartment._id,
      role: buyerRole._id,
    });

    const populatedUser = await User.findById(user._id)
      .select("-password")
      .populate("department", "name")
      .populate("role", "name");

    const token = generateToken({ id: user._id, role: user.role, name: user.name });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "Buyer registered successfully",
      user: populatedUser
    });
  } catch (error) {
    console.error("Buyer register error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const buyerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Default: buyer dept (create if missing)
    const { buyerDepartment } = await getOrCreateBuyerDeptAndRole();

    // Find user with buyer department
    const user = await User.findOne({ 
      email,
      department: buyerDepartment._id 
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Please contact administrator.",
      });
    }

    // Check if password is hashed
    const isPasswordHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$');
    
    let isMatch = false;
    if (isPasswordHashed) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = password === user.password;
      if (isMatch) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.findByIdAndUpdate(user._id, { password: hashedPassword });
      }
    }
    
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const populatedUser = await User.findById(user._id)
      .select("-password")
      .populate("department", "name")
      .populate("role", "name");

    if (!populatedUser.department || !populatedUser.role) {
      return res.status(400).json({
        success: false,
        message: "User account is incomplete. Please contact administrator.",
      });
    }

    const token = generateToken({ id: user._id, role: user.role, name: user.name });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: populatedUser,
    });
  } catch (error) {
    console.error("Buyer login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export { register, login, logout, buyerRegister, buyerLogin };