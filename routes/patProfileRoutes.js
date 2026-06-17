import express from "express";
import { savePatientProfile, getPatientProfile } from "../PatientControllers/PatProfileController.js";
import { protectPatient, authorize } from "../middleware/authMiddleware.js";
import { PERMISSIONS } from "../constants/roles.js";

const router = express.Router();

router.post("/save", protectPatient, authorize(PERMISSIONS.PROFILE_WRITE), savePatientProfile);
router.get("/me", protectPatient, authorize(PERMISSIONS.PROFILE_READ), getPatientProfile);

export default router;
