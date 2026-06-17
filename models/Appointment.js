import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: "DocAuth", required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "PatAuth", required: true },
  date: { type: Date, required: true },
  startTime: String,
  endTime: String,
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
    default: "Pending"
  },
  reason: String
}, { timestamps: true });

export default mongoose.model("Appointment", appointmentSchema);