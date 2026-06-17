import PatProfile from "../models/PatProfile.js";
import PatAuth from "../models/PatAuth.js";

// Save or update patient profile
export const savePatientProfile = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { phone, address, age, gender, bloodGroup, medicalNotes } = req.body;

    const patient = await PatAuth.findById(patientId).select("name email");
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    let profile = await PatProfile.findOne({ patient: patientId });
    if (profile) {
      profile.phone = phone || profile.phone;
      profile.address = address || profile.address;
      profile.age = age === undefined || age === null ? profile.age : age;
      profile.gender = gender || profile.gender;
      profile.bloodGroup = bloodGroup || profile.bloodGroup;
      profile.medicalNotes = medicalNotes || profile.medicalNotes;
      await profile.save();
      return res.status(200).json({ success: true, message: "Profile updated", profile });
    }

    profile = new PatProfile({
      patient: patientId,
      phone,
      address,
      age,
      gender,
      bloodGroup,
      medicalNotes
    });
    await profile.save();
    res.status(201).json({ success: true, message: "Profile created", profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get current patient profile
export const getPatientProfile = async (req, res) => {
  try {
    const patientId = req.user.id;
    const patient = await PatAuth.findById(patientId).select("name email isVerified");
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

    const profile = await PatProfile.findOne({ patient: patientId });
    res.status(200).json({ success: true, patient, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
