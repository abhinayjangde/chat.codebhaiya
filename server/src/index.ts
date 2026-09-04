import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import mongoose from "mongoose";

import { env } from "./config/env.js";
import db from "./lib/db.js";
import { startKeepAlive } from "./lib/keep-alive.js";
import { HttpError } from "./lib/validation.js";
import authRoutes from "./routes/auth.route.js";
import chatRoutes from "./routes/chat.route.js";
import documentRoutes from "./routes/documents.route.js";
import uploadRoutes from "./routes/upload.route.js";
import { startDocumentWorker, type DocumentWorkerHandle } from "./workers/document.worker.js";

const app = express();
const allowedOrigins = new Set(env.corsOrigins);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const statusCode = dbConnected ? 200 : 503;

  res.status(statusCode).json({
    status: dbConnected ? "ok" : "degraded",
    database: dbConnected ? "connected" : "disconnected",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/upload", uploadRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
    return;
  }

  if (error instanceof Error) {
    console.error("Unhandled server error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
    return;
  }

  console.error("Unhandled non-Error exception:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

async function bootstrap(): Promise<void> {
  try {
    await db();
    let documentWorker: DocumentWorkerHandle;

    try {
      documentWorker = await startDocumentWorker();
    } catch (error) {
      console.error("Failed to start document worker:", error);
      process.exit(1);
    }

    app.listen(env.PORT, () => {
      console.log(`Server is running on port http://localhost:${env.PORT}`);

      // Start the keep-alive self-ping to prevent Render from sleeping
      if (env.RENDER_EXTERNAL_URL) {
        startKeepAlive(env.RENDER_EXTERNAL_URL);
      }
    });

    process.once("SIGINT", () => {
      void documentWorker.close();
    });
    process.once("SIGTERM", () => {
      void documentWorker.close();
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

void bootstrap();
