import mongoose from "mongoose";

const PatAuthSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: false },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: "Patient" },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    otp: String,
    otpExpires: Date,
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PatAuthSchema.index({ user: 1 }, { sparse: true });
PatAuthSchema.index({ isVerified: 1 });

const PatAuth = mongoose.model("PatAuth", PatAuthSchema);
export default PatAuth;
