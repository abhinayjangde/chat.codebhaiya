import type { Response } from "express";
import { ObjectId } from "mongodb";
import PDFDocument from "pdfkit";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { HttpError } from "../lib/validation.js";

/**
 * Generates and streams a PDF export of a chat conversation directly to an Express response.
 */
export async function exportChatAsPdf(
  chatId: string,
  userId: string,
  res: Response
): Promise<void> {
  const chat = await Chat.findOne({
    _id: new ObjectId(chatId),
    userId: new ObjectId(userId),
  });

  if (!chat) {
    throw new HttpError(404, "Chat not found");
  }

  const messages = await Message.find({
    chatId: new ObjectId(chatId),
    userId: new ObjectId(userId),
  }).sort({ createdAt: 1 });

  const doc = new PDFDocument({ margin: 50 });
  const filename = `${(chat.title || "chat-export").replace(/[^a-z0-9]/gi, "_").slice(0, 50)}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  doc.pipe(res);

  // Header
  doc.fontSize(20).text(chat.title || "Chat Export", { align: "center" });
  doc.moveDown();
  doc.fontSize(10).fillColor("grey").text(`Exported on ${new Date().toLocaleDateString()}`, { align: "center" });
  doc.moveDown(2);

  // Messages
  for (const msg of messages) {
    if (!msg.content) continue;

    let contentStr = "";
    if (typeof msg.content === "string") {
      contentStr = msg.content;
    } else {
      contentStr = JSON.stringify(msg.content);
    }

    const isUser = msg.role === "user";
    const width = 450;

    doc.font("Helvetica-Bold").fontSize(12).fillColor(isUser ? "#2563EB" : "#16A34A").text(isUser ? "You" : "AI Assistant");
    doc.font("Helvetica").fontSize(10).fillColor("gray").text(msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "");
    doc.moveDown(0.5);

    doc.font("Helvetica").fontSize(11).fillColor("black").text(contentStr, {
      width,
      align: "left",
    });

    doc.moveDown(1.5);
  }

  doc.end();
}
