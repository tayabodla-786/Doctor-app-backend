import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    senderModel: { type: String, required: true, enum: ["User", "AI"] },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    receiverModel: { type: String, enum: ["User", null], default: null },
    chatType: { type: String, enum: ["private", "group", "ai"], default: "private" },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    message: { type: String },
    attachment: { url: String, mimeType: String, duration: Number },
    isAI: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ groupId: 1, createdAt: -1 });
messageSchema.index({ chatType: 1 });

export default mongoose.model("Message", messageSchema);
