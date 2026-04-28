import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        trim: true,
    },
    contactNumber: {
        type: String,
        required: true,
        trim: true,
    },

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
  
   
}, { timestamps: true });

const Vendor = mongoose.model("Vendor", vendorSchema);
export default Vendor;