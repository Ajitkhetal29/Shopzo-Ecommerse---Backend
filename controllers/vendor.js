import bcrypt from "bcryptjs";
import Vendor from "../models/vendor.js";
import { generateToken } from "../utils/jwt.js";

export const createVendor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      contactNumber,
      location,
      address,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !contactNumber ||
      !location?.lat ||
      !location?.lng ||
      !address?.formatted ||
      !address?.state ||
      !address?.city ||
      !address?.pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Required vendor data missing",
      });
    }

    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(409).json({
        success: false,
        message: "Vendor already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const vendor = await Vendor.create({
      name,
      email,
      password: hashedPassword,
      contactNumber,
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
    });

    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      vendor: vendorResponse,
    });
  } catch (error) {
    console.error("Create vendor error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getVendors = async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};

    if (isActive !== undefined) filter.isActive = isActive === "true";

    const vendors = await Vendor.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Vendors fetched successfully",
      vendors,
    });
  } catch (error) {
    console.error("Get vendors error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findById(id).select("-password");

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      success: true,
      vendor,
    });
  } catch (error) {
    console.error("Get vendor error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      contactNumber,
      location,
      address,
      isActive,
    } = req.body;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (name) vendor.name = name;
    if (contactNumber) vendor.contactNumber = contactNumber;

    if (email) {
      const existingVendor = await Vendor.findOne({ email, _id: { $ne: id } });
      if (existingVendor) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }
      vendor.email = email;
    }

    if (location?.lat !== undefined && location?.lng !== undefined) {
      vendor.location = location;
    }

    if (address) {
      vendor.address = {
        ...vendor.address,
        ...address,
      };
    }

    if (typeof isActive === "boolean") {
      vendor.isActive = isActive;
    }

    await vendor.save();

    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    return res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      vendor: vendorResponse,
    });
  } catch (error) {
    console.error("Update vendor error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Soft delete
    vendor.isActive = false;
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const vendorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }
    const isPasswordCorrect = await bcrypt.compare(password, vendor.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }
    const token = generateToken({ id: vendor._id, role: vendor.role, name: vendor.name });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });
    return res.status(200).json({
      success: true,
      message: "Vendor logged in successfully",
      token,
    });
  } catch (error) {
    console.error("Vendor login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const vendorLogout = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({
      success: true,
      message: "Vendor logged out successfully",
    });
  } catch (error) {
    console.error("Vendor logout error:", error);
    return res.status(500).json({
      success: false, 
      message: "Internal server error",
    });
  }
};
