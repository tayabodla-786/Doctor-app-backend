import PatProfile from "../models/PatProfile.js";
import { getAuthUserId, getLegacyPatientId } from "../utils/userHelpers.js";

export const savePatientProfile = async (req, res) => {
  try {
    const userId = getAuthUserId(req.user);
    const legacyPatientId = await getLegacyPatientId(req.user);
    const { phone, address, age, gender, bloodGroup, medicalNotes } = req.body;

    let profile = await PatProfile.findOne({ user: userId });

    if (!profile && legacyPatientId) {
      profile = await PatProfile.findOne({ patient: legacyPatientId });
      if (profile && !profile.user) profile.user = userId;
    }

    if (profile) {
      profile.phone = phone || profile.phone;
      profile.address = address || profile.address;
      profile.age = age === undefined || age === null ? profile.age : age;
      profile.gender = gender || profile.gender;
      profile.bloodGroup = bloodGroup || profile.bloodGroup;
      profile.medicalNotes = medicalNotes || profile.medicalNotes;
      if (!profile.user) profile.user = userId;
      await profile.save();
      return res.status(200).json({ success: true, message: "Profile updated", profile });
    }

    profile = new PatProfile({
      user: userId,
      patient: legacyPatientId,
      phone,
      address,
      age,
      gender,
      bloodGroup,
      medicalNotes,
    });
    await profile.save();
    res.status(201).json({ success: true, message: "Profile created", profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPatientProfile = async (req, res) => {
  try {
    const userId = getAuthUserId(req.user);

    const userInfo = {
      id: userId,
      name: req.user.name,
      email: req.user.email,
      isVerified: req.user.isVerified,
      role: req.user.role,
      permissions: req.user.permissions,
    };

    const profile = await PatProfile.findOne({ user: userId });
    res.status(200).json({ success: true, patient: userInfo, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
