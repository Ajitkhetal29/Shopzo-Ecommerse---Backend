import express from "express";
import { createCategory, getCategories, deleteCategory, updateCategory } from "../controllers/category.js";

const categoryRouter = express.Router();

categoryRouter.post("/create", createCategory);
categoryRouter.get("/list", getCategories);
categoryRouter.delete("/delete/:id", deleteCategory);
categoryRouter.put("/update/:id", updateCategory);
export default categoryRouter;