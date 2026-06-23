import express from "express";
import { createOrder, verifyPayment } from "../controllers/order.js";

const orderRouter = express.Router();

orderRouter.post("/", createOrder);
orderRouter.post("/verify", verifyPayment);

export default orderRouter;