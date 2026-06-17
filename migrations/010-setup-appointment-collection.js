import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import { ensureIndexes, resolveUserFromAnyId } from "../utils/migrationHelpers.js";

export const name = "010-setup-appointment-collection";

export const up = async () => {
  const appointments = await Appointment.find({});
  let migrated = 0;

  for (const appt of appointments) {
    const doctorUserId = await resolveUserFromAnyId(User, appt.doctor);
    const patientUserId = await resolveUserFromAnyId(User, appt.patient);

    if (doctorUserId && patientUserId) {
      await Appointment.updateOne(
        { _id: appt._id },
        { $set: { doctor: doctorUserId, patient: patientUserId } }
      );
      migrated++;
    }
  }

  await ensureIndexes(Appointment);
  console.log(`Appointment: migrated ${migrated} records to User relations`);
};

export const down = async () => {
  await Appointment.collection.dropIndexes();
  console.log("Appointment indexes dropped");
};
