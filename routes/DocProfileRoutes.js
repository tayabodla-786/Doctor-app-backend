import express from "express";
import { 
  saveDoctorProfile, 
  getDoctorProfile 
} from "../DoctorControllers/DocProfileController.js";
import { loginDoctor } from "../DoctorControllers/DocAuthController.js";

import { protectDoctor, authorize } from "../middleware/authMiddleware.js";
import { PERMISSIONS } from "../constants/roles.js";

const router = express.Router();

// Authentication route alias for backward compatibility
router.post("/login", loginDoctor);

// Protected Routes (Doctor must be logged in)
router.post("/save", protectDoctor, authorize(PERMISSIONS.PROFILE_WRITE), saveDoctorProfile);
router.get("/me", protectDoctor, authorize(PERMISSIONS.PROFILE_READ), getDoctorProfile);

export default router;