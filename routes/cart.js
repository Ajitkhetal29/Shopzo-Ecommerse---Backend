import express from "express";
import {
  addToCart,
  getCart,
  updateQuantity,
  removeFromCart,
  clearCart,
} from "../controllers/cart.js";

const cartRouter = express.Router();

// Get cart items for a user
cartRouter.get("/:userId", getCart);

// Add product to cart
cartRouter.post("/add", addToCart);

// Update product quantity in cart
cartRouter.put("/update", updateQuantity);

// Remove product from cart
cartRouter.delete("/remove", removeFromCart);

// Clear entire cart
cartRouter.delete("/clear", clearCart);

export default cartRouter;
