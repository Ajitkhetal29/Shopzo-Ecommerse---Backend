import mongoose from "mongoose";
import Product from "../models/product.js";
import User from "../models/user.js";


const orderStatus = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const paymentStatus = ["pending", "paid", "failed", "refunded"];

const OrerSchema = new mongoose.Schema({
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
  totalPrice : {type : Number},
  DeliveryAddress : {type : String},
  status : {type : String, enum : orderStatus, default : "pending"},
  paymentStatus : {type : String, enum : paymentStatus, default : "pending"},


});

const Order = mongoose.models.Order || mongoose.model("Order", OrerSchema);
export default Order;
