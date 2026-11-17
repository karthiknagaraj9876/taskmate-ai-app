
import express from "express";

import { authenticate } from "../middleware/authenticate.js";
import { chatWithAgentController } from "../controllers/ai.controller.js";

const router = express.Router();

// Every AI request requires a valid TaskMate JWT.
router.use(authenticate);

router.post("/chat", chatWithAgentController);

export default router;
