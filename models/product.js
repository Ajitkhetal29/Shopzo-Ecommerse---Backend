import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    description: String,

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      default: null,
      index: true,
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
  
    images: {
      type: [{
        url: String,
        public_id: String,
      }],
      default: [],
    },

    status: {
      type: String,
      enum: ["draft", "active", "inactive"],
      default: "draft",
    },
  },
  { timestamps: true }
);

// Indexes
productSchema.index({ vendor: 1, status: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ subcategory: 1, status: 1 });

export default mongoose.model("Product", productSchema);