import { ChatGroq } from "@langchain/groq";
import { ChatGoogle } from "@langchain/google";
import { env } from "../config/env.js";

/**
 * Generates a concise and descriptive title for a chat conversation based on the first message.
 * @param message The first message of the chat.
 * @returns A generated title string.
 */
export async function generateChatTitle(message: string): Promise<string> {
  // Short messages do not need an extra model request.
  if (message.length < 10) {
    return message.slice(0, 50).trim() + (message.length > 50 ? "..." : "");
  }

  try {
    let llm;
    if (env.GROQ_API_KEY) {
      llm = new ChatGroq({
        apiKey: env.GROQ_API_KEY,
        model: "qwen/qwen3.8-27b",
        temperature: 0.1,
      });
    } else if (env.GOOGLE_API_KEY) {
      llm = new ChatGoogle({
        apiKey: env.GOOGLE_API_KEY,
        model: "gemini-3.1-flash-lite",
        temperature: 0.1,
      });
    } else {
      return message.slice(0, 50).trim() + (message.length > 50 ? "..." : "");
    }

    const response = await llm.invoke([
      {
        role: "system",
        content: "You are a helpful assistant that generates a concise, catchy, and descriptive title (maximum 6 words) for an AI chat conversation based on the user's first message. Respond ONLY with the title literal string, no quotes, no preamble.",
      },
      {
        role: "user",
        content: `User message: "${message}"`,
      },
    ]);

    const title = response.content.toString().trim().replace(/^"|"$/g, "");
    
    // Safety check: if the LLM failed or returned something too long, fallback
    if (!title || title.length > 100) {
      return message.slice(0, 50).trim() + (message.length > 50 ? "..." : "");
    }

    return title;
  } catch (error) {
    console.error("Failed to generate chat title:", error);
    return message.slice(0, 50).trim() + (message.length > 50 ? "..." : "");
  }
}
