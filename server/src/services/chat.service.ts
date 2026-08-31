import { ChatGroq } from "@langchain/groq";
import { env } from "../config/env.js";

/**
 * Generates a concise and descriptive title for a chat conversation based on the first message.
 * @param message The first message of the chat.
 * @returns A generated title string.
 */
export async function generateChatTitle(message: string): Promise<string> {
  // Fallback if message is very short or Groq is not configured
  if (message.length < 10 || !env.GROQ_API_KEY) {
    return message.slice(0, 50).trim() + (message.length > 50 ? "..." : "");
  }

  try {
    const llm = new ChatGroq({
      apiKey: env.GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
    });

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
