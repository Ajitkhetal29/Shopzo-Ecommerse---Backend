import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },

    // sent quantity
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    // Filled after delivered
    receivedQuantity: { type: Number, min: 0, default: null },
    acceptedQuantity: { type: Number, min: 0, default: null },
    damagedQuantity: { type: Number, min: 0, default: null },
    missingQuantity: { type: Number, min: 0, default: null },
    extraQuantity: { type: Number, min: 0, default: null },

  },
);

const inventoryTransferSchema = new mongoose.Schema(
  {
    // 🔹 Multiple items
    items: {
      type: [itemSchema],
      required: true,
      validate: [(arr) => arr.length > 0, "At least one item required"],
    },

    fromType: {
      type: String,
      enum: ["vendor", "warehouse"],
      required: true,
    },

    fromModel: {
      type: String,
      enum: ["Vendor", "Warehouse"],
      required: true,
    },

    fromId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "fromModel",
      required: true,
    },

    toType: {
      type: String,
      enum: ["vendor", "warehouse"],
      required: true,
    },

    toModel: {
      type: String,
      enum: ["Vendor", "Warehouse"],
      required: true,
    },

    toId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "toModel",
      required: true,
    },

    totalQuantity: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: [
        "initiated",
        "approved",
        "rejected",
        "cancelled",
        "shipped",
        "delivered",
        "issue_reported",
        "completed",
      ],
      default: "initiated",
      index: true,
    },

    initiatedAt: { type: Date, default: Date.now },
    approvedAt: Date,
    rejectedAt: Date,
    cancelledAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);


export default mongoose.model("InventoryTransfer", inventoryTransferSchema);