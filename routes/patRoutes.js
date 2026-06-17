import express from "express";
import { 
  registerPatient,
  verifyPatientOTP,
  loginPatient,
  forgotPasswordPatient,
  resetPasswordPatient 
} from "../PatientControllers/PatAuthController.js";
import { getDoctorsBySpecialty, getAllSpecialties } from "../DoctorControllers/doctorController.js";
import { protectPatient } from "../middleware/authMiddleware.js";

const router = express.Router();

// Patient Routes
router.post("/register", registerPatient);           // Send OTP
router.post("/verify-otp", verifyPatientOTP);        // Verify OTP
router.post("/login", loginPatient);
router.post("/forgot-password", forgotPasswordPatient);
router.post("/reset-password", resetPasswordPatient);

// Patient browses doctors by specialty (requires patient login)
router.get("/specialties", protectPatient, getAllSpecialties);
router.get("/doctors/:specialty", protectPatient, getDoctorsBySpecialty);

export default router;