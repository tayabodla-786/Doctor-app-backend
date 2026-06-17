// routes/appointmentRoutes.js
import express from "express";
import { 
  bookAppointment, 
  getPatientAppointments, 
  getDoctorAppointments,
  getDoctorRequests,
  acceptAppointmentRequest,
  rejectAppointmentRequest,
  getDoctorUpcomingAppointments,
  getPatientUpcomingAppointments,
  completeAppointment,
  getDoctorFinishedAppointments,
  getPatientFinishedAppointments
} from "../PatientControllers/appointmentController.js";
import { protectPatient, protectDoctor } from "../middleware/authMiddleware.js";

const router = express.Router();

// Patient books an appointment
router.post("/book", protectPatient, bookAppointment);

// Get all appointments of logged-in patient
router.get("/my-appointments", protectPatient, getPatientAppointments);

// Get upcoming appointments for patient (confirmed only)
router.get("/my-upcoming", protectPatient, getPatientUpcomingAppointments);

// Get all appointments of logged-in doctor
router.get("/doctor-appointments", protectDoctor, getDoctorAppointments);

// Get pending appointment requests for doctor
router.get("/doctor-requests", protectDoctor, getDoctorRequests);

// Get upcoming appointments for doctor (confirmed only)
router.get("/doctor-upcoming", protectDoctor, getDoctorUpcomingAppointments);

// Get finished appointments for doctor
router.get("/doctor-finished", protectDoctor, getDoctorFinishedAppointments);

// Doctor marks appointment completed
router.put("/:appointmentId/complete", protectDoctor, completeAppointment);

// Doctor accepts appointment request
router.put("/:appointmentId/accept", protectDoctor, acceptAppointmentRequest);

// Doctor rejects appointment request
router.put("/:appointmentId/reject", protectDoctor, rejectAppointmentRequest);

// Get finished appointments for patient
router.get("/my-finished", protectPatient, getPatientFinishedAppointments);

export default router;