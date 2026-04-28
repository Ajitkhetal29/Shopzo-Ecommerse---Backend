import express from "express";
import {
  createInventory,
  getInventory,
  updateInventory,
  deleteInventory,
  getInventoryById,
} from "../controllers/inverntory.js";

const inventoryRouter = express.Router();

inventoryRouter.post("/create", createInventory);
inventoryRouter.get("/list", getInventory);
inventoryRouter.get("/:id", getInventoryById);
inventoryRouter.put("/update", updateInventory);
inventoryRouter.delete("/delete", deleteInventory);

export default inventoryRouter;
