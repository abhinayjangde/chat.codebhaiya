import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    chatId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Chat",
        required: true,
        index: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User",
        required: true,
        index: true 
    },
    role: { 
        type: String, 
        enum: ["user", "assistant"],
        required: true 
    },
    content: { type: String, required: true },
    sources: [{
        title: String,
        url: String,
        snippet: String
    }],
    usedTools: [{
        name: String,
        input: mongoose.Schema.Types.Mixed,
        output: String
    }],
    createdAt: { type: Date, default: Date.now }
});

export const Message = mongoose.model("Message", messageSchema);
