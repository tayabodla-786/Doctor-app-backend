// routes/availabilityRoutes.js
import express from "express";
import { 
  setAvailability, 
  getAvailableSlots,
  getDoctorSchedule,
} from "../DoctorControllers/availabilityController.js";
import { protectDoctor } from "../middleware/authMiddleware.js";

const router = express.Router();

// Doctor sets their availability slots
router.post("/set", protectDoctor, setAvailability);

// Get available slots for a specific doctor on a date (Patient side)
router.get("/slots", getAvailableSlots);

// Get doctor schedule for booking (next N days)
router.get("/schedule", getDoctorSchedule);

export default router;