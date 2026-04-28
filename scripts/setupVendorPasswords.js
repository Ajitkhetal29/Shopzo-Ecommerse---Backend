import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Vendor from "../models/vendor.js";

const MONGODB_URI = process.env.MONGO_URI;

const setupVendorPasswords = async () => {
  try {
    if (!MONGODB_URI) {
      console.error("❌ MONGO_URI missing");
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const hashedPassword = await bcrypt.hash("1234", 10);
    const result = await Vendor.updateMany({}, { $set: { password: hashedPassword } });

    console.log(`✅ Updated password to "1234" for ${result.modifiedCount} vendors`);
    console.log(`   Total vendors: ${result.matchedCount}`);

    await mongoose.disconnect();
    console.log("🔌 Disconnected");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

setupVendorPasswords();
