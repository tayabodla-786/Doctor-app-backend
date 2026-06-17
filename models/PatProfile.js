import mongoose from "mongoose";

const PatProfileSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PatAuth",
    required: true,
    unique: true
  },
  phone: { type: String },
  address: { type: String },
  age: { type: Number },
  gender: { type: String },
  bloodGroup: { type: String },
  medicalNotes: { type: String }
}, { timestamps: true });

const PatProfile = mongoose.model("PatProfile", PatProfileSchema);

export default PatProfile;
