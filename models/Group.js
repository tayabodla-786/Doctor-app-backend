import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId },
    userType: { type: String, enum: ['PatAuth', 'DocAuth'] }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdByType: { type: String, enum: ['PatAuth', 'DocAuth'], required: true },
  type: { type: String, enum: ['private', 'public'], default: 'private' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Group", groupSchema);