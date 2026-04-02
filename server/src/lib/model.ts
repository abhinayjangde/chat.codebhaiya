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
  provider: "groq" | "google" | "openai" | "ollama" | "auto";
  modelName: string;
  displayName: string;
  tier: "heavy" | "cheap" | "auto";
  capabilities: {
    vision: boolean;
    audio: boolean;
  };
}

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  // Groq Models
  "groq-llama-3.3-70b": {
    id: "groq-llama-3.3-70b",
    provider: "groq",
    modelName: "llama-3.3-70b-versatile",
    displayName: "Llama 3.3 70B (Groq)",
    tier: "heavy",
    capabilities: { vision: false, audio: false },
  },
  "groq-llama-3.1-8b": {
    id: "groq-llama-3.1-8b",
    provider: "groq",
    modelName: "llama-3.1-8b-instant",
    displayName: "Llama 3.1 8B (Groq)",
    tier: "cheap",
    capabilities: { vision: false, audio: false },
  },

  // Google Models
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    provider: "google",
    modelName: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    tier: "heavy", // Flash works well as both, but it's the primary fallback for heavy multimodal
    capabilities: { vision: true, audio: true },
  },

  // OpenAI Models
  "gpt-5-nano-2025-08-07": {
    id: "gpt-5-nano-2025-08-07",
    provider: "openai",
    modelName: "gpt-5-nano-2025-08-07",
    displayName: "GPT-5 Nano",
    tier: "heavy",
    capabilities: { vision: true, audio: true },
  },

  // Ollama Cloud Models
  "ollama-glm-5-cloud": {
    id: "ollama-glm-5-cloud",
    provider: "ollama",
    modelName: "glm-5:cloud",
    displayName: "GLM-5 (Ollama Cloud)",
    tier: "heavy",
    capabilities: { vision: true, audio: false },
  },
  "ollama-kimi-k2.5-cloud": {
    id: "ollama-kimi-k2.5-cloud",
    provider: "ollama",
    modelName: "kimi-k2.5:cloud",
    displayName: "Kimi K2.5 (Ollama Cloud)",
    tier: "heavy",
    capabilities: { vision: true, audio: false },
  },
};

export const AUTO_MODEL_CONFIG: ModelConfig = {
  id: "auto",
  provider: "auto",
  modelName: "auto",
  displayName: "Auto",
  tier: "auto",
  capabilities: { vision: true, audio: true },
};

export const DEFAULT_MODEL = "auto"; // Default to auto model

// -- Factory --

/**
 * Returns a list of available models based on configured API keys.
 */
export function getAvailableModels(): ModelConfig[] {
  const available: ModelConfig[] = [AUTO_MODEL_CONFIG];

  // Check Groq
  if (env.GROQ_API_KEY) {
    available.push(MODEL_REGISTRY["groq-llama-3.3-70b"]!);
    available.push(MODEL_REGISTRY["groq-llama-3.1-8b"]!);
  }

  // Check Google
  if (env.GOOGLE_API_KEY) {
    available.push(MODEL_REGISTRY["gemini-2.5-flash"]!);
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

export interface Attachment {
  type: "image" | "audio" | "document" | "unknown";
  content: string;
  mimeType: string;
  name: string;
  size: number;
}

/**
 * Automatically classifies the user message and selects the most appropriate model.
 */
export async function autoSelectModel(message: string, attachments?: Attachment[]): Promise<string> {
  const models = getAvailableModels().filter(m => m.id !== "auto");

  // Requirement flags based on attachments
  let requireVision = false;
  let requireAudio = false;

  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      if (att.type === "image") requireVision = true;
      if (att.type === "audio") requireAudio = true;
    }
  }

  // Filter available models by capabilities
  let candidateModels = models;
  if (requireVision) {
    candidateModels = candidateModels.filter(m => m.capabilities.vision);
  }
  if (requireAudio) {
    candidateModels = candidateModels.filter(m => m.capabilities.audio);
  }

  // If no models match the strict capabilities, fallback to gemini (if available) or the first available
  if (candidateModels.length === 0) {
    console.warn("No models match required capabilities (vision:", requireVision, ", audio:", requireAudio, "). Falling back.");
    candidateModels = models;
  }

  // Define heavy/cheap from candidates dynamically based on tier
  const heavyCandidates = candidateModels.filter(m => m.tier === "heavy");
  const cheapCandidates = candidateModels.filter(m => m.tier === "cheap");

  // Prefer specific providers if available (e.g. groq for text, google for fallback)
  const heavyModel = heavyCandidates.find(m => m.provider === "groq")?.id
    || heavyCandidates.find(m => m.provider === "google")?.id
    || heavyCandidates[0]?.id
    || candidateModels[0]?.id;

  const cheapModel = cheapCandidates.find(m => m.provider === "groq")?.id
    || cheapCandidates.find(m => m.provider === "google")?.id
    || cheapCandidates[0]?.id
    || candidateModels[0]?.id;

  if (!heavyModel || !cheapModel) {
    throw new Error("No usable fallback models configured. Ensure at least one LLM API key is provided in env.");
  }

  // If there are attachments, always choose a heavier / multimodal model
  if (attachments && attachments.length > 0) {
    return heavyModel;
  }

  // Fast heuristic for long messages
  if (message.length > 1000) return heavyModel;

  try {
    const config = MODEL_REGISTRY[cheapModel];
    if (!config) throw new Error("Cheap model not found");

    // Create base LLM directly to avoid binding tools and full system prompt for simple classification
    let baseLlm;
    if (config.provider === "groq") {
      baseLlm = new ChatGroq({ apiKey: env.GROQ_API_KEY!, model: config.modelName, temperature: 0 });
    } else if (config.provider === "google") {
      baseLlm = new ChatGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY!, model: config.modelName, temperature: 0 });
    } else if (config.provider === "openai") {
      baseLlm = new ChatOpenAI({ apiKey: env.OPENAI_API_KEY!, model: config.modelName, temperature: 0 });
    } else if (config.provider === "ollama") {
      baseLlm = new ChatOllama({ model: config.modelName, baseUrl: env.OLLAMA_BASE_URL, temperature: 0 });
    } else {
      throw new Error("Unknown provider for cheap model");
    }

    const response = await baseLlm.invoke([
      { role: "system", content: "You are a prompt classifier. Analyze the user's prompt and output exactly one word: 'COMPLEX' if the user is asking for code generation, code review, debugging, complex math, or a detailed multi-step reasoning task. Output 'SIMPLE' if the query is a greeting, basic fact query, short conversation, or simple question. Do not output anything else." },
      { role: "user", content: message }
    ]);

    const classification = response.content?.toString().trim().toUpperCase();

    if (classification && classification.includes('COMPLEX')) {
      return heavyModel;
    }

    return cheapModel;
  } catch (err) {
    console.error("Auto model selection classification failed, falling back to heuristic", err);
    // Fallback heuristic
    const complexKeywords = ['debug', 'react', 'python', 'javascript', 'typescript', 'architecture', 'refactor', 'code', 'database', 'sql', 'algorithm'];
    const lowerMsg = message.toLowerCase();
    const isComplex = complexKeywords.some(kw => lowerMsg.includes(kw));
    return isComplex ? heavyModel : cheapModel;
  }
}

/**
 * Creates an agent instance for the requested model ID and language.
 * Falls back to DEFAULT_MODEL if the requested ID is invalid or unavailable.
 */
export function getAgent(modelId?: string, language: string = "english") {
  const resolvedModelId = modelId ?? DEFAULT_MODEL;

  if (resolvedModelId === "auto") {
    throw new Error("Cannot instantiate agent with 'auto' model. Run autoSelectModel first to get a specific model ID.");
  }

  // 1. Resolve model config
  let config = MODEL_REGISTRY[resolvedModelId];

  // Fallback if invalid ID
  if (!config) {
    console.warn(`Model ID '${resolvedModelId}' not found. Check if the model is registered and API keys are available.`);
    throw new Error(`Model configuration for '${resolvedModelId}' not found.`);
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
        baseUrl: env.OLLAMA_BASE_URL,
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

  // 3. Define the system prompt based on language
  let languageInstructions = "";
  if (language === "hinglish") {
    languageInstructions = `
- You are an Indian AI Tutor from Codebhaiya. 
- Use "Hinglish" (a natural mix of Hindi and English) for your explanations.
- Keep technical terms (like 'Array', 'Component', 'Loop') in English but explain the logic in a mix of Hindi and English to make it very easy for Indian students to understand.
- Use a friendly, mentoring tone typical of an elder brother (Bhaiya).
    `;
  } else {
    languageInstructions = `
- You are a helpful AI assistant from Codebhaiya.
- Respond in clear, professional English.
    `;
  }

  // 4. Create and return the agent
  return createAgent({
    model: llm,
    tools: [webSearchTool],
    systemPrompt: `You are a helpful AI assistant with access to web search.
Current model: ${config.displayName}

${languageInstructions}

When answering questions about current events, news, or time-sensitive information, use the web_search tool to get up-to-date information.

Guidelines:
- Always cite your sources using [1], [2], etc. format when using web search results
- Be concise but thorough in your responses
- If you're unsure about current information, use the web search tool
- Format search results clearly with proper citations`,
  });
}
