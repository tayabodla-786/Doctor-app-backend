import express from "express";
import { 
  saveDoctorProfile, 
  getDoctorProfile 
} from "../DoctorControllers/DocProfileController.js";
import { loginDoctor } from "../DoctorControllers/DocAuthController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Authentication route alias for backward compatibility
router.post("/login", loginDoctor);

// Protected Routes (Doctor must be logged in)
router.post("/save", protect, saveDoctorProfile);
router.get("/me", protect, getDoctorProfile);

export default router;