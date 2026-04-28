import "./config/env.js";

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error("❌ ERROR: JWT_SECRET is not set in environment variables!");
  console.error("Please add JWT_SECRET to your env file");
  process.exit(1);
}

import express, { application } from "express";
import connectDB from "./config/db.js";
import cors from "cors";
import authRouter from "./routes/auth.js";
import cookieParser from "cookie-parser";
import warehouseRouter from "./routes/warehouse.js";
import userRouter from "./routes/user.js";
import vendorRouter from "./routes/vendor.js";
import departmentRouter from "./routes/department.js";
import roleRouter from "./routes/role.js";
import userReportingRouter from "./routes/userReporting.js";
import reverseGeocodeRouter from "./routes/reversegeocode.js";
import User from "./models/user.js";
import Vendor from "./models/vendor.js";
import categoryRouter from "./routes/category.js";
import subcategoryRouter from "./routes/subcategory.js";
import productRouter from "./routes/product.js";
import vendorProductRouter from "./routes/vendorProduct.js";
import dashboardRouter from "./routes/dashboard.js";
import inventoryRouter from "./routes/inventory.js";
import { authMiddleware, vendorAuthMiddleware } from "./middleware/auth.js";
import inventoryTransferRouter from "./routes/transferInventory.js";
import uploadRouter from "./routes/upload.js";
import helmet from "helmet";
const app = express();
const PORT = process.env.PORT || 8000;
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3002",
  "http://54.163.16.133:3000",
  "http://54.163.16.133:3001",
  "http://54.163.16.133:3002",
 "https://admin.shopzo.store",
    "https://vendor.shopzo.store"	
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/warehouse", warehouseRouter);
app.use("/api/user", userRouter);
// Must be before vendor router so /me isn't caught by /:id
app.get("/api/vendor/me", vendorAuthMiddleware, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.vendor.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }
    res.status(200).json({ success: true, message: "Vendor authenticated", vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
app.use("/api/vendor/product", vendorProductRouter);
app.use("/api/vendor", vendorRouter);
app.use("/api/department", departmentRouter);
app.use("/api/role", roleRouter);
app.use("/api/user-reporting", userReportingRouter);
app.use("/api/reversegeocode", reverseGeocodeRouter);
app.use("/api/category", categoryRouter);
app.use("/api/subcategory", subcategoryRouter);
app.use("/api/product", productRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/inventoryTransfer", inventoryTransferRouter)
app.use("/api/upload", uploadRouter);

// this route is for home page and set user

app.get("/api/me", authMiddleware, async (req, res) => {
  try {
    // User login
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("department", "name code")
      .populate("role", "name code");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, message: "User authenticated", user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.get("/", (req, res) => {
  res
    .status(200)
    .json({ success: true, message: "Welcome to Shapzo Backend " });
});

// db connection
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });




// createDepartment("Admin", "Admin Department");
// createRole("Super Admin", "699ffbf35de05a3e86120ffc");
// createUser("Super Admin", "superadmin@shopzo.com", "1234", "699ffbf35de05a3e86120ffc", "699ffdfffbee3a74c7309a99");
