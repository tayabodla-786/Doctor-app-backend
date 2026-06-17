import Message from "../models/Message.js";
import Group from "../models/Group.js";

// Send Message
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const senderModel = req.user.role === "Patient" ? "PatAuth" : "DocAuth";
    const { receiverId, receiverModel, message, groupId, isAI } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message text is required" });
    }

    if (!groupId && !isAI && (!receiverId || !receiverModel)) {
      return res.status(400).json({
        success: false,
        message: "receiverId and receiverModel are required for private messages"
      });
    }

    if (isAI && (!receiverId || !receiverModel)) {
      return res.status(400).json({
        success: false,
        message: "receiverId and receiverModel are required for AI messages"
      });
    }

    const newMessage = await Message.create({
      sender: senderId,
      senderModel,
      receiver: receiverId || null,
      receiverModel: receiverModel || null,
      groupId: groupId || null,
      chatType: isAI ? "ai" : groupId ? "group" : "private",
      isAI: Boolean(isAI),
      message
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Chat Messages
export const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    }).sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createGroup = async (req, res) => {
  try {
    const createdBy = req.user.id;
    const createdByType = req.user.role === "Patient" ? "PatAuth" : "DocAuth";
    const { name, description, members } = req.body;

    if (!name || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: "Group name and members are required" });
    }

    const normalizedMembers = members.map((member) => {
      if (typeof member === "string") {
        return { userId: member, userType: createdByType };
      }
      if (member && typeof member === "object" && member.userId) {
        return {
          userId: member.userId,
          userType: member.userType || createdByType
        };
      }
      return member;
    });

    const group = await Group.create({
      name,
      description,
      members: normalizedMembers,
      createdBy,
      createdByType,
      type: "private"
    });

    res.status(201).json({ success: true, message: "Group created successfully", group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = await Message.find({ groupId }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.role === "Patient" ? "PatAuth" : "DocAuth";

    const groupIds = await Group.find({
      members: { $elemMatch: { userId, userType } }
    }).distinct("_id");

    const messages = await Message.find({
      $or: [
        { sender: userId },
        { receiver: userId },
        { groupId: { $in: groupIds } }
      ]
    }).sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.role === "Patient" ? "PatAuth" : "DocAuth";
    const groups = await Group.find({
      members: { $elemMatch: { userId, userType } }
    });
    res.json({ success: true, groups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark as Read
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await Message.updateMany(
      { receiver: userId, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true, message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendAIMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, receiverModel, message } = req.body;

    if (!message || !receiverId || !receiverModel) {
      return res.status(400).json({ success: false, message: "AI message requires receiverId, receiverModel, and message" });
    }

    const aiMessage = await Message.create({
      sender: senderId,
      senderModel: "AI",
      receiver: receiverId,
      receiverModel,
      chatType: "ai",
      isAI: true,
      message
    });

    res.status(201).json({ success: true, message: "AI message stored", data: aiMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send voice/audio message (file upload)
export const sendVoiceMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const senderModel = req.user.role === "Patient" ? "PatAuth" : "DocAuth";
    const { receiverId, receiverModel, groupId } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio file is required" });
    }

    if (!groupId && (!receiverId || !receiverModel)) {
      return res.status(400).json({ success: false, message: "receiverId and receiverModel are required for private voice messages" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const mimeType = req.file.mimetype;

    const newMessage = await Message.create({
      sender: senderId,
      senderModel,
      receiver: receiverId || null,
      receiverModel: receiverModel || null,
      groupId: groupId || null,
      chatType: groupId ? "group" : "private",
      message: "[voice_message]",
      attachment: {
        url: fileUrl,
        mimeType,
        duration: req.body.duration ? Number(req.body.duration) : undefined
      }
    });

    res.status(201).json({ success: true, message: "Voice message sent", data: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
