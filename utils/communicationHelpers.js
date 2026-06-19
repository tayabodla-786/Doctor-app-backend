import mongoose from "mongoose";
import User from "../models/User.js";
import DocAuth from "../models/DocAuth.js";
import PatAuth from "../models/PatAuth.js";
import { ROLES } from "../constants/roles.js";

const normalizeRole = (role) => (role || "").toString().trim().toLowerCase();

export const canContact = (senderRole, receiverRole) => {
  const sender = normalizeRole(senderRole);
  const receiver = normalizeRole(receiverRole);
  return (
    (sender === "doctor" && receiver === "patient") ||
    (sender === "patient" && receiver === "doctor")
  );
};

export const resolveUserById = async (userId) => {
  if (!userId) return null;

  const id = userId.toString();

  if (mongoose.Types.ObjectId.isValid(id)) {
    const user = await User.findById(id).select("name role isVerified email");
    if (user) {
      return {
        canonicalId: user._id.toString(),
        role: user.role,
        name: user.name,
        user,
      };
    }
  }

  if (mongoose.Types.ObjectId.isValid(id)) {
    const pat = await PatAuth.findById(id).select("name role isVerified email user");
    if (pat) {
      if (pat.user) {
        const linked = await User.findById(pat.user).select("name role isVerified email");
        if (linked) {
          return {
            canonicalId: linked._id.toString(),
            role: linked.role,
            name: linked.name,
            user: linked,
          };
        }
      }

      const byEmail = await User.findOne({ email: pat.email }).select(
        "name role isVerified email"
      );
      if (byEmail) {
        return {
          canonicalId: byEmail._id.toString(),
          role: byEmail.role,
          name: byEmail.name,
          user: byEmail,
        };
      }

      return {
        canonicalId: pat._id.toString(),
        role: pat.role || ROLES.PATIENT,
        name: pat.name,
        user: pat,
      };
    }

    const doc = await DocAuth.findById(id).select("name role isVerified email user");
    if (doc) {
      if (doc.user) {
        const linked = await User.findById(doc.user).select("name role isVerified email");
        if (linked) {
          return {
            canonicalId: linked._id.toString(),
            role: linked.role,
            name: linked.name,
            user: linked,
          };
        }
      }

      const byEmail = await User.findOne({ email: doc.email }).select(
        "name role isVerified email"
      );
      if (byEmail) {
        return {
          canonicalId: byEmail._id.toString(),
          role: byEmail.role,
          name: byEmail.name,
          user: byEmail,
        };
      }

      return {
        canonicalId: doc._id.toString(),
        role: doc.role || ROLES.DOCTOR,
        name: doc.name,
        user: doc,
      };
    }
  }

  return null;
};

export const resolveSender = async (sender) => {
  if (!sender) return null;

  const senderId = sender.id || sender._id?.toString();
  if (!senderId) return null;

  const resolved = await resolveUserById(senderId);
  if (resolved) return resolved;

  return {
    canonicalId: senderId,
    role: sender.role,
    name: sender.name,
    user: sender,
  };
};

export const validateReceiver = async (sender, receiverId) => {
  if (!receiverId) {
    return { ok: false, status: 400, message: "receiverId is required" };
  }

  const senderInfo = await resolveSender(sender);
  if (!senderInfo?.role) {
    return { ok: false, status: 403, message: "Sender role not found" };
  }

  const receiver = await resolveUserById(receiverId);
  if (!receiver) {
    return { ok: false, status: 404, message: "Receiver not found" };
  }

  if (!canContact(senderInfo.role, receiver.role)) {
    return {
      ok: false,
      status: 403,
      message: "Doctors can only contact patients and patients can only contact doctors",
    };
  }

  return {
    ok: true,
    receiver: receiver.user,
    receiverId: receiver.canonicalId,
    senderId: senderInfo.canonicalId,
  };
};

export const collectUserIds = async (userId) => {
  const ids = new Set([userId?.toString()].filter(Boolean));
  const resolved = await resolveUserById(userId);
  if (resolved) {
    ids.add(resolved.canonicalId);
  }
  return [...ids];
};
