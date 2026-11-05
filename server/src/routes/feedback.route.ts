import express, { type Router } from "express";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../lib/rate-limiter.js";
import { env } from "../config/env.js";
import { submitFeedback } from "../controllers/feedback.controller.js";

const router: Router = express.Router();

const feedbackLimiter = createRateLimiter({
  scope: "feedback-submit",
  max: Math.max(10, env.RATE_LIMIT_UPLOAD_MAX),
});

router.post("/", feedbackLimiter, optionalAuth, submitFeedback);

export default router;
