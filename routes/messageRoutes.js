// routes/messageRoutes.js
import express from "express";
import {
  sendMessage,
  getMessages,
  getAllMessages,
  markAsRead,
  createGroup,
  getGroupMessages,
  listGroups,
  sendAIMessage,
  sendVoiceMessage
} from "../PatientControllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../utils/gridfs.js";

const router = express.Router();

// Send a private or group message
router.post("/send", protect, sendMessage);
router.post("/ai", protect, sendAIMessage);
// Send voice message (multipart/form-data with file field 'file')
router.post("/voice", protect, upload.single('file'), sendVoiceMessage);

// Get messages between two users
router.get("/chat/:otherUserId", protect, getMessages);

// Get all messages for current user, including groups
router.get("/all", protect, getAllMessages);

// Groups
router.post("/group", protect, createGroup);
router.get("/group", protect, listGroups);
router.get("/group/:groupId", protect, getGroupMessages);

// Mark messages as read
router.put("/read/:chatId", protect, markAsRead);

export default router;