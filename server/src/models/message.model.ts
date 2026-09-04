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
    modelName: { type: String },
    attachments: [{
        type: { type: String, enum: ["image", "document"] },
        content: String,
        documentId: String,
        name: String,
        mimeType: String,
        size: Number
    }],
    sources: [{
        type: { type: String, enum: ["web", "document"] },
        title: String,
        url: String,
        snippet: String,
        documentId: String,
        filename: String,
        pageNumber: Number,
        chunkIndex: Number,
        score: Number,
    }],
    usedTools: [{
        name: String,
        input: mongoose.Schema.Types.Mixed,
        output: String
    }],
    createdAt: { type: Date, default: Date.now }
});

export const Message = mongoose.model("Message", messageSchema);
