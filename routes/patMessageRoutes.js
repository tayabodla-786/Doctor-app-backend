import express from "express";
import {
  sendMessage,
  markAsRead,
  sendAIMessage,
  sendVoiceMessage,
} from "../PatientControllers/messageController.js";
import {
  getMessages,
  getAllMessages,
  getConversations,
  getContacts,
  createGroup,
  getGroupMessages,
  listGroups,
} from "../PatientControllers/chatController.js";
import { protectPatient } from "../middleware/authMiddleware.js";
import { upload } from "../utils/gridfs.js";

const router = express.Router();

router.post("/send", protectPatient, sendMessage);
router.post("/ai", protectPatient, sendAIMessage);
router.post("/voice", protectPatient, upload.single("file"), sendVoiceMessage);

router.get("/conversations", protectPatient, getConversations);
router.get("/contacts", protectPatient, getContacts);
router.get("/chat/:otherUserId", protectPatient, getMessages);
router.get("/all", protectPatient, getAllMessages);

router.post("/group", protectPatient, createGroup);
router.get("/group", protectPatient, listGroups);
router.get("/group/:groupId", protectPatient, getGroupMessages);

router.put("/read/:otherUserId", protectPatient, markAsRead);

export default router;
