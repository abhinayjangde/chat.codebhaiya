import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOllama } from "@langchain/ollama";
import { createAgent } from "langchain";
import { env } from "../config/env.js";
import { webSearchTool } from "./tools.js";

// -- Model Definitions --

export interface ModelConfig {
  id: string;
  provider: "groq" | "google" | "openai" | "ollama";
  modelName: string;
  displayName: string;
}

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  // Groq Models
  "groq-llama-3.3-70b": {
    id: "groq-llama-3.3-70b",
    provider: "groq",
    modelName: "llama-3.3-70b-versatile",
    displayName: "Llama 3.3 70B (Groq)",
  },
  "groq-llama-3.1-8b": {
    id: "groq-llama-3.1-8b",
    provider: "groq",
    modelName: "llama-3.1-8b-instant",
    displayName: "Llama 3.1 8B (Groq)",
  },

  // Google Models
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    provider: "google",
    modelName: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
  },
  "gemini-1.5-pro": {
    id: "gemini-1.5-pro",
    provider: "google",
    modelName: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
  },

  // OpenAI Models
  "gpt-5-nano-2025-08-07": {
    id: "gpt-5-nano-2025-08-07",
    provider: "openai",
    modelName: "gpt-5-nano-2025-08-07",
    displayName: "GPT-5 Nano",
  },

  // Ollama Cloud Models
  "ollama-glm-5-cloud": {
    id: "ollama-glm-5-cloud",
    provider: "ollama",
    modelName: "glm-5:cloud",
    displayName: "GLM-5 (Ollama Cloud)",
  },
  "ollama-kimi-k2.5-cloud": {
    id: "ollama-kimi-k2.5-cloud",
    provider: "ollama",
    modelName: "kimi-k2.5:cloud",
    displayName: "Kimi K2.5 (Ollama Cloud)",
  },
};

export const DEFAULT_MODEL = "groq-llama-3.3-70b";

// -- Factory --

/**
 * Returns a list of available models based on configured API keys.
 */
export function getAvailableModels(): ModelConfig[] {
  const available: ModelConfig[] = [];

  // Check Groq
  if (env.GROQ_API_KEY) {
    available.push(MODEL_REGISTRY["groq-llama-3.3-70b"]!);
    available.push(MODEL_REGISTRY["groq-llama-3.1-8b"]!);
  }

  // Check Google
  if (env.GOOGLE_API_KEY) {
    available.push(MODEL_REGISTRY["gemini-2.0-flash"]!);
    available.push(MODEL_REGISTRY["gemini-1.5-pro"]!);
  }

  // Check OpenAI
  if (env.OPENAI_API_KEY) {
    available.push(MODEL_REGISTRY["gpt-5-nano-2025-08-07"]!);
  }

  // Check Ollama
  if (env.OLLAMA_API_KEY) {
    available.push(MODEL_REGISTRY["ollama-glm-5-cloud"]!);
    available.push(MODEL_REGISTRY["ollama-kimi-k2.5-cloud"]!);
  }

  return available;
}

/**
 * Creates an agent instance for the requested model ID.
 * Falls back to DEFAULT_MODEL if the requested ID is invalid or unavailable.
 */
export function getAgent(modelId?: string) {
  // 1. Resolve model config
  let config = MODEL_REGISTRY[modelId ?? DEFAULT_MODEL];

  // Fallback if invalid ID
  if (!config) {
    console.warn(`Model ID '${modelId}' not found, falling back to default.`);
    config = MODEL_REGISTRY[DEFAULT_MODEL];
  }

  if (!config) {
    throw new Error(`Default model configuration for '${DEFAULT_MODEL}' not found.`);
  }

  // 2. Instantiate the correct LangChain model
  let llm;

  switch (config.provider) {
    case "groq":
      if (!env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");
      llm = new ChatGroq({
        apiKey: env.GROQ_API_KEY,
        model: config.modelName,
        temperature: 0.7,
        streaming: true,
      });
      break;

    case "google":
      if (!env.GOOGLE_API_KEY)
        throw new Error("GOOGLE_API_KEY is not configured");
      llm = new ChatGoogleGenerativeAI({
        apiKey: env.GOOGLE_API_KEY,
        model: config.modelName,
        temperature: 0.7,
        streaming: true,
      });
      break;

    case "openai":
      if (!env.OPENAI_API_KEY)
        throw new Error("OPENAI_API_KEY is not configured");
      llm = new ChatOpenAI({
        apiKey: env.OPENAI_API_KEY,
        model: config.modelName,
        streaming: true,
      });
      break;

    case "ollama":
      if (!env.OLLAMA_API_KEY)
        throw new Error("OLLAMA_API_KEY is not configured");
      llm = new ChatOllama({
        model: config.modelName,
        baseUrl: "https://api.ollama.com",
        headers: {
          Authorization: `Bearer ${env.OLLAMA_API_KEY}`,
        },
        temperature: 0.7,
        streaming: true,
      });
      break;

    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }

  // 3. Create and return the agent
  return createAgent({
    model: llm,
    tools: [webSearchTool],
    systemPrompt: `You are a helpful AI assistant with access to web search.
Current model: ${config.displayName}

When answering questions about current events, news, or time-sensitive information, use the web_search tool to get up-to-date information.

Guidelines:
- Always cite your sources using [1], [2], etc. format when using web search results
- Be concise but thorough in your responses
- If you're unsure about current information, use the web search tool
- Format search results clearly with proper citations`,
  });
}
