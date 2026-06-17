import DocAuth from "../models/DocAuth.js";
import DocProfile from "../models/DocProfile.js";
import {
  normalizeSpecialty,
  VALID_SPECIALTIES,
  getSpecialtySearchValues,
} from "../utils/specialties.js";

const formatDoctor = (authDoctor, profile) => ({
  id: authDoctor._id,
  name: authDoctor.name,
  email: authDoctor.email,
  specialty: profile?.specialty || authDoctor.specialty,
  degree: profile?.degree || null,
  experience: profile?.experience || null,
  hospitalName: profile?.hospitalName || null,
  address: profile?.address || null,
  licenseId: profile?.licenseId || null,
  hasProfile: Boolean(profile),
});

const findVerifiedDoctorForProfile = async (profile, specialtyValues) => {
  const linkedDoctor = await DocAuth.findOne({
    _id: profile.doctor,
    isVerified: true,
    role: "Doctor",
  }).select("name email specialty");

  if (linkedDoctor) return linkedDoctor;

  const specialtyDoctor = await DocAuth.findOne({
    specialty: { $in: specialtyValues },
    isVerified: true,
    role: "Doctor",
  }).select("name email specialty");

  if (specialtyDoctor) return specialtyDoctor;

  return DocAuth.findOne({
    isVerified: true,
    role: "Doctor",
  }).select("name email specialty");
};

export const getDoctorsBySpecialty = async (req, res) => {
  try {
    const matchedSpecialty = normalizeSpecialty(req.params.specialty);

    if (!matchedSpecialty) {
      return res.status(400).json({
        success: false,
        message: "Invalid specialty",
        specialties: VALID_SPECIALTIES,
      });
    }

    const specialtyValues = getSpecialtySearchValues(matchedSpecialty);
    const doctors = [];
    const seenDoctorIds = new Set();

    const profiles = await DocProfile.find({
      specialty: { $in: specialtyValues },
    });

    for (const profile of profiles) {
      const authDoctor = await findVerifiedDoctorForProfile(profile, specialtyValues);
      if (!authDoctor) continue;

      const doctorId = authDoctor._id.toString();
      if (seenDoctorIds.has(doctorId)) continue;

      seenDoctorIds.add(doctorId);
      doctors.push(formatDoctor(authDoctor, profile));
    }

    const authDoctors = await DocAuth.find({
      specialty: { $in: specialtyValues },
      isVerified: true,
      role: "Doctor",
    }).select("name email specialty");

    for (const authDoctor of authDoctors) {
      const doctorId = authDoctor._id.toString();
      if (seenDoctorIds.has(doctorId)) continue;

      const profile = await DocProfile.findOne({ doctor: authDoctor._id });
      seenDoctorIds.add(doctorId);
      doctors.push(formatDoctor(authDoctor, profile));
    }

    res.status(200).json({
      success: true,
      count: doctors.length,
      specialty: matchedSpecialty,
      doctors,
    });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getAllSpecialties = async (_req, res) => {
  res.status(200).json({
    success: true,
    specialties: VALID_SPECIALTIES,
  });
};
