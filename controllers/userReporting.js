import UserReporting from "../models/userReporting.js";
import User from "../models/user.js";
import Department from "../models/department.js";
import mongoose from "mongoose";

export const createUserReporting = async (req, res) => {
  try {
    const { userId, reportingToId, department } = req.body;
    console.log("req.body",req.body);

    if (!userId || !reportingToId || !department) {
      return res.status(400).json({
        success: false,
        message: "userId, department and reportingToId are required",
      });
    }

    // Validate users exist
    const userDoc = await User.findById(userId);
    console.log("userDoc",userDoc);
    const managerDoc = await User.findById(reportingToId);
    console.log("managerDoc",managerDoc);

    if (!userDoc) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive user",
      });
    }

    if (!managerDoc) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive manager",
      });
    }

    // Ensure user and manager are in the same department
    if (userDoc.department.toString() !== managerDoc.department.toString()) {
      return res.status(400).json({
        success: false,
        message: "User and manager must be in the same department",
      });
    }

    // Convert department to ObjectId for comparison
    const departmentId = typeof department === 'string' ? new mongoose.Types.ObjectId(department) : department;
    
    // Ensure requested department matches user's department
    if (userDoc.department.toString() !== departmentId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Department must match user's department",
      });
    }

    // Check if relationship already exists
    const existingReporting = await UserReporting.findOne({
      user: userId,
      reportingTo: reportingToId,
      department: departmentId,
    });

    if (existingReporting) {
      return res.status(400).json({
        success: false,
        message: "Reporting relationship already exists",
      });
    }

    const userReporting = await UserReporting.create({
      user: userId,
      reportingTo: reportingToId,
      department: departmentId,
    });

    const populated = await UserReporting.findById(userReporting._id)
      .populate("user", "name email")
      .populate("reportingTo", "name email")
      .populate("department", "name");

    return res.status(201).json({
      success: true,
      message: "Reporting relationship created successfully",
      userReporting: populated,
    });
  } catch (error) {
    console.error("Create user reporting error:", error);
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

export const getUserReportings = async (req, res) => {
  try {
    const { user, reportingTo, department, page, limit } = req.query;
    const filter = {};

    if (user) filter.user = user;
    if (reportingTo) filter.reportingTo = reportingTo;
    if (department) filter.department = department;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await UserReporting.countDocuments(filter);

    const userReportings = await UserReporting.find(filter)
      .populate("user", "name email department role")
      .populate("reportingTo", "name email department role")
      .populate("department", "name")
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      userReportings,
      total,
    });
  } catch (error) {
    console.error("Get user reportings error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getUserReportingById = async (req, res) => {
  try {
    const { id } = req.params;

    const userReporting = await UserReporting.findById(id)
      .populate("user", "name email department role")
      .populate("reportingTo", "name email department role")
      .populate("department", "name");

    if (!userReporting) {
      return res.status(404).json({
        success: false,
        message: "Reporting relationship not found",
      });
    }

    return res.status(200).json({
      success: true,
      userReporting,
    });
  } catch (error) {
    console.error("Get user reporting error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateUserReporting = async (req, res) => {
  try {
    const { id } = req.params;
    const { user, reportingTo, department } = req.body;

    const userReporting = await UserReporting.findById(id);
    if (!userReporting) {
      return res.status(404).json({
        success: false,
        message: "Reporting relationship not found",
      });
    }

    if (user) {
      const userDoc = await User.findById(user);
      if (!userDoc || !userDoc.isActive) {
        return res.status(400).json({
          success: false,
          message: "Invalid user",
        });
      }
      userReporting.user = user;
    }

    if (reportingTo) {
      const managerDoc = await User.findById(reportingTo);
      if (!managerDoc || !managerDoc.isActive) {
        return res.status(400).json({
          success: false,
          message: "Invalid manager",
        });
      }
      userReporting.reportingTo = reportingTo;
    }

    if (department) {
      const dept = await Department.findById(department);
      if (!dept || !dept.isActive) {
        return res.status(400).json({
          success: false,
          message: "Invalid department",
        });
      }
      userReporting.department = department;
    }

    await userReporting.save();

    const populated = await UserReporting.findById(userReporting._id)
      .populate("user", "name email")
      .populate("reportingTo", "name email")
      .populate("department", "name");

    return res.status(200).json({
      success: true,
      message: "Reporting relationship updated successfully",
      userReporting: populated,
    });
  } catch (error) {
    console.error("Update user reporting error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteUserReporting = async (req, res) => {
  try {
    const { id } = req.params;

    const userReporting = await UserReporting.findById(id);
    if (!userReporting) {
      return res.status(404).json({
        success: false,
        message: "Reporting relationship not found",
      });
    }

    // Hard delete
    await UserReporting.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Reporting relationship deleted successfully",
    });
  } catch (error) {
    console.error("Delete user reporting error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const checkUserReporting = async (req, res) => {
  try {
    const { userId, departmentId } = req.query;

    if (!userId || !departmentId) {
      return res.status(400).json({
        success: false,
        message: "userId and departmentId are required",
      });
    }

    const userReporting = await UserReporting.findOne({
      user: userId,
      department: departmentId,
    })
      .populate("user", "name email")
      .populate("reportingTo", "name email")
      .populate("department", "name");

    if (!userReporting) {
      return res.status(200).json({
        success: true,
        hasReporting: false,
        message: "User does not have a reporting manager",
      });
    }

    return res.status(200).json({
      success: true,
      hasReporting: true,
      userReporting,
    });
  } catch (error) {
    console.error("Check user reporting error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
