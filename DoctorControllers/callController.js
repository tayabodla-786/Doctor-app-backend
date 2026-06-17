import mongoose from "mongoose";
import User from "../models/User.js";
import Call from "../models/Call.js";
import { buildAgoraToken } from "../utils/agoraToken.js";
import { emitToUser } from "../socket.js";
import { canContact } from "../utils/communicationHelpers.js";

export const initiateCall = async (req, res) => {
  try {
    const caller = req.user.id;
    const { calleeId, callType } = req.body;

    if (!calleeId || !["audio", "video"].includes(callType)) {
      return res.status(400).json({ success: false, message: "calleeId and valid callType are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(calleeId)) {
      return res.status(400).json({ success: false, message: "calleeId must be a valid MongoDB ObjectId" });
    }

    const callee = await User.findById(calleeId).select("role");
    if (!callee) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!canContact(req.user.role, callee.role)) {
      return res.status(403).json({
        success: false,
        message: "Doctors can only call patients and patients can only call doctors",
      });
    }

    const channelName = `call_${[caller, calleeId].sort().join("_")}_${Date.now()}`;
    const callerAgora = buildAgoraToken(channelName, caller);
    const calleeAgora = buildAgoraToken(channelName, calleeId);

    const call = await Call.create({
      caller,
      callerModel: "User",
      callee: calleeId,
      calleeModel: "User",
      callType,
      status: "ringing",
      roomId: channelName,
      startedAt: new Date(),
    });

    const payload = {
      callId: call._id.toString(),
      caller,
      callee: calleeId,
      callType,
      roomId: channelName,
      agora: {
        appId: callerAgora.appId,
        channelName,
        callerToken: callerAgora.token,
        callerUid: callerAgora.uid,
        calleeToken: calleeAgora.token,
        calleeUid: calleeAgora.uid,
      },
    };

    emitToUser(calleeId, "incomingCall", payload);

    res.status(201).json({ success: true, call, ...payload });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCallStatus = async (req, res) => {
  try {
    const { callId } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected", "ended", "ringing"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid call status" });
    }

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ success: false, message: "Call not found" });
    }

    call.status = status;
    if (status === "ended") {
      call.endedAt = new Date();
      call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
    }

    await call.save();
    res.json({ success: true, call });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAgoraToken = async (req, res) => {
  try {
    const { channelName } = req.params;
    if (!channelName) {
      return res.status(400).json({ success: false, message: "channelName is required" });
    }

    const agora = buildAgoraToken(channelName, req.user.id);
    res.json({ success: true, ...agora });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCall = async (req, res) => {
  try {
    const call = await Call.findById(req.params.callId);
    if (!call) {
      return res.status(404).json({ success: false, message: "Call not found" });
    }
    res.json({ success: true, call });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
