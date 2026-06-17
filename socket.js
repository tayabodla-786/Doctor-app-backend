import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "./models/Message.js";
import Call from "./models/Call.js";
import User from "./models/User.js";
import { buildAgoraToken } from "./utils/agoraToken.js";
import { canContact } from "./utils/communicationHelpers.js";

let io;

const getPrivateRoom = (userId, otherUserId) => [userId, otherUserId].sort().join("_");

export const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(`user_${userId}`).emit(event, payload);
};

export const emitMessage = (message) => {
  if (!io || !message) return;

  const payload = message.toObject ? message.toObject() : message;
  const sender = payload.sender?.toString();
  const receiver = payload.receiver?.toString();
  const groupId = payload.groupId?.toString();

  if (groupId) {
    io.to(groupId).emit("receiveMessage", payload);
    return;
  }

  if (receiver) {
    const room = getPrivateRoom(sender, receiver);
    io.to(room).emit("receiveMessage", payload);
    emitToUser(receiver, "receiveMessage", payload);
  }

  if (sender) {
    emitToUser(sender, "receiveMessage", payload);
  }
};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id?.toString();
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log("User connected:", userId, socket.id);

    socket.join(`user_${userId}`);

    socket.on("joinRoom", ({ otherUserId }) => {
      if (!otherUserId) return;
      socket.join(getPrivateRoom(userId, otherUserId));
    });

    socket.on("joinGroup", ({ groupId }) => {
      if (groupId) socket.join(groupId);
    });

    socket.on("sendMessage", async (data, callback) => {
      try {
        const { receiverId, message, groupId, isAI } = data || {};

        if (!message || (!groupId && !isAI && !receiverId)) {
          callback?.({ success: false, message: "Invalid message payload" });
          return;
        }

        if (!groupId && !isAI) {
          const receiver = await User.findById(receiverId).select("role");
          if (!receiver || !canContact(socket.userRole, receiver.role)) {
            callback?.({ success: false, message: "Cannot message this user" });
            return;
          }
        }

        const isGroup = Boolean(groupId);
        const newMessage = await Message.create({
          sender: userId,
          senderModel: isAI ? "AI" : "User",
          receiver: isGroup ? null : receiverId,
          receiverModel: isGroup ? null : "User",
          groupId: groupId || null,
          chatType: isAI ? "ai" : isGroup ? "group" : "private",
          isAI: Boolean(isAI),
          message,
        });

        emitMessage(newMessage);
        callback?.({ success: true, data: newMessage });
      } catch (error) {
        callback?.({ success: false, message: error.message });
      }
    });

    socket.on("markRead", async ({ otherUserId }) => {
      if (!otherUserId) return;
      await Message.updateMany(
        { sender: otherUserId, receiver: userId, read: false },
        { $set: { read: true } }
      );
      emitToUser(otherUserId, "messagesRead", { by: userId });
    });

    socket.on("typing", ({ receiverId, isTyping }) => {
      if (!receiverId) return;
      emitToUser(receiverId, "typing", { from: userId, isTyping: Boolean(isTyping) });
    });

    socket.on("call:invite", async (payload, callback) => {
      try {
        const { calleeId, callType } = payload || {};
        if (!calleeId || !["audio", "video"].includes(callType)) {
          callback?.({ success: false, message: "Invalid call payload" });
          return;
        }

        const callee = await User.findById(calleeId).select("role");
        if (!callee || !canContact(socket.userRole, callee.role)) {
          callback?.({ success: false, message: "Cannot call this user" });
          return;
        }

        const channelName = `call_${[userId, calleeId].sort().join("_")}_${Date.now()}`;
        const callerToken = buildAgoraToken(channelName, userId);
        const calleeToken = buildAgoraToken(channelName, calleeId);

        const call = await Call.create({
          caller: userId,
          callerModel: "User",
          callee: calleeId,
          calleeModel: "User",
          callType,
          status: "ringing",
          roomId: channelName,
          startedAt: new Date(),
        });

        const invitePayload = {
          callId: call._id.toString(),
          caller: userId,
          callee: calleeId,
          callType,
          roomId: channelName,
          agora: {
            appId: callerToken.appId,
            channelName,
            callerToken: callerToken.token,
            callerUid: callerToken.uid,
            calleeToken: calleeToken.token,
            calleeUid: calleeToken.uid,
          },
        };

        emitToUser(calleeId, "incomingCall", invitePayload);
        callback?.({ success: true, ...invitePayload });
      } catch (error) {
        callback?.({ success: false, message: error.message });
      }
    });

    socket.on("call:accept", async ({ callId, callerId }, callback) => {
      try {
        const call = await Call.findById(callId);
        if (!call) {
          callback?.({ success: false, message: "Call not found" });
          return;
        }

        call.status = "accepted";
        await call.save();

        const agora = buildAgoraToken(call.roomId, userId);
        const payload = {
          callId,
          callee: userId,
          caller: callerId,
          roomId: call.roomId,
          agora,
        };

        emitToUser(callerId, "callAccepted", payload);
        callback?.({ success: true, ...payload });
      } catch (error) {
        callback?.({ success: false, message: error.message });
      }
    });

    socket.on("call:reject", async ({ callId, callerId }) => {
      if (callId) {
        await Call.findByIdAndUpdate(callId, { status: "rejected" });
      }
      emitToUser(callerId, "callRejected", { callId, callee: userId });
    });

    socket.on("call:end", async ({ callId, otherUserId }) => {
      if (callId) {
        const call = await Call.findById(callId);
        if (call) {
          call.status = "ended";
          call.endedAt = new Date();
          if (call.startedAt) {
            call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
          }
          await call.save();
        }
      }

      if (otherUserId) {
        emitToUser(otherUserId, "callEnded", { callId, endedBy: userId });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", userId);
    });
  });
};

export { io };
