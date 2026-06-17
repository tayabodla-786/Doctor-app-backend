// routes/docVerificationRoutes.js
import express from "express";
import { submitDoctorVerification, getDoctorVerificationStatus, getVerificationFile } from "../DoctorControllers/DocVerificationController.js";
import { protectDoctor } from "../middleware/authMiddleware.js";
import { upload } from "../utils/gridfs.js";

const router = express.Router();

router.post("/submit-verification", 
  protectDoctor,
  upload.fields([
    { name: 'degreeCertificate', maxCount: 1 },
    { name: 'medicalLicense', maxCount: 1 },
    { name: 'cnicProof', maxCount: 1 }
  ]),
  submitDoctorVerification
);

router.get("/status", protectDoctor, getDoctorVerificationStatus);
router.get("/file/:fileId", protectDoctor, getVerificationFile);

export default router;