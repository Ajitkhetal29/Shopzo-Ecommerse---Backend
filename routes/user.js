import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  allUserWihRoleAndDepartment
} from "../controllers/user.js";

const userRouter = express.Router();

userRouter.post("/create", adminAuth, createUser);
userRouter.get("/list", adminAuth, getUsers);
userRouter.get("/all", adminAuth, allUserWihRoleAndDepartment);
userRouter.get("/:id", adminAuth, getUserById);
userRouter.put("/update/:id", adminAuth, updateUser);
userRouter.delete("/delete/:id", adminAuth, deleteUser);

export default userRouter;
