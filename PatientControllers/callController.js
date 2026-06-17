import mongoose from "mongoose";
import Call from "../models/Call.js";
import { v4 as uuidv4 } from "uuid";

export const initiateCall = async (req, res) => {
  try {
    const caller = req.user.id;
    const callerModel = req.user.role === "Patient" ? "PatAuth" : "DocAuth";
    const { calleeId, calleeModel, callType } = req.body;

    if (!calleeId || !calleeModel || !["audio", "video"].includes(callType)) {
      return res.status(400).json({ success: false, message: "calleeId, calleeModel, and valid callType are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(calleeId)) {
      return res.status(400).json({ success: false, message: "calleeId must be a valid MongoDB ObjectId" });
    }

    const roomId = uuidv4();
    const call = await Call.create({
      caller,
      callerModel,
      callee: calleeId,
      calleeModel,
      callType,
      status: "ringing",
      roomId,
      startedAt: new Date()
    });

    res.status(201).json({ success: true, call });
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
