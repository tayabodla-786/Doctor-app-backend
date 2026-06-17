import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    caller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    callerModel: { type: String, required: true, enum: ["User"], default: "User" },
    callee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    calleeModel: { type: String, required: true, enum: ["User"], default: "User" },
    callType: { type: String, enum: ["audio", "video"], required: true },
    status: {
      type: String,
      enum: ["initiated", "ringing", "accepted", "rejected", "ended"],
      default: "initiated",
    },
    roomId: { type: String, required: true },
    startedAt: Date,
    endedAt: Date,
    duration: Number,
  },
  { timestamps: true }
);

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ callee: 1, createdAt: -1 });
callSchema.index({ roomId: 1 }, { unique: true });

export default mongoose.model("Call", callSchema);
