import Warehouse from "../models/warehouse.js";
import User from "../models/user.js";
import Role from "../models/role.js";
import Department from "../models/department.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt.js";

export const createWarehouse = async (req, res) => {
  try {
    const { name, contactNumber, email, password, location, address, members } = req.body;

    if (
      !name ||
      !contactNumber ||
      !password ||
      !location?.lat ||
      !location?.lng ||
      !address?.formatted ||
      !address?.state ||
      !address?.city ||
      !address?.pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Required warehouse data missing",
      });
    }

    if (email) {
      const existingWarehouseByEmail = await Warehouse.findOne({
        email: email.toLowerCase(),
      }).select("_id");
      if (existingWarehouseByEmail) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const warehouse = await Warehouse.create({
      name,
      contactNumber,
      email: email?.toLowerCase() || undefined,
      password: hashedPassword,
      location: {
        lat: location.lat,
        lng: location.lng,
      },
      address: {
        formatted: address.formatted,
        state: address.state,
        city: address.city,
        pincode: address.pincode,
        landmark: address.landmark || undefined,
      },
      members: members || [],
      createdBy: req.user.id,
    });

    const populatedWarehouse = await Warehouse.findById(warehouse._id)
      .populate("members.user", "name email")
      .populate("members.role", "name code")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Warehouse created successfully",
      warehouse: populatedWarehouse,
    });
  } catch (error) {
    console.error("Create warehouse error:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }
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

export const getWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ isActive: true })
      .populate("members.user", "name email department role")
      .populate("members.role", "name code")
      .populate("createdBy", "name email")
      .populate({
        path: "members.user",
        populate: {
          path: "department role",
          select: "name code",
        },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      warehouses,
    });
  } catch (error) {
    console.error("Get warehouses error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contactNumber, email, password, location, address, isActive, members } = req.body;

    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    if (name) warehouse.name = name;
    if (contactNumber) warehouse.contactNumber = contactNumber;
    if (email !== undefined) {
      const normalizedEmail = email?.trim().toLowerCase();
      if (normalizedEmail) {
        const existingWarehouseByEmail = await Warehouse.findOne({
          email: normalizedEmail,
          _id: { $ne: id },
        }).select("_id");
        if (existingWarehouseByEmail) {
          return res.status(409).json({
            success: false,
            message: "Email already exists",
          });
        }
        warehouse.email = normalizedEmail;
      } else {
        warehouse.email = undefined;
      }
    }
    if (password) {
      warehouse.password = await bcrypt.hash(password, 10);
    }

    // Validate and update location
    if (location) {
      if (location.lat === undefined || location.lng === undefined) {
        return res.status(400).json({
          success: false,
          message: "Location must include both lat and lng",
        });
      }
      warehouse.location = {
        lat: location.lat,
        lng: location.lng,
      };
    }

    // Validate and update address
    if (address) {
      if (address.formatted && address.state && address.city && address.pincode) {
        warehouse.address = {
          formatted: address.formatted,
          state: address.state,
          city: address.city,
          pincode: address.pincode,
          landmark: address.landmark || warehouse.address?.landmark || undefined,
        };
      } else {
        // Partial update - merge with existing
        warehouse.address = {
          ...warehouse.address,
          ...address,
        };
      }
    }

    if (typeof isActive === "boolean") {
      warehouse.isActive = isActive;
    }

    // Validate and update members
    if (members !== undefined) {
      if (!Array.isArray(members)) {
        return res.status(400).json({
          success: false,
          message: "Members must be an array",
        });
      }

      // Validate all members
      const buyerDepartment = await Department.findOne({ name: { $regex: /^buyer$/i } });
      
      for (const member of members) {
        if (!member.user || !member.role) {
          return res.status(400).json({
            success: false,
            message: "Each member must have user and role",
          });
        }

        // Validate user exists and is not from buyer department
        const user = await User.findById(member.user);
        if (!user || !user.isActive) {
          return res.status(400).json({
            success: false,
            message: `User ${member.user} not found or inactive`,
          });
        }

        if (buyerDepartment && user.department.toString() === buyerDepartment._id.toString()) {
          return res.status(400).json({
            success: false,
            message: "Cannot add buyer department users to warehouse",
          });
        }

        // Validate role exists and is active
        const role = await Role.findById(member.role);
        if (!role || !role.isActive) {
          return res.status(400).json({
            success: false,
            message: `Role ${member.role} not found or inactive`,
          });
        }

        // Validate role belongs to user's department
        if (role.department.toString() !== user.department.toString()) {
          return res.status(400).json({
            success: false,
            message: `Role does not belong to user's department`,
          });
        }
      }

      warehouse.members = members;
    }

    await warehouse.save();

    const populatedWarehouse = await Warehouse.findById(warehouse._id)
      .populate("members.user", "name email")
      .populate("members.role", "name code")
      .populate("createdBy", "name email")
      .populate({
        path: "members.user",
        populate: {
          path: "department role",
          select: "name code",
        },
      });

    return res.status(200).json({
      success: true,
      message: "Warehouse updated successfully",
      warehouse: populatedWarehouse,
    });
  } catch (error) {
    console.error("Update warehouse error:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }
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

export const deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    // Soft delete
    warehouse.isActive = false;
    await warehouse.save();

    return res.status(200).json({
      success: true,
      message: "Warehouse deleted successfully",
    });
  } catch (error) {
    console.error("Delete warehouse error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const addWarehouseMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Role ID are required",
      });
    }

    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    // Check if user already exists in members
    const existingMember = warehouse.members.find(
      (m) => m.user.toString() === userId
    );
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "User already exists in warehouse members",
      });
    }

    warehouse.members.push({
      user: userId,
      role: roleId,
    });

    await warehouse.save();

    const populatedWarehouse = await Warehouse.findById(warehouse._id)
      .populate("members.user", "name email")
      .populate("members.role", "name code");

    return res.status(200).json({
      success: true,
      message: "Member added successfully",
      warehouse: populatedWarehouse,
    });
  } catch (error) {
    console.error("Add warehouse member error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const removeWarehouseMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    warehouse.members = warehouse.members.filter(
      (m) => m._id.toString() !== memberId
    );

    await warehouse.save();

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove warehouse member error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const warehouseLogin = async (req, res) => {
  try {
    const { contactNumber, email, password } = req.body;

    if (!password || (!contactNumber && !email)) {
      return res.status(400).json({
        success: false,
        message: "Login identifier and password are required",
      });
    }

    const loginFilter = { isActive: true };
    if (email) {
      loginFilter.email = email.toLowerCase();
    } else {
      loginFilter.contactNumber = contactNumber;
    }

    const warehouse = await Warehouse.findOne(loginFilter).select("+password");

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    const isPasswordHashed =
      warehouse.password.startsWith("$2a$") ||
      warehouse.password.startsWith("$2b$") ||
      warehouse.password.startsWith("$2y$");

    let isPasswordValid = false;
    if (isPasswordHashed) {
      isPasswordValid = await bcrypt.compare(password, warehouse.password);
    } else {
      isPasswordValid = password === warehouse.password;
      if (isPasswordValid) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await Warehouse.findByIdAndUpdate(warehouse._id, { password: hashedPassword });
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken({
      id: warehouse._id,
      name: warehouse.name,
      contactNumber: warehouse.contactNumber,
      warehouseId: warehouse._id,
      panel: "warehouse",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Warehouse login successful",
      token,
      warehouse: {
        _id: warehouse._id,
        name: warehouse.name,
        email: warehouse.email || "",
        contactNumber: warehouse.contactNumber,
        address: warehouse.address,
        isActive: warehouse.isActive,
      },
    });
  } catch (error) {
    console.error("Warehouse login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const warehouseLogout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return res.status(200).json({
      success: true,
      message: "Warehouse logout successful",
    });
  } catch (error) {
    console.error("Warehouse logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const warehouseMe = async (req, res) => {
  try {
    const warehouseId = req.warehouseUser?.warehouseId || req.warehouseUser?.id;
    if (!warehouseId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const warehouse = await Warehouse.findOne({
      _id: warehouseId,
      isActive: true,
    }).select("_id name email contactNumber address isActive");

    if (!warehouse) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Warehouse authenticated",
      warehouse: {
        _id: warehouse._id,
        name: warehouse.name,
        email: warehouse.email || "",
        contactNumber: warehouse.contactNumber,
        address: warehouse.address,
        isActive: warehouse.isActive,
      },
    });
  } catch (error) {
    console.error("Warehouse me error:", error);
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};

