import mongoose from "mongoose";

const userReportingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    reportingTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true,
    },
  
}, { timestamps: true });

const UserReporting = mongoose.model("UserReporting", userReportingSchema);
export default UserReporting;