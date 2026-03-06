import express from "express";
import type { Request, Response, Router } from "express";
import { ObjectId } from "mongodb";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { getAgent, getAvailableModels, DEFAULT_MODEL, autoSelectModel } from "../lib/model.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import type { SearchResult } from "../services/search.service.js";
import { getPaginatedMessages } from "../services/message.service.js";
import { generateChatTitle } from "../services/chat.service.js";
import PDFDocument from "pdfkit";

const router: Router = express.Router();

// Public endpoint to get available models
router.get("/models", (_req: Request, res: Response) => {
    const models = getAvailableModels();
    res.status(200).json({
        success: true,
        data: { 
            models,
            default: DEFAULT_MODEL
        }
    });
});

router.use(authenticateToken);

router.get("/", async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const chats = await Chat.find({ userId: new ObjectId(userId) })
            .sort({ updatedAt: -1 });
        
        res.status(200).json({
            success: true,
            data: { chats }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: (error as Error).message
        });
    }
});

// Get paginated messages for a chat
router.get("/:chatId/messages", async (req: Request, res: Response) => {
    try {
        const chatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
        
        // Type guard for userId
        const userId: string | undefined = req.user?.userId;
        if (typeof userId !== 'string') {
            res.status(401).json({
                success: false,
                error: "User not authenticated"
            });
            return;
        }
        
        // Parse pagination params
        const limit = parseInt(req.query.limit as string) || 20;
        const before = req.query.before as string | undefined;
        const after = req.query.after as string | undefined;

        // Verify chat exists and belongs to user
        const chat = await Chat.findOne({ 
            _id: new ObjectId(chatId),
            userId: new ObjectId(userId)
        });
        
        if (!chat) {
            res.status(404).json({
                success: false,
                error: "Chat not found"
            });
            return;
        }

        // Get paginated messages
        // @ts-expect-error TypeScript doesn't properly narrow type after early return
        const result = await getPaginatedMessages(chatId, userId, {
            limit,
            before,
            after
        });

        res.status(200).json({
            success: true,
            data: {
                messages: result.messages,
                pagination: {
                    nextCursor: result.nextCursor,
                    hasMore: result.hasMore,
                    total: result.total
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: (error as Error).message
        });
    }
});

router.post("/", async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        const userId = req.user?.userId;
        
        if (!message) {
            res.status(400).json({
                success: false,
                error: "Message is required"
            });
            return;
        }

        const title = await generateChatTitle(message);

        const chat = await Chat.create({ 
            title,
            userId: new ObjectId(userId) 
        });
        
        res.status(201).json({
            success: true,
            data: {
                title: chat.title,
                chatId: chat._id,
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: (error as Error).message
        });
    }
});

router.post("/:chatId", async (req: Request, res: Response) => {
    try {
        const chatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
        const { message, attachments, language } = req.body;
        let { model } = req.body;
        const userId = req.user?.userId;

        if (!message) {
            res.status(400).json({
                success: false,
                error: "Message is required"
            });
            return;
        }

        const chat = await Chat.findOne({ 
            _id: new ObjectId(chatId),
            userId: new ObjectId(userId)
        });
        
        if (!chat) {
            res.status(404).json({
                success: false,
                error: "Chat not found"
            });
            return;
        }

        const previousMessages = await Message.find({ 
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId)
        });

        const formatted = previousMessages
            .filter((msg) => msg.role && msg.content)
            .map((msg) => {
                // If previous message has attachments, we just send text for now or re-format if needed.
                // Simple implementation: just send the text content to keep context window reasonable.
                return {
                    role: msg.role as string,
                    content: msg.content as string, // Might need to be adjusted if storing multimodal previous
                };
            });

        // Format current message with attachments
        let finalContent: any = message;
        
        if (attachments && attachments.length > 0) {
            finalContent = [];
            
            // Add all images and audio
            for (const att of attachments) {
                if (att.type === "image") {
                    finalContent.push({
                        type: "image_url",
                        image_url: { url: att.content }
                    });
                } else if (att.type === "audio") {
                    finalContent.push({
                        type: "media",
                        mimeType: att.mimeType,
                        data: att.content.split(",")[1] // Strip data uri prefix
                    });
                }
            }
            
            // Add text context from documents
            let textPrompt = message;
            for (const att of attachments) {
                if (att.type === "document") {
                    textPrompt += `\n\n--- Content from attached file: ${att.name} ---\n${att.content}\n--- End of file ---\n`;
                }
            }
            
            finalContent.push({
                type: "text",
                text: textPrompt
            });
        }

        formatted.push({ role: "user", content: finalContent });

        if (model === "auto" || !model) {
            model = await autoSelectModel(message, attachments);
        }

        const agent = getAgent(model, language);
        const response = await agent.invoke({ messages: formatted });

        await Message.create({
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId),
            role: "user",
            content: message, // Store original text string for UI simplicity
            attachments: attachments || [],
        });
        
        const assistantContent = response.messages[response.messages.length - 1]?.content;
        const contentString = typeof assistantContent === "string" ? assistantContent : JSON.stringify(assistantContent || "");

        await Message.create({
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId),
            role: "assistant",
            content: contentString,
            modelName: model,
        });

        await Chat.findByIdAndUpdate(chatId, { 
            updatedAt: new Date()
        });
        
        res.status(200).json({
            success: true,
            data: {
                reply: assistantContent,
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: (error as Error).message
        });
    }
});

// Rename a chat
router.patch("/:chatId", async (req: Request, res: Response) => {
    try {
        const chatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
        const { title } = req.body;
        const userId = req.user?.userId;

        if (!title || typeof title !== "string" || !title.trim()) {
            res.status(400).json({
                success: false,
                error: "Title is required"
            });
            return;
        }

        // Verify chat belongs to authenticated user
        const chat = await Chat.findOne({
            _id: new ObjectId(chatId),
            userId: new ObjectId(userId)
        });

        if (!chat) {
            res.status(404).json({
                success: false,
                error: "Chat not found"
            });
            return;
        }

        await Chat.findByIdAndUpdate(chatId, {
            title: title.trim(),
            updatedAt: new Date()
        });

        res.status(200).json({
            success: true,
            message: "Chat renamed successfully",
            data: { title: title.trim() }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: (error as Error).message
        });
    }
});


// Delete a chat and all its messages
router.delete("/:chatId", async (req: Request, res: Response) => {
    try {
        const chatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
        const userId = req.user?.userId;

        // Validate chatId
        if (!chatId || !ObjectId.isValid(chatId)) {
            res.status(400).json({
                success: false,
                error: "Invalid chat ID"
            });
            return;
        }

        // Verify chat belongs to authenticated user
        const chat = await Chat.findOne({
            _id: new ObjectId(chatId),
            userId: new ObjectId(userId)
        });

        if (!chat) {
            res.status(404).json({
                success: false,
                error: "Chat not found"
            });
            return;
        }

        // Delete all messages for this chat
        await Message.deleteMany({ chatId: new ObjectId(chatId) });

        // Delete the chat itself
        await Chat.findByIdAndDelete(chatId);

        res.status(200).json({
            success: true,
            message: "Chat deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: (error as Error).message
        });
    }
});

// Streaming endpoint with Server-Sent Events (SSE)
router.post("/:chatId/stream", async (req: Request, res: Response) => {
    const chatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
    const { message, attachments, language } = req.body;
    let { model } = req.body;
    const userId = req.user?.userId;

    if (!message) {
        res.status(400).json({
            success: false,
            error: "Message is required"
        });
        return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if applicable

    try {
        // Verify chat exists and belongs to user
        const chat = await Chat.findOne({ 
            _id: new ObjectId(chatId),
            userId: new ObjectId(userId)
        });
        
        if (!chat) {
            res.write(`data: ${JSON.stringify({ type: 'error', error: 'Chat not found' })}\n\n`);
            res.end();
            return;
        }

        // Get previous messages
        const previousMessages = await Message.find({ 
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId)
        });

        const formatted = previousMessages
            .filter((msg) => msg.role && msg.content)
            .map((msg) => ({
                role: msg.role as string,
                content: msg.content as string,
            }));

        // Format current message with attachments
        let finalContent: any = message;
        
        if (attachments && attachments.length > 0) {
            finalContent = [];
            
            // Add all images and audio
            for (const att of attachments) {
                if (att.type === "image") {
                    finalContent.push({
                        type: "image_url",
                        image_url: { url: att.content }
                    });
                } else if (att.type === "audio") {
                    finalContent.push({
                        type: "media",
                        mimeType: att.mimeType,
                        data: att.content.split(",")[1]
                    });
                }
            }
            
            // Add text context from documents
            let textPrompt = message;
            for (const att of attachments) {
                if (att.type === "document") {
                    textPrompt += `\n\n--- Content from attached file: ${att.name} ---\n${att.content}\n--- End of file ---\n`;
                }
            }
            
            finalContent.push({
                type: "text",
                text: textPrompt
            });
        }

        formatted.push({ role: "user", content: finalContent });

        // Save user message
        await Message.create({
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId),
            role: "user",
            content: message,
            attachments: attachments || [],
        });

        // Track collected data
        let fullResponse = "";
        const usedTools: any[] = [];
        const sources: SearchResult[] = [];

        if (model === "auto" || !model) {
            model = await autoSelectModel(message, attachments);
        }

        // Stream the response using "messages" mode for token-by-token deltas
        const agent = getAgent(model, language);
        const stream = await agent.stream(
            { messages: formatted },
            { streamMode: "messages" }
        );

        for await (const chunk of stream) {
            // streamMode "messages" yields [messageChunk, metadata] tuples
            const [messageChunk, _metadata] = chunk as [any, any];
            
            if (!messageChunk) continue;

            const msgType = messageChunk._getType?.() ?? messageChunk.constructor?.name ?? "";

            // Handle tool call chunks from the AI
            if (msgType === "ai" || msgType === "AIMessageChunk") {
                const toolCallChunks = messageChunk.tool_call_chunks;
                if (toolCallChunks && Array.isArray(toolCallChunks) && toolCallChunks.length > 0) {
                    for (const toolChunk of toolCallChunks) {
                        if (toolChunk.name === "web_search") {
                            usedTools.push({
                                name: toolChunk.name,
                                input: toolChunk.args,
                            });
                            
                            res.write(`data: ${JSON.stringify({ 
                                type: 'tool_start', 
                                tool: toolChunk.name 
                            })}\n\n`);
                        }
                    }
                }

                // Stream AI token deltas
                const content = getMessageContent(messageChunk.content);
                if (content) {
                    fullResponse += content;
                    
                    res.write(`data: ${JSON.stringify({ 
                        type: 'token', 
                        content 
                    })}\n\n`);
                }
            }

            // Handle tool result messages
            if (msgType === "tool" || msgType === "ToolMessageChunk" || msgType === "ToolMessage") {
                const toolName = messageChunk.name || "unknown";
                const content = getMessageContent(messageChunk.content);
                
                if (toolName === "web_search") {
                    // Parse search results if available
                    try {
                        const searchResults = parseSearchResults(content);
                        if (searchResults.length > 0) {
                            sources.push(...searchResults);
                            
                            res.write(`data: ${JSON.stringify({ 
                                type: 'sources', 
                                sources: searchResults 
                            })}\n\n`);
                        }
                    } catch (e) {
                        // Not search results, ignore
                    }
                }

                usedTools.push({
                    name: toolName,
                    output: content,
                });

                res.write(`data: ${JSON.stringify({ 
                    type: 'tool_result', 
                    tool: toolName,
                    output: content 
                })}\n\n`);
            }
        }

        // Save assistant message
        const messageData: any = {
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId),
            role: "assistant",
            content: fullResponse,
            modelName: model,
        };
        
        if (sources.length > 0) {
            messageData.sources = sources;
        }
        if (usedTools.length > 0) {
            messageData.usedTools = usedTools;
        }
        
        await Message.create(messageData);

        // Update chat
        await Chat.findByIdAndUpdate(chatId, { 
            updatedAt: new Date()
        });

        // Send completion event
        const doneEvent: any = { type: 'done' };
        if (sources.length > 0) {
            doneEvent.sources = sources;
        }
        if (usedTools.length > 0) {
            doneEvent.usedTools = usedTools;
        }
        
        res.write(`data: ${JSON.stringify(doneEvent)}\n\n`);
        res.end();

    } catch (error) {
        console.error("Streaming error:", error);
        res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            error: (error as Error).message 
        })}\n\n`);
        res.end();
    }
});

// Helper function to get string content from message
function getMessageContent(content: any): string {
    if (typeof content === "string") {
        return content;
    }
    if (Array.isArray(content)) {
        return content.map(c => {
            if (typeof c === "string") return c;
            if (c && typeof c === "object" && "text" in c) return c.text;
            return JSON.stringify(c);
        }).join("");
    }
    return JSON.stringify(content);
}

// Helper function to parse search results from tool output
function parseSearchResults(content: string): SearchResult[] {
    const results: SearchResult[] = [];
    const lines = content.split('\n');
    let currentResult: Partial<SearchResult> & { title: string } = { title: "" };
    
    for (const line of lines) {
        const match = line.match(/^\[(\d+)\]\s+(.+)$/);
        if (match) {
            if (currentResult.position) {
                results.push(currentResult as SearchResult);
            }
            currentResult = {
                position: parseInt(match[1] || "0"),
                title: match[2] || "",
            };
        } else if (line.startsWith('URL:')) {
            currentResult.link = line.replace('URL:', '').trim();
        } else if (currentResult.position && line.trim()) {
            currentResult.snippet = line.trim();
        }
    }
    
    if (currentResult.position) {
        results.push(currentResult as SearchResult);
    }
    
    return results;
}

// Generate PDF for a chat
router.get("/:chatId/pdf", async (req: Request, res: Response) => {
    try {
        const chatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
        const userId = req.user?.userId;

        // Verify chat exists and belongs to user
        const chat = await Chat.findOne({ 
            _id: new ObjectId(chatId),
            userId: new ObjectId(userId)
        });
        
        if (!chat) {
            res.status(404).json({
                success: false,
                error: "Chat not found"
            });
            return;
        }

        const messages = await Message.find({ 
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId)
        }).sort({ createdAt: 1 });

        const doc = new PDFDocument({ margin: 50 });

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${(chat.title || 'chat-export').replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.pdf"`);

        // Pipe PDF document to response
        doc.pipe(res);

        // Header
        doc.fontSize(20).text(chat.title || "Chat Export", { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).fillColor('grey').text(`Exported on ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);

        // Messages
        for (const msg of messages) {
            if (!msg.content) continue;

            // Use type assertion or check if content is string
            let contentStr = "";
            if (typeof msg.content === 'string') {
                contentStr = msg.content;
            } else {
                contentStr = JSON.stringify(msg.content);
            }

            const isUser = msg.role === 'user';
            
            // Draw message container
            const x = doc.x;
            const y = doc.y;
            const width = 450;
            
            doc.font('Helvetica-Bold').fontSize(12).fillColor(isUser ? '#2563EB' : '#16A34A').text(isUser ? 'You' : 'AI Assistant');
            doc.font('Helvetica').fontSize(10).fillColor('gray').text(msg.createdAt ? new Date(msg.createdAt).toLocaleString() : '');
            doc.moveDown(0.5);
            
            doc.font('Helvetica').fontSize(11).fillColor('black').text(contentStr, {
                width: width,
                align: 'left'
            });
            
            doc.moveDown(1.5);
        }

        doc.end();

    } catch (error) {
        console.error("PDF Generation error:", error);
        // If headers are already sent, we can't send JSON error
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: (error as Error).message
            });
        }
    }
});

export default router;
