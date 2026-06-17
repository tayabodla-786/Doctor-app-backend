import Message from "../models/Message.js";
import { emitMessage } from "../socket.js";
import { validateReceiver } from "../utils/communicationHelpers.js";

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, message, groupId, isAI } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message text is required" });
    }

    if (!groupId && !isAI && !receiverId) {
      return res.status(400).json({
        success: false,
        message: "receiverId is required for private messages",
      });
    }

    if (!groupId && !isAI) {
      const check = await validateReceiver(req.user, receiverId);
      if (!check.ok) {
        return res.status(check.status).json({ success: false, message: check.message });
      }
    }

    if (isAI && !receiverId) {
      return res.status(400).json({
        success: false,
        message: "receiverId is required for AI messages",
      });
    }

    const newMessage = await Message.create({
      sender: senderId,
      senderModel: isAI ? "AI" : "User",
      receiver: receiverId || null,
      receiverModel: receiverId ? "User" : null,
      groupId: groupId || null,
      chatType: isAI ? "ai" : groupId ? "group" : "private",
      isAI: Boolean(isAI),
      message,
    });

    emitMessage(newMessage);

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;

    const filter = { receiver: userId, read: false };
    if (otherUserId) {
      filter.sender = otherUserId;
    }

    await Message.updateMany(filter, { $set: { read: true } });
    res.json({ success: true, message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendAIMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, message } = req.body;

    if (!message || !receiverId) {
      return res.status(400).json({ success: false, message: "AI message requires receiverId and message" });
    }

    const aiMessage = await Message.create({
      sender: senderId,
      senderModel: "AI",
      receiver: receiverId,
      receiverModel: "User",
      chatType: "ai",
      isAI: true,
      message,
    });

    res.status(201).json({ success: true, message: "AI message stored", data: aiMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendVoiceMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, groupId } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio file is required" });
    }

    if (!groupId && !receiverId) {
      return res.status(400).json({ success: false, message: "receiverId is required for private voice messages" });
    }

    if (!groupId) {
      const check = await validateReceiver(req.user, receiverId);
      if (!check.ok) {
        return res.status(check.status).json({ success: false, message: check.message });
      }
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const mimeType = req.file.mimetype;

    const newMessage = await Message.create({
      sender: senderId,
      senderModel: "User",
      receiver: receiverId || null,
      receiverModel: receiverId ? "User" : null,
      groupId: groupId || null,
      chatType: groupId ? "group" : "private",
      message: "[voice_message]",
      attachment: {
        url: fileUrl,
        mimeType,
        duration: req.body.duration ? Number(req.body.duration) : undefined,
      },
    });

    emitMessage(newMessage);

    res.status(201).json({ success: true, message: "Voice message sent", data: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
