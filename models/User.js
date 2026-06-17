import mongoose from "mongoose";
import { ROLES } from "../constants/roles.js";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: Object.values(ROLES), required: true },
    permissions: { type: [String], default: [] },
    specialty: { type: String, default: null },
    phone: { type: String, default: null },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    otp: String,
    otpExpires: Date,
    isVerified: { type: Boolean, default: false },
    legacyDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: "DocAuth", default: null },
    legacyPatientId: { type: mongoose.Schema.Types.ObjectId, ref: "PatAuth", default: null },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });
UserSchema.index({ isVerified: 1 });
UserSchema.index({ legacyDoctorId: 1 }, { sparse: true });
UserSchema.index({ legacyPatientId: 1 }, { sparse: true });

const User = mongoose.model("User", UserSchema);
export default User;
