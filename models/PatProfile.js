import mongoose from "mongoose";

const PatProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "PatAuth", default: null },
    phone: { type: String },
    address: { type: String },
    age: { type: Number },
    gender: { type: String },
    bloodGroup: { type: String },
    medicalNotes: { type: String },
  },
  { timestamps: true }
);

PatProfileSchema.index({ patient: 1 }, { sparse: true });

const PatProfile = mongoose.model("PatProfile", PatProfileSchema);
export default PatProfile;
