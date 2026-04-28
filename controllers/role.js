import Role from "../models/role.js";
import Department from "../models/department.js";

export const createRole = async (req, res) => {
  try {
    const { name, description, level } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Role name is required",
      });
    }

    if(!level || level < 1) {
      return res.status(400).json({
        success: false,
        message: "Role level is required and should be greater than 0",
      });
    }

    const role = await Role.create({
      name,
      description,
      level,
    });

    const populatedRole = await Role.findById(role._id).populate(
      "name",
      "description",
      "level"
    );

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      role: populatedRole,
    });
  } catch (error) {
    console.error("Create role error:", error);
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

export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find({})
      .populate("name")
      .populate("level")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      roles,
    });
  } catch (error) {
    console.error("Get roles error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    await Role.findByIdAndDelete(id);

    // Soft delete

    return res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("Delete role error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
