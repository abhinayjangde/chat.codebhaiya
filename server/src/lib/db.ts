import mongoose from "mongoose";
import { env } from "../config/env.js";

const db = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URL);
  console.log("Database connected successfully");
};

export default db;
