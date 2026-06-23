import mongoose from "mongoose";
import Product from "../models/product.js";
import User from "../models/user.js";


const orderStatus = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const paymentStatus = ["pending", "paid", "failed", "refunded"];
const paymentMethod = ["cod", "online"];

const OrderSchema = new mongoose.Schema({
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
          ref: "Variant",
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
  totalAmount : {type : Number},
  // deliveryAddress : {type : String},
  orderStatus : {type : String, enum : orderStatus, default : "pending"},
  paymentStatus : {type : String, enum : paymentStatus, default : "pending"},
  paymentMethod : {type : String, enum : paymentMethod, default : "cod"},
  razorpayOrderId : {type : String},
  razorpayPaymentId : {type : String},

},{ timestamps: true });

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
export default Order;
