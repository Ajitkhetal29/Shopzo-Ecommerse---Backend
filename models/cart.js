import mongoose from "mongoose";
import Product from "../models/product.js";
import User from "../models/user.js";

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
            min: 1,
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);


const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);
export default Cart;