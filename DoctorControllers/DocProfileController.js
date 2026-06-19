import DoctorProfile from "../models/DocProfile.js";
import DocAuth from "../models/DocAuth.js";
import User from "../models/User.js";
import { normalizeSpecialty } from "../utils/specialties.js";
import { getAuthUserId, getLegacyDoctorId } from "../utils/userHelpers.js";

const applyProfileFields = (profile, data) => {
  if (data.degree !== undefined && data.degree !== null && data.degree !== "") {
    profile.degree = data.degree;
  }
  if (data.normalizedSpecialty) {
    profile.specialty = data.normalizedSpecialty;
  }
  if (data.experienceValue !== undefined && data.experienceValue !== null && data.experienceValue !== "") {
    profile.experience = data.experienceValue;
  }
  if (data.hospitalName !== undefined && data.hospitalName !== null && data.hospitalName !== "") {
    profile.hospitalName = data.hospitalName;
  }
  if (data.address !== undefined && data.address !== null && data.address !== "") {
    profile.address = data.address;
  }
  if (data.licenseId !== undefined && data.licenseId !== null && data.licenseId !== "") {
    profile.licenseId = data.licenseId;
  }
};

export const findDoctorProfileForUser = async (user) => {
  const userId = getAuthUserId(user);
  const legacyDoctorId = await getLegacyDoctorId(user);

  let profile = await DoctorProfile.findOne({ user: userId });

  if (!profile && legacyDoctorId) {
    profile = await DoctorProfile.findOne({ doctor: legacyDoctorId });
    if (profile && !profile.user) {
      profile.user = userId;
      await profile.save();
    }
  }

  return profile;
};

const formatDoctorProfileResponse = (user, profileDoc) => {
  const userId = getAuthUserId(user);
  const profile = profileDoc?.toObject ? profileDoc.toObject() : profileDoc;
  const profileImage = user?.profileImage || null;

  const userInfo = {
    id: userId,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    specialty: profile?.specialty || user.specialty || null,
    profileImage,
    imagepath: profileImage,
    isVerified: user.isVerified,
    role: user.role,
    permissions: user.permissions,
  };

  const mergedProfile = profile
    ? {
        ...profile,
        degree: profile.degree,
        specialty: profile.specialty,
        experience: profile.experience,
        hospitalName: profile.hospitalName,
        address: profile.address,
        licenseId: profile.licenseId,
        profileImage,
        imagepath: profileImage,
      }
    : profileImage
      ? { profileImage, imagepath: profileImage }
      : null;

  return { userInfo, profile: mergedProfile };
};

const loadUserForProfile = async (user) => {
  const userId = getAuthUserId(user);
  return User.findById(userId).select(
    "name email phone specialty profileImage isVerified role permissions"
  );
};

export const uploadDoctorProfileImage = async (req, res) => {
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
    ).select("name email phone specialty profileImage isVerified role permissions");

    const profileDoc = await findDoctorProfileForUser(dbUser);
    const { userInfo, profile } = formatDoctorProfileResponse(dbUser, profileDoc);

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded",
      profileImage: imageUrl,
      doctor: userInfo,
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const saveDoctorProfile = async (req, res) => {
  try {
    const { degree, specialty, experience, hospitalName, address, licenseId } = req.body;
    const userId = getAuthUserId(req.user);
    const legacyDoctorId = await getLegacyDoctorId(req.user);

    let profile = await findDoctorProfileForUser(req.user);
    const existingSpecialty = profile?.specialty || req.user.specialty;
    const specialtyInput = specialty || existingSpecialty;
    const normalizedSpecialty = normalizeSpecialty(specialtyInput);

    if (!normalizedSpecialty) {
      return res.status(400).json({ success: false, message: "Invalid specialty" });
    }

    if (!req.user.isVerified) {
      return res.status(403).json({ success: false, message: "Please verify your email before updating profile" });
    }

    const experienceValue =
      experience === undefined || experience === null || experience === ""
        ? profile?.experience
        : String(experience);

    const profileData = {
      degree: degree ?? profile?.degree,
      normalizedSpecialty,
      experienceValue,
      hospitalName: hospitalName ?? profile?.hospitalName,
      address: address ?? profile?.address,
      licenseId: licenseId ?? profile?.licenseId,
    };

    if (!profile) {
      if (
        !profileData.degree ||
        !profileData.hospitalName ||
        !profileData.address ||
        !profileData.licenseId
      ) {
        return res.status(400).json({
          success: false,
          message: "Complete all profile fields before saving",
        });
      }
    }

    if (!profile && licenseId) {
      const orphanedProfile = await DoctorProfile.findOne({ licenseId });
      if (orphanedProfile && !orphanedProfile.user) {
        orphanedProfile.user = userId;
        orphanedProfile.doctor = legacyDoctorId;
        applyProfileFields(orphanedProfile, profileData);
        await orphanedProfile.save();
        profile = orphanedProfile;
      }
    }

    if (profile) {
      applyProfileFields(profile, profileData);
      if (!profile.user) profile.user = userId;
      if (!profile.doctor && legacyDoctorId) profile.doctor = legacyDoctorId;
      await profile.save();

      await User.updateOne({ _id: userId }, { $set: { specialty: normalizedSpecialty } });
      if (legacyDoctorId) {
        await DocAuth.updateOne({ _id: legacyDoctorId }, { $set: { specialty: normalizedSpecialty } });
      }

      const dbUser = await loadUserForProfile(req.user);
      const { userInfo, profile: mergedProfile } = formatDoctorProfileResponse(
        dbUser,
        profile
      );

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        doctor: userInfo,
        profile: mergedProfile,
      });
    }

    profile = new DoctorProfile({
      user: userId,
      doctor: legacyDoctorId,
      degree: profileData.degree,
      specialty: normalizedSpecialty,
      experience: profileData.experienceValue,
      hospitalName: profileData.hospitalName,
      address: profileData.address,
      licenseId: profileData.licenseId,
    });

    await profile.save();
    await User.updateOne({ _id: userId }, { $set: { specialty: normalizedSpecialty } });

    const dbUser = await loadUserForProfile(req.user);
    const { userInfo, profile: mergedProfile } = formatDoctorProfileResponse(
      dbUser,
      profile
    );

    res.status(201).json({
      success: true,
      message: "Profile saved successfully",
      doctor: userInfo,
      profile: mergedProfile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const getDoctorProfile = async (req, res) => {
  try {
    const dbUser = await loadUserForProfile(req.user);
    const profileDoc = await findDoctorProfileForUser(dbUser || req.user);
    const { userInfo, profile } = formatDoctorProfileResponse(dbUser || req.user, profileDoc);

    res.status(200).json({
      success: true,
      doctor: userInfo,
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
