import DoctorProfile from "../models/DocProfile.js";
import DocAuth from "../models/DocAuth.js";
import { normalizeSpecialty } from "../utils/specialties.js";

const applyProfileFields = (profile, data) => {
  profile.degree = data.degree;
  profile.specialty = data.normalizedSpecialty;
  profile.experience = data.experienceValue;
  profile.hospitalName = data.hospitalName;
  profile.address = data.address;
  profile.licenseId = data.licenseId;
};

// Save / Update Doctor Profile
export const saveDoctorProfile = async (req, res) => {
  try {
    const { degree, specialty, experience, hospitalName, address, licenseId } = req.body;
    const doctorId = req.user.id;

    const normalizedSpecialty = normalizeSpecialty(specialty);
    if (!normalizedSpecialty) {
      return res.status(400).json({ success: false, message: "Invalid specialty" });
    }

    const doctor = await DocAuth.findById(doctorId);
    if (!doctor || !doctor.isVerified) {
      return res.status(403).json({ success: false, message: "Doctor not verified" });
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

    let profile = await DoctorProfile.findOne({ doctor: doctorId });

    if (!profile && licenseId) {
      const orphanedProfile = await DoctorProfile.findOne({ licenseId });
      if (orphanedProfile) {
        const linkedDoctor = await DocAuth.findById(orphanedProfile.doctor);
        if (!linkedDoctor) {
          orphanedProfile.doctor = doctorId;
          applyProfileFields(orphanedProfile, profileData);
          await orphanedProfile.save();
          profile = orphanedProfile;
        }
      }
    }

    if (profile) {
      applyProfileFields(profile, profileData);
      await profile.save();

      if (doctor.specialty !== normalizedSpecialty) {
        doctor.specialty = normalizedSpecialty;
        await doctor.save();
      }

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        profile,
      });
    }

    profile = new DoctorProfile({
      doctor: doctorId,
      degree,
      specialty: normalizedSpecialty,
      experience: experienceValue,
      hospitalName,
      address,
      licenseId,
    });

    await profile.save();

    if (doctor.specialty !== normalizedSpecialty) {
      doctor.specialty = normalizedSpecialty;
      await doctor.save();
    }

    res.status(201).json({
      success: true,
      message: "Profile saved successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get Doctor Profile
export const getDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const doctor = await DocAuth.findById(doctorId).select("name email specialty isVerified");
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const profile = await DoctorProfile.findOne({ doctor: doctorId });

    // Return doctor basic info and profile (may be null). Frontend can show doctor info even if profile isn't filled.
    res.status(200).json({ success: true, doctor, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
