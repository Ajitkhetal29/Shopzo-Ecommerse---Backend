import Department from "../models/department.js";
import product from "../models/product.js";
import User from "../models/user.js";
import Vendor from "../models/vendor.js";
import Warehouse from "../models/warehouse.js";
import Role from "../models/role.js";

const getDashboardStats = async (req, res) => {
  try {
    const totalProducts = await product.countDocuments();
    const totalVendors = await Vendor.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalDepartments = await Department.countDocuments();
    const totalRoles = await Role.countDocuments();
    const totalWarehouses = await Warehouse.countDocuments();

    res.json({
      success: true,
      message: "Dashboard Data fetched Successfully",
      stats: {
        totalProducts,
        totalVendors,
        totalUsers,
        totalDepartments,
        totalRoles,
        totalWarehouses,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

export { getDashboardStats };
