import User from "../models/User.js";
import DocProfile from "../models/DocProfile.js";
import {
  normalizeSpecialty,
  VALID_SPECIALTIES,
  getSpecialtySearchValues,
} from "../utils/specialties.js";

const formatDoctor = (user, profile) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  specialty: profile?.specialty || user.specialty,
  degree: profile?.degree || null,
  experience: profile?.experience || null,
  hospitalName: profile?.hospitalName || null,
  address: profile?.address || null,
  licenseId: profile?.licenseId || null,
  hasProfile: Boolean(profile),
});

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
      const user = await User.findOne({
        _id: profile.user,
        role: "Doctor",
        isVerified: true,
      }).select("name email specialty");

      if (!user) continue;

      const doctorId = user._id.toString();
      if (seenDoctorIds.has(doctorId)) continue;

      seenDoctorIds.add(doctorId);
      doctors.push(formatDoctor(user, profile));
    }

    const users = await User.find({
      role: "Doctor",
      isVerified: true,
      specialty: { $in: specialtyValues },
    }).select("name email specialty");

    for (const user of users) {
      const doctorId = user._id.toString();
      if (seenDoctorIds.has(doctorId)) continue;

      const profile = await DocProfile.findOne({ user: user._id });
      seenDoctorIds.add(doctorId);
      doctors.push(formatDoctor(user, profile));
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

const collectVerifiedDoctors = async () => {
  const doctors = [];
  const seenDoctorIds = new Set();

  const profiles = await DocProfile.find({});
  for (const profile of profiles) {
    const user = await User.findOne({
      _id: profile.user,
      role: "Doctor",
      isVerified: true,
    }).select("name email specialty");

    if (!user) continue;

    const doctorId = user._id.toString();
    if (seenDoctorIds.has(doctorId)) continue;

    seenDoctorIds.add(doctorId);
    doctors.push(formatDoctor(user, profile));
  }

  const users = await User.find({
    role: "Doctor",
    isVerified: true,
  }).select("name email specialty");

  for (const user of users) {
    const doctorId = user._id.toString();
    if (seenDoctorIds.has(doctorId)) continue;

    const profile = await DocProfile.findOne({ user: user._id });
    seenDoctorIds.add(doctorId);
    doctors.push(formatDoctor(user, profile));
  }

  return doctors;
};

export const getAllVerifiedDoctors = async (_req, res) => {
  try {
    const doctors = await collectVerifiedDoctors();
    res.status(200).json({ success: true, count: doctors.length, doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: "doctorId is required" });
    }

    const user = await User.findOne({
      _id: doctorId,
      role: "Doctor",
      isVerified: true,
    }).select("name email specialty");

    if (!user) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const profile = await DocProfile.findOne({ user: user._id });
    res.status(200).json({
      success: true,
      doctor: formatDoctor(user, profile),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
