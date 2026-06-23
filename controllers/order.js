import crypto from "crypto";
import Razorpay from "razorpay";
import Order from "../models/order.js";

// GET IT FROM CONFIG
import razorpay from "../config/razor.js";

const createOrder = async (req, res) => {
  try {
    const { userId, items, totalAmount } = req.body;

    if (!userId || !Array.isArray(items) || items.length === 0 || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Missing order details",
      });
    }

    const orderDoc = await Order.create({
      user: userId,
      items,
      totalAmount,
      orderStatus: "pending",
      paymentMethod: "online",
      paymentStatus: "pending",
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: orderDoc._id.toString(),
    });

    orderDoc.razorpayOrderId = razorpayOrder.id;
    await orderDoc.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        orderId: orderDoc._id,
        razorpayOrder,
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Error creating order",
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification data",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${order.razorpayOrderId}|${paymentId}`)
      .digest("hex");

    if (generatedSignature !== signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    order.paymentStatus = "paid";
    order.orderStatus = "confirmed";
    order.razorpayPaymentId = paymentId;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying payment",
    });
  }
};

export { createOrder, verifyPayment };
