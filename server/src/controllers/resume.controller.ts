import type { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { Resume } from "../models/resume.model.js";
import {
  exportFormatQuerySchema,
  updateResumeBodySchema,
} from "../schemas/resume.schema.js";
import { chatIdParamSchema, parseBody, HttpError } from "../lib/validation.js";
import {
  generateResumeDocx,
  generateResumeLatex,
  generateResumePdf,
  generateResumeTxt,
} from "../services/resume-export.service.js";

function getCleanFilename(candidateName?: string, defaultTitle?: string): string {
  const base = (candidateName || defaultTitle || "Professional").trim();
  const cleaned = base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  return `${cleaned}_Resume`;
}

export async function getResume(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawChatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
    const chatId = parseBody(chatIdParamSchema, rawChatId);
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const resume = await Resume.findOne({
      chatId: new ObjectId(chatId),
      userId: new ObjectId(userId),
    }).lean();

    res.status(200).json({
      success: true,
      data: { resume: resume || null },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateResume(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawChatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
    const chatId = parseBody(chatIdParamSchema, rawChatId);
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const { title, template, targetRole, targetCompany, data } = parseBody(
      updateResumeBodySchema,
      req.body
    );

    const updated = await Resume.findOneAndUpdate(
      {
        chatId: new ObjectId(chatId),
        userId: new ObjectId(userId),
      },
      {
        $set: {
          ...(title ? { title } : {}),
          ...(template ? { template } : {}),
          ...(targetRole !== undefined ? { targetRole } : {}),
          ...(targetCompany !== undefined ? { targetCompany } : {}),
          data,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          chatId: new ObjectId(chatId),
          userId: new ObjectId(userId),
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    ).lean();

    res.status(200).json({
      success: true,
      data: { resume: updated },
    });
  } catch (error) {
    next(error);
  }
}

export async function exportResume(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawChatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
    const chatId = parseBody(chatIdParamSchema, rawChatId);
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const { format } = parseBody(exportFormatQuerySchema, req.query);

    const resume = await Resume.findOne({
      chatId: new ObjectId(chatId),
      userId: new ObjectId(userId),
    }).lean();

    if (!resume) {
      throw new HttpError(404, "No resume found for this chat session");
    }

    const candidateName = resume.data?.personalInfo?.fullName;
    const filenameBase = getCleanFilename(candidateName, resume.title);

    switch (format) {
      case "docx": {
        const docxBuffer = await generateResumeDocx(resume as any);
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filenameBase}.docx"`
        );
        res.status(200).send(docxBuffer);
        return;
      }

      case "pdf": {
        const pdfBuffer = await generateResumePdf(resume as any);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filenameBase}.pdf"`
        );
        res.status(200).send(pdfBuffer);
        return;
      }

      case "txt": {
        const txtContent = generateResumeTxt(resume as any);
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filenameBase}.txt"`
        );
        res.status(200).send(txtContent);
        return;
      }

      case "latex": {
        const latexContent = generateResumeLatex(resume as any);
        res.setHeader("Content-Type", "application/x-latex; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filenameBase}.tex"`
        );
        res.status(200).send(latexContent);
        return;
      }

      default:
        throw new HttpError(400, `Unsupported export format: ${format}`);
    }
  } catch (error) {
    next(error);
  }
}
