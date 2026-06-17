import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["Doctor", "Patient", "Admin"], default: "Patient" },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["private", "public"], default: "private" },
  },
  { timestamps: true }
);

groupSchema.index({ "members.user": 1 });
groupSchema.index({ createdBy: 1 });

export default mongoose.model("Group", groupSchema);
