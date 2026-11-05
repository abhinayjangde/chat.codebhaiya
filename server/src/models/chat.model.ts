import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true, 
    index: true 
  },
  title: { type: String, default: "New Chat" },
  isPinned: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

chatSchema.index({ userId: 1, updatedAt: -1 });

export const Chat = mongoose.model("Chat", chatSchema);
