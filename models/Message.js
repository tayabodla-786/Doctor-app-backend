import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel'
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['PatAuth', 'DocAuth', 'AI']
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'receiverModel'
  },
  receiverModel: {
    type: String,
    enum: ['PatAuth', 'DocAuth']
  },
  chatType: {
    type: String,
    enum: ['private', 'group', 'ai'],
    default: 'private'
  },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  message: { type: String },
  attachment: {
    url: String,
    mimeType: String,
    duration: Number
  },
  isAI: { type: Boolean, default: false },
  read: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Message", messageSchema);