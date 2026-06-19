import Message from "../models/Message.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { collectUserIds } from "../utils/communicationHelpers.js";

export const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;

    const myIds = await collectUserIds(userId);
    const otherIds = await collectUserIds(otherUserId);

    const messages = await Message.find({
      $or: [
        { sender: { $in: myIds }, receiver: { $in: otherIds } },
        { sender: { $in: otherIds }, receiver: { $in: myIds } },
      ],
    }).sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllMessages = async (req, res) => {
  try {
    const userId = req.user.id;

    const groupIds = await Group.find({
      "members.user": userId,
    }).distinct("_id");

    const messages = await Message.find({
      $or: [
        { sender: userId },
        { receiver: userId },
        { groupId: { $in: groupIds } },
      ],
    }).sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await Message.find({
      chatType: "private",
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const conversationMap = new Map();

    for (const msg of messages) {
      const otherUserId =
        msg.sender?.toString() === userId
          ? msg.receiver?.toString()
          : msg.sender?.toString();

      if (!otherUserId || conversationMap.has(otherUserId)) continue;

      const unreadCount = await Message.countDocuments({
        sender: otherUserId,
        receiver: userId,
        read: false,
      });

      const otherUser = await User.findById(otherUserId)
        .select("name role profileImage")
        .lean();

      conversationMap.set(otherUserId, {
        id: [userId, otherUserId].sort().join("_"),
        otherUserId,
        otherUserName: otherUser?.name || "User",
        otherUserRole: otherUser?.role || "",
        otherUserImage: otherUser?.profileImage || null,
        lastMessage: msg.message === "[voice_message]" ? "Voice message" : msg.message,
        time: msg.createdAt,
        unreadCount,
        isGroup: false,
      });
    }

    const groups = await Group.find({ "members.user": userId }).lean();
    const groupConversations = groups.map((group) => ({
      id: group._id.toString(),
      otherUserId: group._id.toString(),
      otherUserName: group.name,
      otherUserRole: "Group",
      lastMessage: group.description || "Group chat",
      time: group.updatedAt || group.createdAt,
      unreadCount: 0,
      isGroup: true,
    }));

    res.json({
      success: true,
      conversations: [...conversationMap.values(), ...groupConversations],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getContacts = async (req, res) => {
  try {
    const targetRole = req.user.role === "Doctor" ? "Patient" : "Doctor";

    const contacts = await User.find({
      role: targetRole,
      isVerified: true,
    })
      .select("name email role specialty phone profileImage")
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      contacts: contacts.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        specialty: u.specialty || null,
        phone: u.phone || null,
        profileImage: u.profileImage || null,
        image: u.profileImage || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createGroup = async (req, res) => {
  try {
    const createdBy = req.user.id;
    const { name, description, members } = req.body;

    if (!name || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: "Group name and members are required" });
    }

    const normalizedMembers = members.map((member) => {
      if (typeof member === "string") {
        return { user: member, role: req.user.role };
      }
      if (member && typeof member === "object") {
        return {
          user: member.user || member.userId,
          role: member.role || (member.userType === "DocAuth" ? "Doctor" : "Patient"),
        };
      }
      return member;
    });

    const group = await Group.create({
      name,
      description,
      members: normalizedMembers,
      createdBy,
      type: "private",
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

export const listGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const groups = await Group.find({ "members.user": userId });
    res.json({ success: true, groups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
