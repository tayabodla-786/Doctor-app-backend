import express from "express";
import { getMe } from "../utils/userHelpers.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", protect, getMe);

export default router;
