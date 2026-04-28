import mongoose from "mongoose";

// Multiple status rows per transfer; mirrors InventoryTransfer fromType/fromModel pattern.
const transferStatusHistorySchema = new mongoose.Schema(
  {
    transferRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryTransfer",
      required: true,
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
      required: true,
    },
    changedAt: {
      type: Date,
      required: true,
    },
    changedByType: {
      type: String,
      enum: ["vendor", "warehouse"],
      required: true,
    },
    changedByModel: {
      type: String,
      enum: ["Vendor", "Warehouse"],
      required: true,
    },
    changedById: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "changedByModel",
      required: true,
    },
  },
  { timestamps: true }
);

const transferStatusHistory = mongoose.model(
  "TransferStatusHistory",
  transferStatusHistorySchema
);

export default transferStatusHistory;
