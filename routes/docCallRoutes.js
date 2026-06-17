import express from "express";
import {
  initiateCall,
  updateCallStatus,
  getCall,
  getAgoraToken,
} from "../DoctorControllers/callController.js";
import { protectDoctor } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/initiate", protectDoctor, initiateCall);
router.get("/agora-token/:channelName", protectDoctor, getAgoraToken);
router.put("/:callId/status", protectDoctor, updateCallStatus);
router.get("/:callId", protectDoctor, getCall);

export default router;
