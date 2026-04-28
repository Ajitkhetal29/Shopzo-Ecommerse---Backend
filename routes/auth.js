import express from "express";
import { register, login, logout, buyerRegister, buyerLogin } from "../controllers/auth.js";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.post("/buyer/register", buyerRegister);
authRouter.post("/buyer/login", buyerLogin);

export default authRouter;