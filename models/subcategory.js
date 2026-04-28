import mongoose from "mongoose";

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
  },
  { timestamps: true }
);

// slug unique per category (same slug allowed in different categories)
subcategorySchema.index({ category: 1, slug: 1 }, { unique: true });

export default mongoose.model("Subcategory", subcategorySchema);
