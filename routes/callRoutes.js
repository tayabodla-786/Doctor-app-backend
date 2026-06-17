// Shared call routes (doctor + patient) — backward compatible with Flutter app
import express from "express";
import {
  initiateCall,
  updateCallStatus,
  getCall,
  getAgoraToken,
} from "../DoctorControllers/callController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/initiate", protect, initiateCall);
router.get("/agora-token/:channelName", protect, getAgoraToken);
router.put("/:callId/status", protect, updateCallStatus);
router.get("/:callId", protect, getCall);

export default router;
