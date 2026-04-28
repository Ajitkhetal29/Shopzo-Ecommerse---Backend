import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "../controllers/department.js";

const departmentRouter = express.Router();

departmentRouter.post("/create", adminAuth, createDepartment);
departmentRouter.get("/list", adminAuth, getDepartments);
departmentRouter.get("/:id", adminAuth, getDepartmentById);
departmentRouter.put("/update/:id", adminAuth, updateDepartment);
departmentRouter.delete("/delete/:id", adminAuth, deleteDepartment);

export default departmentRouter;
