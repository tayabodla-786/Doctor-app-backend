import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    slots: [
      {
        startTime: String,
        endTime: String,
        isBooked: { type: Boolean, default: false },
        bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      },
    ],
  },
  { timestamps: true }
);

availabilitySchema.index({ doctor: 1, date: 1 }, { unique: true });

export default mongoose.model("Availability", availabilitySchema);
