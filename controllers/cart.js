import mongoose from "mongoose";
import cartModel from "../models/cart.js";
import Product from "../models/product.js";
import Variant from "../models/variant.js";

const attachCartPrices = async (cart) => {
  if (!cart || !cart.items?.length) return cart;

  const productIds = cart.items
    .map((item) => item.product?._id)
    .filter(Boolean)
    .map((id) => String(id));

  if (!productIds.length) return cart;

  const priceRows = await Variant.aggregate([
    {
      $match: {
        product: {
          $in: productIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    },
    { $group: { _id: "$product", minPrice: { $min: "$price" } } },
  ]);

  const priceMap = new Map(priceRows.map((row) => [String(row._id), row.minPrice]));

  const cartObj = cart.toObject ? cart.toObject() : cart;
  cartObj.items = cartObj.items.map((item) => {
    const product = item.product?.toObject ? item.product.toObject() : item.product;
    return {
      ...item,
      product: {
        ...product,
        minPrice: priceMap.get(String(product._id)) ?? null,
      },
    };
  });

  return cartObj;
};

const addToCart = async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    if (!userId || !productId || quantity <= 0) {
      return res.status(400).json({ message: "Invalid request parameters" });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let cart = await cartModel.findOne({ user: userId });

    if (!cart) {
      cart = new cartModel({
        user: userId,
        items: [{ product: productId, quantity }],
      });
    } else {
      const existingItemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );
      if (existingItemIndex > -1) {
        cart.items[existingItemIndex].quantity += quantity;
      } else {
        cart.items.push({ product: productId, quantity });
      }
    }

    await cart.save();
    const populatedCart = await cart.populate("items.product");
    const pricedCart = await attachCartPrices(populatedCart);

    return res.status(200).json({
      message: "Product added to cart successfully",
      data: pricedCart,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const getCart = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const cart = await cartModel
      .findOne({ user: userId })
      .populate("items.product");

    if (!cart) {
      return res.status(200).json({
        message: "Cart is empty",
        data: { items: [] },
      });
    }

    const pricedCart = await attachCartPrices(cart);

    return res.status(200).json({
      message: "Cart retrieved successfully",
      data: pricedCart,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const updateQuantity = async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    if (!userId || !productId || quantity === undefined) {
      return res.status(400).json({ message: "Invalid request parameters" });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    const cart = await cartModel.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    const populatedCart = await cart.populate("items.product");
    const pricedCart = await attachCartPrices(populatedCart);

    return res.status(200).json({
      message: "Quantity updated successfully",
      data: pricedCart,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ message: "Invalid request parameters" });
    }

    const cart = await cartModel.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();
    const populatedCart = await cart.populate("items.product");
    const pricedCart = await attachCartPrices(populatedCart);

    return res.status(200).json({
      message: "Product removed from cart successfully",
      data: pricedCart,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const clearCart = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const cart = await cartModel.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = [];
    await cart.save();

    return res.status(200).json({
      message: "Cart cleared successfully",
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

export { addToCart, getCart, updateQuantity, removeFromCart, clearCart };
