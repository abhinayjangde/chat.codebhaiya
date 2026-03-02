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
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    attachments: [{
        type: { type: String, enum: ["image", "document"] },
        content: String,
        name: String,
        mimeType: String,
        size: Number
    }],
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
