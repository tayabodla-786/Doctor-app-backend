import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "callerModel",
    required: true
  },
  callerModel: {
    type: String,
    required: true,
    enum: ["PatAuth", "DocAuth"]
  },
  callee: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "calleeModel",
    required: true
  },
  calleeModel: {
    type: String,
    required: true,
    enum: ["PatAuth", "DocAuth"]
  },
  callType: {
    type: String,
    enum: ["audio", "video"],
    required: true
  },
  status: {
    type: String,
    enum: ["initiated", "ringing", "accepted", "rejected", "ended"],
    default: "initiated"
  },
  roomId: {
    type: String,
    required: true
  },
  startedAt: Date,
  endedAt: Date,
  duration: Number
}, { timestamps: true });

export default mongoose.model("Call", callSchema);
