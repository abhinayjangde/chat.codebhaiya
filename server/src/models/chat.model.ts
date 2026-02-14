import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User",
        required: true,
        index: true 
    },
    title: { type: String, default: "New Chat" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const Chat = mongoose.model("Chat", chatSchema);
