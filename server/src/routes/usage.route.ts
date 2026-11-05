import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { getUsageSummary } from "../services/usage.service.js";

const router: express.Router = express.Router();

router.use(authenticateToken);

// Current calendar-month usage and quotas for the account.
router.get("/", async (_req, res, next) => {
  try {
    const summary = await getUsageSummary(_req.user!.userId);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

export default router;
