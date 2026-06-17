// routes/doctorRoutes.js
import express from "express";
import { getDoctorsBySpecialty, getAllSpecialties } from "../DoctorControllers/doctorController.js";

const router = express.Router();

router.get("/list", getAllSpecialties);
router.get("/:specialty", getDoctorsBySpecialty);

export default router;