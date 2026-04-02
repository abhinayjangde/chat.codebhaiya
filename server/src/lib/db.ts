import mongoose from "mongoose";
import { env } from "../config/env.js";

/**
 * Connects to the MongoDB database and sets up connection lifecycle management.
 * 
 * Establishes a connection to MongoDB using Mongoose with a 5-second server selection timeout.
 * Sets up error handling for connection failures and graceful shutdown handlers for SIGINT and SIGTERM signals.
 * 
 * @returns {Promise<void>} A promise that resolves when the database connection is established.
 * @throws Logs error and exits process with code 1 if connection fails.
 * 
 * @example
 * await db();
 * 
 * @remarks
 * - Exits the process with code 0 on graceful shutdown (SIGINT/SIGTERM)
 * - Exits the process with code 1 if initial connection fails
 * - Logs connection status and errors to console
 */
const db = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URL, {
      serverSelectionTimeoutMS: 5000 // 5-seconds
    });
    console.log("Database connected successfully");

    mongoose.connection.on("error", (error) => {
      console.error("MongoDB connection error:", error);
    });

    process.on("SIGINT", async () => {
      await mongoose.disconnect();
      console.log("MongoDB connection closed");
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await mongoose.disconnect();
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

export default db;
