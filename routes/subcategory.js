import express from "express";
import { createSubcategory, getSubcategories, deleteSubcategory, updateSubcategory } from "../controllers/subcategory.js";

const subcategoryRouter = express.Router();

subcategoryRouter.post("/create", createSubcategory);
subcategoryRouter.get("/list", getSubcategories);
subcategoryRouter.delete("/delete/:id", deleteSubcategory);
subcategoryRouter.put("/update/:id", updateSubcategory);

export default subcategoryRouter;
