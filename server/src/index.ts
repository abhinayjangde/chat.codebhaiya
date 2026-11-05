import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import mongoose from "mongoose";

import { env } from "./config/env.js";
import db from "./lib/db.js";
import { startKeepAlive, stopKeepAlive } from "./lib/keep-alive.js";
import { HttpError } from "./lib/validation.js";
import authRoutes from "./routes/auth.route.js";
import chatRoutes from "./routes/chat.route.js";
import documentRoutes from "./routes/documents.route.js";
import imageRoutes from "./routes/images.route.js";
import uploadRoutes from "./routes/upload.route.js";
import mcpRoutes from "./routes/mcp.route.js";
import usageRoutes from "./routes/usage.route.js";
import feedbackRoutes from "./routes/feedback.route.js";
import { purgeExpiredAccounts } from "./services/auth.service.js";
import { startDocumentWorker, type DocumentWorkerHandle } from "./workers/document.worker.js";

const app = express();
app.set("trust proxy", env.TRUST_PROXY);
app.use(helmet());
const allowedOrigins = new Set(env.corsOrigins);
const isDevelopmentOrigin = (origin: string) =>
  env.NODE_ENV !== "production" &&
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || isDevelopmentOrigin(origin)) {
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
app.use("/api/images", imageRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/mcp", mcpRoutes);
app.use("/api/usage", usageRoutes);
app.use("/api/feedback", feedbackRoutes);

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

    // Run expired account cleanup on startup and schedule periodic sweeps
    void purgeExpiredAccounts().catch((error) => {
      console.error("Initial expired accounts purge failed:", error);
    });

    const purgeInterval = setInterval(() => {
      void purgeExpiredAccounts().catch((error) => {
        console.error("Periodic expired accounts purge failed:", error);
      });
    }, 24 * 60 * 60 * 1000);
    purgeInterval.unref();

    let documentWorker: DocumentWorkerHandle;

    try {
      documentWorker = await startDocumentWorker();
    } catch (error) {
      console.error("Failed to start document worker:", error);
      process.exit(1);
    }

    const server = app.listen(env.PORT, () => {
      console.log(`Server is running on port http://localhost:${env.PORT}`);

      // Start the keep-alive self-ping to prevent Render from sleeping
      if (env.RENDER_EXTERNAL_URL) {
        startKeepAlive(env.RENDER_EXTERNAL_URL);
      }
    });

    let shutdownPromise: Promise<void> | undefined;
    const shutdown = (signal: NodeJS.Signals): Promise<void> => {
      if (shutdownPromise) return shutdownPromise;

      shutdownPromise = (async () => {
        console.log(`Received ${signal}; shutting down gracefully`);
        const forceExitTimer = setTimeout(() => {
          console.error("Graceful shutdown timed out; forcing exit");
          server.closeAllConnections();
          process.exit(1);
        }, 30_000);

        clearInterval(purgeInterval);
        stopKeepAlive();
        const httpServerClose = new Promise<void>((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
        });
        server.closeIdleConnections();

        let shutdownFailed = false;
        const attempt = async (label: string, close: () => Promise<unknown>) => {
          try {
            await close();
          } catch (error) {
            shutdownFailed = true;
            console.error(`Failed to close ${label}:`, error);
          }
        };

        try {
          await Promise.all([
            attempt("HTTP server", () => httpServerClose),
            attempt("document worker", () => documentWorker.close()),
          ]);
          await attempt("MongoDB connection", () => mongoose.disconnect());
          console.log("Graceful shutdown complete");
          if (shutdownFailed) process.exitCode = 1;
        } finally {
          clearTimeout(forceExitTimer);
        }
      })();

      return shutdownPromise;
    };

    process.once("SIGINT", () => void shutdown("SIGINT"));
    process.once("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

void bootstrap();
