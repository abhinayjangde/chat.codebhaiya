import express, { type Router } from "express";
import * as resumeController from "../controllers/resume.controller.js";

const router: Router = express.Router({ mergeParams: true });

router.get("/", resumeController.getResume);
router.put("/", resumeController.updateResume);
router.get("/export", resumeController.exportResume);

export default router;
