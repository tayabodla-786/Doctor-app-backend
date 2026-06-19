import PatProfile from "../models/PatProfile.js";
import User from "../models/User.js";
import { getAuthUserId, getLegacyPatientId } from "../utils/userHelpers.js";

export const findPatientProfileForUser = async (user) => {
  const userId = getAuthUserId(user);
  const legacyPatientId = await getLegacyPatientId(user);

  let profile = await PatProfile.findOne({ user: userId });

  if (!profile && legacyPatientId) {
    profile = await PatProfile.findOne({ patient: legacyPatientId });
    if (profile && !profile.user) {
      profile.user = userId;
      await profile.save();
    }
  }

  return profile;
};

export const ensurePatientProfile = async (user) => {
  const userId = getAuthUserId(user);
  const legacyPatientId = await getLegacyPatientId(user);

  let profile = await findPatientProfileForUser(user);

  if (!profile) {
    profile = await PatProfile.create({
      user: userId,
      patient: legacyPatientId,
      phone: user.phone || null,
    });
    return profile;
  }

  if (!profile.user) {
    profile.user = userId;
    await profile.save();
  }

  if (!profile.phone && user.phone) {
    profile.phone = user.phone;
    await profile.save();
  }

  return profile;
};

const loadUserForProfile = async (user) => {
  const userId = getAuthUserId(user);
  return User.findById(userId).select(
    "name email phone profileImage isVerified role permissions"
  );
};

const formatPatientProfileResponse = (user, profileDoc) => {
  const userId = getAuthUserId(user);
  const profile = profileDoc?.toObject ? profileDoc.toObject() : profileDoc;
  const profileImage = user?.profileImage || profile?.profileImage || null;

  const userInfo = {
    id: userId,
    name: user.name,
    email: user.email,
    phone: profile?.phone || user.phone || null,
    profileImage,
    imagepath: profileImage,
    isVerified: user.isVerified,
    role: user.role,
    permissions: user.permissions,
  };

  const mergedProfile = {
    ...(profile || {}),
    name: user.name,
    email: user.email,
    phone: profile?.phone || user.phone || null,
    address: profile?.address || null,
    age: profile?.age ?? null,
    gender: profile?.gender || null,
    bloodGroup: profile?.bloodGroup || null,
    medicalNotes: profile?.medicalNotes || null,
    profileImage,
    imagepath: profileImage,
  };

  return { userInfo, profile: mergedProfile };
};

export const uploadPatientProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Profile image is required" });
    }

    const userId = getAuthUserId(req.user);
    const imageUrl = `/uploads/${req.file.filename}`;

    const dbUser = await User.findByIdAndUpdate(
      userId,
      { $set: { profileImage: imageUrl } },
      { new: true }
    ).select("name email phone profileImage isVerified role permissions");

    await ensurePatientProfile(dbUser);
    const profileDoc = await findPatientProfileForUser(dbUser);
    const { userInfo, profile } = formatPatientProfileResponse(dbUser, profileDoc);

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded",
      profileImage: imageUrl,
      patient: userInfo,
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const savePatientProfile = async (req, res) => {
  try {
    const userId = getAuthUserId(req.user);
    const legacyPatientId = await getLegacyPatientId(req.user);
    const { name, phone, address, age, gender, bloodGroup, medicalNotes } = req.body;

    let profile = await ensurePatientProfile(req.user);

    if (name !== undefined && String(name).trim()) {
      await User.updateOne({ _id: userId }, { $set: { name: String(name).trim() } });
    }

    if (phone !== undefined) profile.phone = phone;
    if (address !== undefined) profile.address = address;
    if (age !== undefined && age !== null) profile.age = age;
    if (gender !== undefined) profile.gender = gender;
    if (bloodGroup !== undefined) profile.bloodGroup = bloodGroup;
    if (medicalNotes !== undefined) profile.medicalNotes = medicalNotes;
    if (!profile.user) profile.user = userId;
    if (!profile.patient && legacyPatientId) profile.patient = legacyPatientId;
    await profile.save();

    if (phone) {
      await User.updateOne({ _id: userId }, { $set: { phone } });
    }

    const dbUser = await loadUserForProfile(req.user);
    const { userInfo, profile: mergedProfile } = formatPatientProfileResponse(
      dbUser,
      profile
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated",
      patient: userInfo,
      profile: mergedProfile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPatientProfile = async (req, res) => {
  try {
    const dbUser = await loadUserForProfile(req.user);
    const profileDoc = await ensurePatientProfile(dbUser || req.user);
    const { userInfo, profile } = formatPatientProfileResponse(
      dbUser || req.user,
      profileDoc
    );

    res.status(200).json({
      success: true,
      patient: userInfo,
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
