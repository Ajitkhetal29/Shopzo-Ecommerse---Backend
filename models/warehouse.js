import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },

    // 📍 SOURCE OF TRUTH
    location: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },

    // 🏠 Derived address (can be auto-filled or edited)
    address: {
      formatted: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      pincode: {
        type: String,
        required: true,
        trim: true,
      },
      landmark: {
        type: String,
        trim: true,
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    members: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
        required: true,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    }],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);



const Warehouse = mongoose.model("Warehouse", warehouseSchema);
export default Warehouse;
