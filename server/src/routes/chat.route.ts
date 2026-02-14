import express from "express";
import type { Request, Response, Router } from "express";
import { ObjectId } from "mongodb";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import agent from "../lib/model.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import type { SearchResult } from "../services/search.service.js";
import { getPaginatedMessages } from "../services/message.service.js";

const router: Router = express.Router();

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

        const chat = await Chat.create({ 
            title: message,
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
        const { message } = req.body;
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
            .map((msg) => ({
                role: msg.role as string,
                content: msg.content as string,
            }));

        formatted.push({ role: "user", content: message });

        const response = await agent.invoke({ messages: formatted });

        await Message.create({
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId),
            role: "user",
            content: message,
        });
        
        const assistantContent = response.messages[response.messages.length - 1]?.content;
        const contentString = typeof assistantContent === "string" ? assistantContent : JSON.stringify(assistantContent || "");

        await Message.create({
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId),
            role: "assistant",
            content: contentString,
        });

        await Chat.findByIdAndUpdate(chatId, { 
            title: message,
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

// Streaming endpoint with Server-Sent Events (SSE)
router.post("/:chatId/stream", async (req: Request, res: Response) => {
    const chatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
    const { message } = req.body;
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

        formatted.push({ role: "user", content: message });

        // Save user message
        await Message.create({
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId),
            role: "user",
            content: message,
        });

        // Track collected data
        let fullResponse = "";
        const usedTools: any[] = [];
        const sources: SearchResult[] = [];

        // Stream the response
        const stream = await agent.stream(
            { messages: formatted },
            { streamMode: "values" }
        );

        for await (const chunk of stream) {
            // Get the latest message from the chunk
            const latestMessage = chunk.messages[chunk.messages.length - 1];
            
            if (latestMessage) {
                // Check for tool calls
                const toolCalls = (latestMessage as any).tool_calls;
                if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
                    for (const toolCall of toolCalls) {
                        if (toolCall.name === "web_search") {
                            usedTools.push({
                                name: toolCall.name,
                                input: toolCall.args,
                            });
                            
                            // Send tool start event
                            res.write(`data: ${JSON.stringify({ 
                                type: 'tool_start', 
                                tool: toolCall.name 
                            })}\n\n`);
                        }
                    }
                }
                
                // Check if it's a tool message (result)
                if ((latestMessage as any).name === "web_search") {
                    const content = getMessageContent(latestMessage.content);
                    
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

                    usedTools.push({
                        name: (latestMessage as any).name || "unknown",
                        output: content,
                    });

                    res.write(`data: ${JSON.stringify({ 
                        type: 'tool_result', 
                        tool: (latestMessage as any).name,
                        output: content 
                    })}\n\n`);
                }
                
                // Stream AI response content
                const hasToolCalls = (latestMessage as any).tool_calls && (latestMessage as any).tool_calls.length > 0;
                if (latestMessage.content && !hasToolCalls && (latestMessage as any).name !== "web_search") {
                    const content = getMessageContent(latestMessage.content);
                    
                    fullResponse += content;
                    
                    res.write(`data: ${JSON.stringify({ 
                        type: 'token', 
                        content 
                    })}\n\n`);
                }
            }
        }

        // Save assistant message
        const messageData: any = {
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId),
            role: "assistant",
            content: fullResponse,
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
            title: message,
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

export default router;
