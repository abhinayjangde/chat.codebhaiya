import mongoose from "mongoose"

const db = async () => {
    try {
        if (!process.env.MONGODB_URL) {
            throw new Error("MongoDB URL is not defined in environment variables");
        }
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("Database connected successfully 🌴");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
}

export default db