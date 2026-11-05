import { ChatGoogle } from "@langchain/google";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Chat } from "../models/chat.model.js";
import { Document } from "../models/document.model.js";
import { Message } from "../models/message.model.js";
import { deleteDocumentFromS3, uploadDocumentToS3 } from "./storage.service.js";

export interface GeneratedImage {
  buffer: Buffer;
  mimeType: string;
  text?: string;
}

export interface GenerateImageInput {
  chatId: string;
  userId: string;
  prompt: string;
  provider: string;
}

export interface GenerateImageResult {
  userMessageId: string;
  assistantMessageId: string;
  attachment: {
    type: "image";
    documentId: string;
    name: string;
    mimeType: string;
    size: number;
    content: string;
  };
  modelName: string;
}

interface ImageGenerationProvider {
  id: string;
  generate(prompt: string): Promise<GeneratedImage>;
}

const googleGeminiImageProvider: ImageGenerationProvider = {
  id: "google",
  async generate(prompt) {
    if (!env.GOOGLE_API_KEY) {
      throw new Error("Image generation is not configured. Add GOOGLE_API_KEY to the server environment.");
    }

    const model = new ChatGoogle({
      apiKey: env.GOOGLE_API_KEY,
      model: env.GOOGLE_IMAGE_MODEL,
      responseModalities: ["IMAGE", "TEXT"],
    });
    const response = await model.invoke(prompt);
    const blocks = response.contentBlocks;
    const imageBlock = blocks.find((block) =>
      (block.type === "file" || block.type === "image") &&
      "data" in block &&
      (typeof block.data === "string" || block.data instanceof Uint8Array)
    );
    const imageData = imageBlock && "data" in imageBlock
      ? imageBlock.data as string | Uint8Array
      : undefined;
    const mimeType = imageBlock && "mimeType" in imageBlock && typeof imageBlock.mimeType === "string" && imageBlock.mimeType
      ? imageBlock.mimeType.split(";")[0]!
      : "image/png";

    if (!imageData || !mimeType.startsWith("image/")) {
      throw new Error("Google did not return an image for this prompt. Try changing the prompt.");
    }

    const text = blocks
      .filter((block) => block.type === "text" || block.type === "text-plain")
      .map((block) => "text" in block && typeof block.text === "string" ? block.text : "")
      .filter(Boolean)
      .join("\n");

    return {
      buffer: typeof imageData === "string"
        ? Buffer.from(imageData, "base64")
        : Buffer.from(imageData),
      mimeType,
      ...(text ? { text } : {}),
    };
  },
};

const providers: Record<string, ImageGenerationProvider> = {
  google: googleGeminiImageProvider,
};

const ImageGenerationState = Annotation.Root({
  chatId: Annotation<string>(),
  userId: Annotation<string>(),
  prompt: Annotation<string>(),
  provider: Annotation<string>(),
  generated: Annotation<GeneratedImage | null>({
    reducer: (_current, update) => update,
    default: () => null,
  }),
  result: Annotation<GenerateImageResult | null>({
    reducer: (_current, update) => update,
    default: () => null,
  }),
});

const imageGenerationGraph = new StateGraph(ImageGenerationState)
  .addNode("generateImage", async (state) => {
    const provider = providers[state.provider];
    if (!provider) throw new Error(`Unsupported image generation provider: ${state.provider}`);
    return { generated: await provider.generate(state.prompt) };
  })
  .addNode("persistImage", async (state) => {
    if (!state.generated) throw new Error("Image generation completed without an image");

    const userObjectId = new mongoose.Types.ObjectId(state.userId);
    const chatObjectId = new mongoose.Types.ObjectId(state.chatId);
    const documentId = new mongoose.Types.ObjectId();
    const extension = state.generated.mimeType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "png";
    const filename = `generated-image-${documentId.toString()}.${extension}`;
    const s3Key = `generated-images/${state.userId}/${documentId.toString()}/${filename}`;
    const checksum = crypto.createHash("sha256").update(state.generated.buffer).digest("hex");
    let documentCreated = false;

    try {
      await uploadDocumentToS3({
        key: s3Key,
        body: state.generated.buffer,
        contentType: state.generated.mimeType,
        metadata: { documentId: documentId.toString(), userId: state.userId, checksum },
      });

      const document = await Document.create({
        _id: documentId,
        userId: userObjectId,
        chatId: chatObjectId,
        filename,
        mimeType: state.generated.mimeType,
        size: state.generated.buffer.length,
        checksum,
        s3Key,
        status: "ready",
        chunkCount: 0,
      });
      documentCreated = true;

      const attachment = {
        type: "image" as const,
        documentId: document._id.toString(),
        name: filename,
        mimeType: state.generated.mimeType,
        size: state.generated.buffer.length,
      };
      const savedMessages = await Message.create([
        { chatId: chatObjectId, userId: userObjectId, role: "user", content: state.prompt },
        {
          chatId: chatObjectId,
          userId: userObjectId,
          role: "assistant",
          content: state.generated.text ?? "Image generated.",
          modelName: env.GOOGLE_IMAGE_MODEL,
          attachments: [attachment],
        },
      ]);
      const userMessage = savedMessages[0];
      const assistantMessage = savedMessages[1];
      if (!userMessage || !assistantMessage) {
        throw new Error("Failed to save generated image messages");
      }

      await Chat.findByIdAndUpdate(chatObjectId, { updatedAt: new Date() });
      return {
        result: {
          userMessageId: userMessage._id.toString(),
          assistantMessageId: assistantMessage._id.toString(),
          attachment: {
            ...attachment,
            content: `data:${state.generated.mimeType};base64,${state.generated.buffer.toString("base64")}`,
          },
          modelName: env.GOOGLE_IMAGE_MODEL,
        },
      };
    } catch (error) {
      if (documentCreated) {
        await Document.findByIdAndDelete(documentId).catch(() => undefined);
      }
      await deleteDocumentFromS3(s3Key).catch((cleanupError) => {
        console.error("Failed to remove generated image after an error:", cleanupError);
      });
      throw error;
    }
  })
  .addEdge(START, "generateImage")
  .addEdge("generateImage", "persistImage")
  .addEdge("persistImage", END)
  .compile();

export async function runImageGenerationGraph(input: GenerateImageInput): Promise<GenerateImageResult> {
  const state = await imageGenerationGraph.invoke({ ...input, generated: null, result: null });
  if (!state.result) throw new Error("Image generation workflow completed without a result");
  return state.result;
}
