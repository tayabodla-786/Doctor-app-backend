// Shared message routes (doctor + patient) — backward compatible with Flutter app
import express from "express";
import {
  sendMessage,
  markAsRead,
  sendAIMessage,
  sendVoiceMessage,
} from "../DoctorControllers/messageController.js";
import {
  getMessages,
  getAllMessages,
  getConversations,
  getContacts,
  createGroup,
  getGroupMessages,
  listGroups,
} from "../DoctorControllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../utils/gridfs.js";

const router = express.Router();

router.post("/send", protect, sendMessage);
router.post("/ai", protect, sendAIMessage);
router.post("/voice", protect, upload.single("file"), sendVoiceMessage);

router.get("/conversations", protect, getConversations);
router.get("/contacts", protect, getContacts);
router.get("/chat/:otherUserId", protect, getMessages);
router.get("/all", protect, getAllMessages);

router.post("/group", protect, createGroup);
router.get("/group", protect, listGroups);
router.get("/group/:groupId", protect, getGroupMessages);

router.put("/read/:otherUserId", protect, markAsRead);

export default router;
