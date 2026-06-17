import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DocAuth",
    required: true
  },
  date: { type: Date, required: true },
  slots: [{
    startTime: String,     // "09:00"
    endTime: String,       // "10:00"
    isBooked: { type: Boolean, default: false },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "PatAuth" }
  }]
}, { timestamps: true });

export default mongoose.model("Availability", availabilitySchema);