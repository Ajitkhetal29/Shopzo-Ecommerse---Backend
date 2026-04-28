import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import { warehouseAuthMiddleware } from "../middleware/auth.js";
import {
  createWarehouse,
  getWarehouses,
  updateWarehouse,
  deleteWarehouse,
  addWarehouseMember,
  removeWarehouseMember,
  warehouseLogin,
  warehouseLogout,
  warehouseMe,
} from "../controllers/warehouse.js";

const warehouseRouter = express.Router();

warehouseRouter.post("/create", adminAuth, createWarehouse);
warehouseRouter.get("/list", getWarehouses);
warehouseRouter.put("/update/:id", adminAuth, updateWarehouse);
warehouseRouter.delete("/delete/:id", adminAuth, deleteWarehouse);
warehouseRouter.post("/:id/members", adminAuth, addWarehouseMember);
warehouseRouter.delete("/:id/members/:memberId", adminAuth, removeWarehouseMember);
warehouseRouter.post("/login", warehouseLogin);
warehouseRouter.post("/logout", warehouseAuthMiddleware, warehouseLogout);
warehouseRouter.get("/me", warehouseAuthMiddleware, warehouseMe);

export default warehouseRouter;
