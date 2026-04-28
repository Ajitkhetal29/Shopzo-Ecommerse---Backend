import dotenv from "dotenv";
dotenv.config();
import connectDB from "../config/db.js";
import Department from "../models/department.js";
import Role from "../models/role.js";

const setupBuyer = async () => {
  try {
    await connectDB();

    // Create or find buyer department
    let buyerDepartment = await Department.findOne({ name: { $regex: /^buyer$/i } });
    
    if (!buyerDepartment) {
      buyerDepartment = await Department.create({
        name: "Buyer",
        description: "Buyer department for customer users",
      });
      console.log("✅ Buyer department created:", buyerDepartment._id);
    } else {
      console.log("✅ Buyer department already exists:", buyerDepartment._id);
    }

    // Create or find buyer role (roles are separate from departments)
    let buyerRole = await Role.findOne({ name: { $regex: /^buyer$/i } });

    if (!buyerRole) {
      buyerRole = await Role.create({
        name: "Buyer",
        description: "Buyer role for customer users",
        level: 1,
      });
      console.log("✅ Buyer role created:", buyerRole._id);
    } else {
      console.log("✅ Buyer role already exists:", buyerRole._id);
    }

    console.log("\n🎉 Buyer setup completed successfully!");
    console.log("Department ID:", buyerDepartment._id);
    console.log("Role ID:", buyerRole._id);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up buyer:", error);
    process.exit(1);
  }
};

setupBuyer();
