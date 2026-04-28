import { getDashboardStats } from "../controllers/dashboard.js";
import express from "express";

const dashboardRouter = express.Router();

dashboardRouter.get("/stats", getDashboardStats);

export default dashboardRouter;


