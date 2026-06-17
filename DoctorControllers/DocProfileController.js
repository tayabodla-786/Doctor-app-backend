import DoctorProfile from "../models/DocProfile.js";
import DocAuth from "../models/DocAuth.js";
import User from "../models/User.js";
import { normalizeSpecialty } from "../utils/specialties.js";
import { getAuthUserId, getLegacyDoctorId } from "../utils/userHelpers.js";

const applyProfileFields = (profile, data) => {
  profile.degree = data.degree;
  profile.specialty = data.normalizedSpecialty;
  profile.experience = data.experienceValue;
  profile.hospitalName = data.hospitalName;
  profile.address = data.address;
  profile.licenseId = data.licenseId;
};

export const saveDoctorProfile = async (req, res) => {
  try {
    const { degree, specialty, experience, hospitalName, address, licenseId } = req.body;
    const userId = getAuthUserId(req.user);
    const legacyDoctorId = await getLegacyDoctorId(req.user);

    const normalizedSpecialty = normalizeSpecialty(specialty);
    if (!normalizedSpecialty) {
      return res.status(400).json({ success: false, message: "Invalid specialty" });
    }

    if (!req.user.isVerified) {
      return res.status(403).json({ success: false, message: "Please verify your email before updating profile" });
    }

    const experienceValue =
      experience === undefined || experience === null ? experience : String(experience);

    const profileData = {
      degree,
      normalizedSpecialty,
      experienceValue,
      hospitalName,
      address,
      licenseId,
    };

    let profile = await DoctorProfile.findOne({ user: userId });

    if (!profile && legacyDoctorId) {
      profile = await DoctorProfile.findOne({ doctor: legacyDoctorId });
      if (profile && !profile.user) {
        profile.user = userId;
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

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        profile,
      });
    }

    profile = new DoctorProfile({
      user: userId,
      doctor: legacyDoctorId,
      degree,
      specialty: normalizedSpecialty,
      experience: experienceValue,
      hospitalName,
      address,
      licenseId,
    });

    await profile.save();
    await User.updateOne({ _id: userId }, { $set: { specialty: normalizedSpecialty } });

    res.status(201).json({
      success: true,
      message: "Profile saved successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const getDoctorProfile = async (req, res) => {
  try {
    const userId = getAuthUserId(req.user);

    const userInfo = {
      id: userId,
      name: req.user.name,
      email: req.user.email,
      specialty: req.user.specialty,
      isVerified: req.user.isVerified,
      role: req.user.role,
      permissions: req.user.permissions,
    };

    const profile = await DoctorProfile.findOne({ user: userId });
    res.status(200).json({ success: true, doctor: userInfo, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
