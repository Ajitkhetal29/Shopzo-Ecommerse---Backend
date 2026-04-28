import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    size: {
      type: String,
      trim: true,
    },

    color: {
      type: String,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    images: {
      type: [
        {
          url: String,
          public_id: String,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

// Indexes
variantSchema.index({ product: 1, isActive: 1 });
variantSchema.index({ sku: 1 });


const Variant = mongoose.model("Variant", variantSchema);
export default Variant;
