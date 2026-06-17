// routes/doctorRoutes.js
import express from "express";
import { getDoctorsBySpecialty, getAllSpecialties, getAllVerifiedDoctors, getDoctorById } from "../DoctorControllers/doctorController.js";

const router = express.Router();

router.get("/list", getAllSpecialties);
router.get("/all", getAllVerifiedDoctors);
router.get("/profile/:doctorId", getDoctorById);
router.get("/:specialty", getDoctorsBySpecialty);

export default router;