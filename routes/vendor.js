import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  vendorLogin,
  vendorLogout,
} from "../controllers/vendor.js";

const vendorRouter = express.Router();

vendorRouter.post("/create", adminAuth, createVendor);
vendorRouter.get("/list", adminAuth, getVendors);
vendorRouter.get("/:id", adminAuth, getVendorById);
vendorRouter.put("/update/:id", adminAuth, updateVendor);
vendorRouter.delete("/delete/:id", adminAuth, deleteVendor);
vendorRouter.post("/login", vendorLogin);
vendorRouter.post("/logout", vendorLogout);

export default vendorRouter;
