import mongoose from "mongoose";
import { env } from "../config/env.js";

/**
 * Connects to the MongoDB database and sets up connection lifecycle management.
 * 
 * Establishes a connection to MongoDB using Mongoose with a 5-second server selection timeout.
 * Sets up error handling for connection failures. Process shutdown is coordinated
 * by the server entry point so all resources can close in order.
 * 
 * @returns {Promise<void>} A promise that resolves when the database connection is established.
 * @throws Logs and rethrows errors if the initial connection fails.
 * 
 * @example
 * await db();
 * 
 * @remarks
 * - Logs connection failures and rethrows them to the caller
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

  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
};

export default db;
