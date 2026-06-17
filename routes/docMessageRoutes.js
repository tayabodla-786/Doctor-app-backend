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
import { protectDoctor } from "../middleware/authMiddleware.js";
import { upload } from "../utils/gridfs.js";

const router = express.Router();

router.post("/send", protectDoctor, sendMessage);
router.post("/ai", protectDoctor, sendAIMessage);
router.post("/voice", protectDoctor, upload.single("file"), sendVoiceMessage);

router.get("/conversations", protectDoctor, getConversations);
router.get("/contacts", protectDoctor, getContacts);
router.get("/chat/:otherUserId", protectDoctor, getMessages);
router.get("/all", protectDoctor, getAllMessages);

router.post("/group", protectDoctor, createGroup);
router.get("/group", protectDoctor, listGroups);
router.get("/group/:groupId", protectDoctor, getGroupMessages);

router.put("/read/:otherUserId", protectDoctor, markAsRead);

export default router;
