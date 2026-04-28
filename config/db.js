import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        
        if (!mongoUri) {
            throw new Error("MONGO_URI is not defined in environment variables");
        }

        await mongoose.connect(mongoUri);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        
        if (error.message.includes("authentication failed") || error.code === 8000) {
            console.error("\n⚠️  Authentication failed. Common fixes:");
            console.error("1. Check your username and password in MONGO_URI");
            console.error("2. If password contains special characters (@, #, %, &, etc.), URL-encode them:");
            console.error("   @ → %40, # → %23, % → %25, & → %26");
            console.error("3. Verify the database user exists and has proper permissions");
            console.error("4. Check MongoDB Atlas IP whitelist settings");
        }
        
        process.exit(1);
    }
}

export default connectDB;