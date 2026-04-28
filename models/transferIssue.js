import mongoose from "mongoose";

const transferIssueSchema = new mongoose.Schema(
  {
    // Backward-compat field kept to satisfy existing unique DB index
    // transfer_1_variant_1_issueType_1 on some environments.
    transfer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryTransfer",
    },
    transferRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryTransfer",
      required: true,
    },
    // Variant-level issue identity (used for per-variant, per-issueType tickets)
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    issueType: {
      type: String,
      enum: ["damaged", "missing", "extra"],
      required: true,
    },
    issueDescription: {
      type: String,
      required: true,
    },
    issueImages: {
      type: [String],
      default: [],
    },
    issueQuantity: {
      type: Number,
      required: true,
    },
    issueResolutionType: {
      type: String,
      enum: ["return", "replace", "adjust"],
    },
    issueResolutionDescription: {
      type: String,
    },
    issueStatus: {
      type: String,
      enum: ["pending", "in_progress", "resolved"],
      default: "pending",
    },
    issueResolutionDate: {
      type: Date,
    },
    issueResolvedByType: {
      type: String,
      enum: ["Vendor", "Warehouse"],
    },
    issueResolvedById: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "issueResolvedByType",
    },
    raisedByType: {
      type: String,
      enum: ["vendor", "warehouse"],
      required: true,
    },
    raisedByModel: {
      type: String,
      enum: ["Vendor", "Warehouse"],
      required: true,
    },
    raisedById: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "raisedByModel",
      required: true,
    },
  },
  { timestamps: true }
);

const transferIssue = mongoose.model("TransferIssue", transferIssueSchema);

export default transferIssue;
