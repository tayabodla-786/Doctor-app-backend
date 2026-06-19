import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Availability from "../models/Availability.js";
import {
  buildAppointmentPayload,
  releaseAppointmentSlot,
} from "../utils/appointmentHelpers.js";
import { emitToUser } from "../socket.js";
import {
  getDayRangeFromKey,
  normalizeTime,
  timesMatch,
} from "../utils/dateHelpers.js";

const notifyAppointmentParties = (appointmentDoc) => {
  const payload = buildAppointmentPayload(appointmentDoc);
  const slot = payload.slotLabel || payload.startTime || "";
  const when = payload.date ? `${payload.date} • ${slot}` : slot;

  if (payload.doctorId) {
    let title = "Appointment update";
    let description = when;

    if (payload.status === "Pending") {
      title = "New appointment request";
      description = `${payload.patientName} requested ${when}`;
    } else if (payload.status === "Confirmed") {
      title = "Appointment confirmed";
      description = `You confirmed ${payload.patientName} for ${when}`;
    } else if (payload.status === "Cancelled") {
      title = "Appointment declined";
      description = `You declined ${payload.patientName}'s request for ${when}`;
    }

    emitToUser(payload.doctorId, "appointment:update", {
      ...payload,
      title,
      description,
      is_read: false,
    });
  }

  if (payload.patientId) {
    let title = "Appointment update";
    let description = when;

    if (payload.status === "Pending") {
      title = "Request sent";
      description = `Waiting for Dr. ${payload.doctorName} to accept ${when}`;
    } else if (payload.status === "Confirmed") {
      title = "Appointment confirmed";
      description = `Dr. ${payload.doctorName} confirmed your slot: ${when}`;
    } else if (payload.status === "Cancelled") {
      title = "Appointment declined";
      description = `Dr. ${payload.doctorName} declined your request for ${when}`;
    }

    emitToUser(payload.patientId, "appointment:update", {
      ...payload,
      title,
      description,
      is_read: false,
    });
  }
};

// Patient books an appointment
export const bookAppointment = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { doctorId, date, startTime, endTime, reason } = req.body;

    if (!doctorId || !date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: "Invalid doctorId" });
    }

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patientId" });
    }

    const doctorObjId = new mongoose.Types.ObjectId(doctorId);
    const patientObjId = new mongoose.Types.ObjectId(patientId);

    const dayRange = getDayRangeFromKey(date);
    if (!dayRange) {
      return res.status(400).json({ success: false, message: "Invalid date" });
    }

    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime || startTime);

    const availability = await Availability.findOne({
      doctor: doctorObjId,
      date: { $gte: dayRange.start, $lt: dayRange.end },
    });

    if (!availability) {
      return res.status(400).json({
        success: false,
        message: "No availability found for this date",
      });
    }

    const slot = availability.slots.find(
      (s) =>
        timesMatch(s.startTime, normalizedStart) &&
        timesMatch(s.endTime, normalizedEnd) &&
        !s.isBooked
    );

    if (!slot) {
      return res.status(400).json({
        success: false,
        message: "This slot is no longer available",
      });
    }

    // Create Appointment
    const appointment = await Appointment.create({
      doctor: doctorObjId,
      patient: patientObjId,
      date: dayRange.start,
      startTime: normalizedStart,
      endTime: normalizedEnd,
      reason: reason || "General Consultation",
    });

    // Mark slot as booked
    slot.isBooked = true;
    slot.bookedBy = patientObjId;
    await availability.save();

    const populated = await Appointment.findById(appointment._id)
      .populate("doctor", "name specialty hospitalName profileImage")
      .populate("patient", "name email phone profileImage");

    notifyAppointmentParties(populated);

    res.status(201).json({
      success: true,
      message: "Appointment request sent to doctor",
      appointment: populated,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get patient's appointments
export const getPatientAppointments = async (req, res) => {
  try {
    const patientId = req.user.id;

    const appointments = await Appointment.find({ patient: patientId })
      .populate("doctor", "name specialty hospitalName profileImage")
      .sort({ date: -1 });

    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get doctor's appointments
export const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const appointments = await Appointment.find({ doctor: doctorId })
      .populate("patient", "name email profileImage")
      .sort({ date: -1 });

    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get pending appointment requests for doctor
export const getDoctorRequests = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const requests = await Appointment.find({ 
      doctor: doctorId, 
      status: "Pending" 
    })
      .populate("patient", "name email phone profileImage")
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Doctor accepts appointment request
export const acceptAppointmentRequest = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const doctorId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: "Invalid appointmentId" });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (appointment.doctor.toString() !== doctorId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (appointment.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Only pending appointments can be accepted" });
    }

    appointment.status = "Confirmed";
    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate("doctor", "name specialty hospitalName profileImage")
      .populate("patient", "name email phone profileImage");

    notifyAppointmentParties(populated);

    res.json({ success: true, message: "Appointment accepted", appointment: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Doctor rejects appointment request
export const rejectAppointmentRequest = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const doctorId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: "Invalid appointmentId" });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (appointment.doctor.toString() !== doctorId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (appointment.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Only pending appointments can be rejected" });
    }

    appointment.status = "Cancelled";
    await appointment.save();

    await releaseAppointmentSlot(
      appointment.doctor,
      appointment.date,
      appointment.startTime,
      appointment.endTime
    );

    const populated = await Appointment.findById(appointment._id)
      .populate("doctor", "name specialty hospitalName profileImage")
      .populate("patient", "name email phone profileImage");

    notifyAppointmentParties(populated);

    res.json({ success: true, message: "Appointment rejected", appointment: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get upcoming appointments (confirmed) for doctor
export const getDoctorUpcomingAppointments = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const now = new Date();
    // find all confirmed appointments from start of today
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const appointmentsAll = await Appointment.find({ 
      doctor: doctorId, 
      status: "Confirmed",
      date: { $gte: startOfDay }
    })
      .populate("patient", "name email phone profileImage")
      .sort({ date: 1, startTime: 1 });

    // filter only truly future appointments (combine date + startTime)
    const futureAppointments = appointmentsAll.filter(a => {
      const apptDate = new Date(a.date);
      const [h, m] = (a.startTime || "00:00").split(":");
      apptDate.setHours(Number(h), Number(m), 0, 0);
      return apptDate >= now;
    });

    const nextAppointment = futureAppointments.length ? futureAppointments[0] : null;
    const upcoming = futureAppointments.filter(a => !nextAppointment || a._id.toString() !== nextAppointment._id.toString());

    res.json({ success: true, nextAppointment, upcoming });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get upcoming appointments (confirmed) for patient
export const getPatientUpcomingAppointments = async (req, res) => {
  try {
    const patientId = req.user.id;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const appointmentsAll = await Appointment.find({ 
      patient: patientId, 
      status: "Confirmed",
      date: { $gte: startOfDay }
    })
      .populate("doctor", "name specialty hospitalName email profileImage")
      .sort({ date: 1, startTime: 1 });

    const futureAppointments = appointmentsAll.filter(a => {
      const apptDate = new Date(a.date);
      const [h, m] = (a.startTime || "00:00").split(":");
      apptDate.setHours(Number(h), Number(m), 0, 0);
      return apptDate >= now;
    });

    const nextAppointment = futureAppointments.length ? futureAppointments[0] : null;
    const upcoming = futureAppointments.filter(a => !nextAppointment || a._id.toString() !== nextAppointment._id.toString());

    res.json({ success: true, nextAppointment, upcoming });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Doctor marks appointment as completed
export const completeAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const doctorId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: "Invalid appointmentId" });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (appointment.doctor.toString() !== doctorId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    appointment.status = "Completed";
    await appointment.save();

    res.json({ success: true, message: "Appointment marked as completed", appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get finished (completed) appointments for doctor
export const getDoctorFinishedAppointments = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const now = new Date();

    const appointmentsAll = await Appointment.find({ doctor: doctorId, status: { $in: ["Confirmed", "Completed"] } })
      .populate("patient", "name email phone profileImage")
      .sort({ date: -1 });

    // include appointments explicitly Completed OR confirmed appointments whose end datetime is in the past
    const finished = appointmentsAll.filter(a => {
      if (a.status === "Completed") return true;
      const apptDate = new Date(a.date);
      const [h, m] = (a.endTime || "00:00").split(":");
      apptDate.setHours(Number(h), Number(m), 0, 0);
      return apptDate < now;
    });

    res.json({ success: true, appointments: finished });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get finished (completed) appointments for patient
export const getPatientFinishedAppointments = async (req, res) => {
  try {
    const patientId = req.user.id;
    const now = new Date();

    const appointmentsAll = await Appointment.find({ patient: patientId, status: { $in: ["Confirmed", "Completed"] } })
      .populate("doctor", "name specialty hospitalName email profileImage")
      .sort({ date: -1 });

    const finished = appointmentsAll.filter(a => {
      if (a.status === "Completed") return true;
      const apptDate = new Date(a.date);
      const [h, m] = (a.endTime || "00:00").split(":");
      apptDate.setHours(Number(h), Number(m), 0, 0);
      return apptDate < now;
    });

    res.json({ success: true, appointments: finished });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};