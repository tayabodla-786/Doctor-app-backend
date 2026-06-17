import DocAuth from "../models/DocAuth.js";
import PatAuth from "../models/PatAuth.js";
import User from "../models/User.js";
import { getPermissionsForRole } from "../constants/roles.js";

export const name = "002-sync-legacy-auth-to-users";

export const up = async () => {
  const doctors = await DocAuth.find({});
  let doctorCount = 0;

  for (const doctor of doctors) {
    const exists = await User.findOne({ email: doctor.email });
    if (exists) continue;

    await User.create({
      name: doctor.name,
      email: doctor.email,
      password: doctor.password,
      role: doctor.role || "Doctor",
      permissions: getPermissionsForRole(doctor.role || "Doctor"),
      specialty: doctor.specialty,
      otp: doctor.otp,
      otpExpires: doctor.otpExpires,
      isVerified: doctor.isVerified,
      legacyDoctorId: doctor._id,
    });
    doctorCount++;
  }

  const patients = await PatAuth.find({});
  let patientCount = 0;

  for (const patient of patients) {
    const exists = await User.findOne({ email: patient.email });
    if (exists) continue;

    await User.create({
      name: patient.name || "Patient",
      email: patient.email,
      password: patient.password,
      role: patient.role || "Patient",
      permissions: getPermissionsForRole(patient.role || "Patient"),
      otp: patient.otp,
      otpExpires: patient.otpExpires,
      isVerified: patient.isVerified,
      legacyPatientId: patient._id,
    });
    patientCount++;
  }

  console.log(`Synced ${doctorCount} doctors and ${patientCount} patients to users collection`);
};

export const down = async () => {
  await User.deleteMany({
    $or: [{ legacyDoctorId: { $ne: null } }, { legacyPatientId: { $ne: null } }],
  });
  console.log("Removed users synced from legacy auth collections");
};
