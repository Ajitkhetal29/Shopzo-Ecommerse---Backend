import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Department from "../models/department.js";
import Role from "../models/role.js";
import User from "../models/user.js";
import dotenv from "dotenv";

dotenv.config({ path: '../.env' });

const MONGODB_URI = process.env.MONGO_URI;

const setupAdmin = async () => {
  try {
    if (!MONGODB_URI) {
      console.error("❌ ERROR: MONGO_URI is not set in environment variables!");
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Step 1: Delete all existing departments
    const deletedDepts = await Department.deleteMany({});
    console.log(`Deleted ${deletedDepts.deletedCount} departments`);

    // Step 2: Delete all existing roles
    const deletedRoles = await Role.deleteMany({});
    console.log(`Deleted ${deletedRoles.deletedCount} roles`);

    // Step 3: Create admin department
    const adminDepartment = await Department.create({
      name: "admin",
      description: "Administration department",
    });
    console.log(`Created department: ${adminDepartment.name} (ID: ${adminDepartment._id})`);

    // Step 4: Create admin role for admin department
    const adminRole = await Role.create({
      name: "admin",
      description: "Admin role with full permissions",});
    console.log(`Created role: ${adminRole.name} (ID: ${adminRole._id})`);

    // Step 5: Check if user already exists, delete if exists
    const existingUser = await User.findOne({ email: "admin@shopzo.com" });
    if (existingUser) {
      await User.findByIdAndDelete(existingUser._id);
      console.log("Deleted existing admin user");
    }

    // Step 6: Create admin user
    const hashedPassword = await bcrypt.hash("1234", 10);
    const adminUser = await User.create({
      name: "Admin",
      email: "admin@shopzo.com",
      password: hashedPassword,
      department: adminDepartment._id,
      role: adminRole._id,
    });
    console.log(`Created user: ${adminUser.email} (ID: ${adminUser._id})`);

    console.log("\n✅ Setup completed successfully!");
    console.log("\nAdmin credentials:");
    console.log("Email: admin@shopzo.com");
    console.log("Password: 1234");

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Setup error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

setupAdmin();
