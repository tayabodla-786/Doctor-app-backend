import Availability from "../models/Availability.js";
import mongoose from "mongoose";
import { getDayRangeFromKey, timesMatch } from "./dateHelpers.js";

export const formatAppointmentDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

export const buildAppointmentPayload = (appointment) => {
  const doc = appointment.toObject ? appointment.toObject() : appointment;
  const doctor = doc.doctor && typeof doc.doctor === "object" ? doc.doctor : null;
  const patient = doc.patient && typeof doc.patient === "object" ? doc.patient : null;

  const date = formatAppointmentDate(doc.date);
  const startTime = doc.startTime || "";
  const endTime = doc.endTime || "";
  const slotLabel =
    startTime && endTime ? `${startTime} - ${endTime}` : startTime;

  return {
    type: "appointment",
    appointmentId: doc._id?.toString(),
    status: doc.status,
    doctorId: doctor?._id?.toString() || doc.doctor?.toString(),
    doctorName: doctor?.name || "Doctor",
    doctorSpecialty: doctor?.specialty || "",
    patientId: patient?._id?.toString() || doc.patient?.toString(),
    patientName: patient?.name || "Patient",
    date,
    startTime,
    endTime,
    slotLabel,
    reason: doc.reason || "",
    created_at: doc.createdAt || new Date().toISOString(),
  };
};

export const buildNotificationCopy = (payload) => {
  const slot = payload.slotLabel || payload.startTime || "";
  const when = payload.date ? `${payload.date} • ${slot}` : slot;

  switch (payload.status) {
    case "Pending":
      if (payload.patientName && payload.doctorName) {
        return {
          title: "New appointment request",
          description: `${payload.patientName} requested ${when}`,
        };
      }
      return {
        title: "Appointment request sent",
        description: `Waiting for Dr. ${payload.doctorName} to accept ${when}`,
      };
    case "Confirmed":
      return {
        title: "Appointment confirmed",
        description: `Dr. ${payload.doctorName} confirmed your slot: ${when}`,
      };
    case "Cancelled":
      return {
        title: "Appointment declined",
        description: `Dr. ${payload.doctorName} declined the request for ${when}`,
      };
    case "Completed":
      return {
        title: "Appointment completed",
        description: `Your appointment with Dr. ${payload.doctorName} is completed`,
      };
    default:
      return {
        title: "Appointment update",
        description: when,
      };
  }
};

export async function releaseAppointmentSlot(doctorId, date, startTime, endTime) {
  if (!doctorId || !date || !startTime) return;

  const doctorObjId = mongoose.Types.ObjectId.isValid(doctorId)
    ? new mongoose.Types.ObjectId(doctorId)
    : doctorId;

  const dayRange = getDayRangeFromKey(date);
  if (!dayRange) return;

  const availability = await Availability.findOne({
    doctor: doctorObjId,
    date: { $gte: dayRange.start, $lt: dayRange.end },
  });

  if (!availability) return;

  const slot = availability.slots.find(
    (s) =>
      timesMatch(s.startTime, startTime) &&
      timesMatch(s.endTime, endTime || startTime)
  );

  if (slot) {
    slot.isBooked = false;
    slot.bookedBy = null;
    await availability.save();
  }
}
