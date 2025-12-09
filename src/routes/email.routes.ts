import { Router } from "express";
import { sendEmailHandler } from "../controllers/email.controller";

const router = Router();

// POST /api/email - Send image via email
router.post("/", sendEmailHandler);

export default router;

