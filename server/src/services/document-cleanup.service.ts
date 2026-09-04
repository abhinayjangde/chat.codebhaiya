import mongoose from "mongoose";
import { Document } from "../models/document.model.js";
import { Message } from "../models/message.model.js";
import { deleteDocumentVectors } from "./document-processing.service.js";
import { deleteDocumentFromS3 } from "./storage.service.js";

interface DocumentResource {
  _id: mongoose.Types.ObjectId;
  s3Key: string;
}

async function cleanupDocuments(
  userId: string,
  documents: DocumentResource[]
): Promise<void> {
  if (documents.length === 0) {
    return;
  }

  for (const document of documents) {
    const documentId = document._id.toString();
    await deleteDocumentVectors(userId, documentId);
    await deleteDocumentFromS3(document.s3Key);
  }

  await Document.deleteMany({
    _id: { $in: documents.map((document) => document._id) },
  });
}

export async function cleanupDocumentsForChat(
  userId: string,
  chatId: string
): Promise<void> {
  const ownerId = new mongoose.Types.ObjectId(userId);
  const chatObjectId = new mongoose.Types.ObjectId(chatId);
  const documents = await Document.find({
    userId: ownerId,
    chatId: chatObjectId,
  });

  const messages = await Message.find({
    userId: ownerId,
    chatId: chatObjectId,
  })
    .select("attachments")
    .lean();

  const referencedDocumentIds = messages.flatMap((message) =>
    (message.attachments ?? [])
      .map((attachment) => attachment.documentId)
      .filter((documentId): documentId is string =>
        typeof documentId === "string" && mongoose.isValidObjectId(documentId)
      )
  );

  if (referencedDocumentIds.length > 0) {
    const referencedDocuments = await Document.find({
      _id: { $in: referencedDocumentIds },
      userId: ownerId,
    });
    documents.push(...referencedDocuments);
  }

  const uniqueDocuments = Array.from(
    new Map(documents.map((document) => [document._id.toString(), document])).values()
  );

  await cleanupDocuments(userId, uniqueDocuments);
}

export async function cleanupDocumentsForUser(userId: string): Promise<void> {
  const documents = await Document.find({
    userId: new mongoose.Types.ObjectId(userId),
  });

  await cleanupDocuments(userId, documents);
}
