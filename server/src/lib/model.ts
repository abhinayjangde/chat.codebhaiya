import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import { webSearchTool } from "./tools.js";

const chatgpt = new ChatOpenAI({
  model: process.env.OPENAI_MODEL || "gpt-4o",
  temperature: 0.7,
  streaming: true,
});

// Create agent with tools using LangChain's createAgent
// Based on latest docs: https://docs.langchain.com/oss/javascript/langchain/agents
const agent = createAgent({
  model: chatgpt,
  tools: [webSearchTool],
  systemPrompt: `You are a helpful AI assistant with access to web search.

When answering questions about current events, news, or time-sensitive information, use the web_search tool to get up-to-date information.

Guidelines:
- Always cite your sources using [1], [2], etc. format when using web search results
- Be concise but thorough in your responses
- If you're unsure about current information, use the web search tool
- Format search results clearly with proper citations`,
});

export default agent;
