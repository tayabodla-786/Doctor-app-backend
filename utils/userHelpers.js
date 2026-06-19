import User from "../models/User.js";
import DocAuth from "../models/DocAuth.js";
import PatAuth from "../models/PatAuth.js";
import DocProfile from "../models/DocProfile.js";
import PatProfile from "../models/PatProfile.js";
import { getPermissionsForRole } from "../constants/roles.js";

export const getAuthUserId = (user) => user.id || user._id?.toString();

export const getLegacyDoctorId = async (user) => {
  if (user.legacyDoctorId) return user.legacyDoctorId.toString();
  const doc = await DocAuth.findOne({ email: user.email });
  return doc?._id?.toString() || null;
};

export const getLegacyPatientId = async (user) => {
  if (user.legacyPatientId) return user.legacyPatientId.toString();
  const pat = await PatAuth.findOne({ email: user.email });
  return pat?._id?.toString() || null;
};

export const resolveProfileUserId = async (user) => getAuthUserId(user);

export const getMe = async (req, res) => {
  try {
    const user = req.user;
    const userId = getAuthUserId(user);

    let profile = null;
    if (user.role === "Doctor") {
      profile = await DocProfile.findOne({ user: userId });
    } else if (user.role === "Patient") {
      profile = await PatProfile.findOne({ user: userId });
    }

    res.status(200).json({
      success: true,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || getPermissionsForRole(user.role),
        specialty: user.specialty || null,
        phone: user.phone || null,
        isVerified: user.isVerified,
      },
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const syncUserFromLegacy = async ({
  name,
  email,
  password,
  role,
  specialty,
  phone,
  otp,
  otpExpires,
  isVerified,
  legacyId,
  legacyField,
}) => {
  const permissions = getPermissionsForRole(role);
  const update = {
    name,
    email,
    password,
    role,
    permissions,
    specialty: specialty || null,
    phone: phone || null,
    otp,
    otpExpires,
    isVerified,
    [legacyField]: legacyId,
  };

  const user = await User.findOneAndUpdate({ email }, { $set: update }, { upsert: true, new: true });

  if (legacyField === "legacyDoctorId") {
    await DocAuth.updateOne({ _id: legacyId }, { $set: { user: user._id } });
  } else if (legacyField === "legacyPatientId") {
    await PatAuth.updateOne({ _id: legacyId }, { $set: { user: user._id } });
  }

  return user;
};

export const findUserByEmail = async (email) => {
  const user = await User.findOne({ email });
  if (user) return user;

  const doctor = await DocAuth.findOne({ email });
  if (doctor) return doctor;

  return PatAuth.findOne({ email });
};
