import express from "express";
import {
  initiateCall,
  updateCallStatus,
  getCall,
  getAgoraToken,
} from "../PatientControllers/callController.js";
import { protectPatient } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/initiate", protectPatient, initiateCall);
router.get("/agora-token/:channelName", protectPatient, getAgoraToken);
router.put("/:callId/status", protectPatient, updateCallStatus);
router.get("/:callId", protectPatient, getCall);

export default router;
