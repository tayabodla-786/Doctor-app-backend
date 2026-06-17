import { Server } from "socket.io";
import Message from "./models/Message.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("registerUser", ({ userId }) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    // Join private room
    socket.on("joinRoom", ({ userId, otherUserId }) => {
      const room = [userId, otherUserId].sort().join("_");
      socket.join(room);
    });

    socket.on("joinGroup", ({ groupId }) => {
      if (groupId) {
        socket.join(groupId);
      }
    });

    // Call signaling events
    socket.on("call:invite", (payload) => {
      const { callee, caller, callType, roomId } = payload;
      if (!callee || !caller || !callType || !roomId) return;
      io.to(`user_${callee}`).emit("incomingCall", payload);
    });

    socket.on("call:accepted", (payload) => {
      const { caller, callee, roomId } = payload;
      if (!caller || !callee || !roomId) return;
      io.to(`user_${caller}`).emit("callAccepted", payload);
    });

    socket.on("call:rejected", (payload) => {
      const { caller, callee, roomId } = payload;
      if (!caller || !callee || !roomId) return;
      io.to(`user_${caller}`).emit("callRejected", payload);
    });

    socket.on("call:ended", (payload) => {
      const { caller, callee, roomId } = payload;
      if (!caller || !callee || !roomId) return;
      io.to(`user_${caller}`).emit("callEnded", payload);
      io.to(`user_${callee}`).emit("callEnded", payload);
    });

    socket.on("webrtc:offer", (payload) => {
      const { targetId } = payload;
      if (!targetId) return;
      io.to(`user_${targetId}`).emit("webrtc:offer", payload);
    });

    socket.on("webrtc:answer", (payload) => {
      const { targetId } = payload;
      if (!targetId) return;
      io.to(`user_${targetId}`).emit("webrtc:answer", payload);
    });

    socket.on("webrtc:ice-candidate", (payload) => {
      const { targetId } = payload;
      if (!targetId) return;
      io.to(`user_${targetId}`).emit("webrtc:ice-candidate", payload);
    });

    // Send Message
    socket.on("sendMessage", async (data) => {
      const {
        sender,
        senderModel,
        receiver,
        receiverModel,
        message,
        isGroup,
        groupId,
        isAI
      } = data;

      if (!message || (!isGroup && !receiver) || (isGroup && !groupId)) {
        return;
      }

      const room = isGroup ? groupId : [sender, receiver].sort().join("_");
      const newMessage = await Message.create({
        sender,
        senderModel: senderModel || (isAI ? 'AI' : 'PatAuth'),
        receiver: isGroup ? null : receiver,
        receiverModel: isGroup ? null : receiverModel,
        groupId: isGroup ? groupId : null,
        chatType: isAI ? 'ai' : isGroup ? 'group' : 'private',
        isAI: Boolean(isAI),
        message
      });

      io.to(room).emit("receiveMessage", newMessage);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};

export { io };