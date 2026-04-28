import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import {
  createUserReporting,
  getUserReportings,
  getUserReportingById,
  updateUserReporting,
  deleteUserReporting,
  checkUserReporting,
} from "../controllers/userReporting.js";

const userReportingRouter = express.Router();

userReportingRouter.post("/create", adminAuth, createUserReporting);
userReportingRouter.get("/list", adminAuth, getUserReportings);
userReportingRouter.get("/check", adminAuth, checkUserReporting);
userReportingRouter.get("/:id", adminAuth, getUserReportingById);
userReportingRouter.put("/update/:id", adminAuth, updateUserReporting);
userReportingRouter.delete("/delete/:id", adminAuth, deleteUserReporting);

export default userReportingRouter;
