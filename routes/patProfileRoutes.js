import express from "express";
import {
  savePatientProfile,
  getPatientProfile,
  uploadPatientProfileImage,
} from "../PatientControllers/PatProfileController.js";
import { protectPatient, authorize } from "../middleware/authMiddleware.js";
import { PERMISSIONS } from "../constants/roles.js";
import { handleMulterError, profileImageUpload } from "../utils/gridfs.js";

const router = express.Router();

router.post("/save", protectPatient, authorize(PERMISSIONS.PROFILE_WRITE), savePatientProfile);
router.post(
  "/avatar",
  protectPatient,
  authorize(PERMISSIONS.PROFILE_WRITE),
  (req, res, next) => {
    profileImageUpload.single("profileImage")(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  uploadPatientProfileImage
);
router.get("/me", protectPatient, authorize(PERMISSIONS.PROFILE_READ), getPatientProfile);

export default router;
