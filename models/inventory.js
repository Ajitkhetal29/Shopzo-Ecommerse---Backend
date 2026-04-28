import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
      index: true,
    },

    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },

    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    reserved: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** Short / in-dispute (e.g. transfer line missing) — not sellable */
    missingHold: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** Arrived but not sellable (warehouse quarantine / damaged) */
    damagedQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** Surplus at receiver, not confirmed into sellable */
    extraHold: {
      type: Number,
      default: 0,
      min: 0,
    },

    locationType: {
      type: String,
      enum: ["warehouse", "vendor"],
      required: true,
    },
    available: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Validation: exactly one of warehouse or vendor must be set
// Mongoose 8+ validate hooks: use throw, not next() (next is not passed)
inventorySchema.pre("validate", function () {
  const hasWarehouse = !!this.warehouse;
  const hasVendor = !!this.vendor;

  if (hasWarehouse && hasVendor) {
    throw new Error("Inventory cannot be in both warehouse and vendor location");
  }

  if (!hasWarehouse && !hasVendor) {
    throw new Error("Inventory must be in either warehouse or vendor location");
  }

  this.locationType = hasWarehouse ? "warehouse" : "vendor";
});

// Indexes for fulfillment queries
inventorySchema.index({ variant: 1, locationType: 1 });
inventorySchema.index({ warehouse: 1 });
inventorySchema.index({ vendor: 1 });
inventorySchema.index({ variant: 1, quantity: 1 }); // For available stock queries

export default mongoose.model("Inventory", inventorySchema);