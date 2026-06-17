import express from "express";
import { 
  registerDoctor,
  verifyDoctorOTP,
  loginDoctor,
  forgotPasswordDoctor,
  resetPasswordDoctor 
} from "../DoctorControllers/DocAuthController.js";

const router = express.Router();



router.post("/register", registerDoctor);           
router.post("/verify-otp", verifyDoctorOTP);        
router.post("/login", loginDoctor);
router.post("/forgot-password", forgotPasswordDoctor);
router.post("/reset-password", resetPasswordDoctor);

export default router;