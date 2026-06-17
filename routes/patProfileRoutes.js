import express from "express";
import { savePatientProfile, getPatientProfile } from "../PatientControllers/PatProfileController.js";
import { protectPatient } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/save", protectPatient, savePatientProfile);
router.get("/me", protectPatient, getPatientProfile);

export default router;
