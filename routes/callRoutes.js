import express from "express";
import { initiateCall, updateCallStatus, getCall } from "../PatientControllers/callController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/initiate", protect, initiateCall);
router.put("/:callId/status", protect, updateCallStatus);
router.get("/:callId", protect, getCall);

export default router;
