import express from "express";
import { 
  saveDoctorProfile, 
  getDoctorProfile,
  uploadDoctorProfileImage,
} from "../DoctorControllers/DocProfileController.js";
import { loginDoctor } from "../DoctorControllers/DocAuthController.js";

import { protectDoctor, authorize } from "../middleware/authMiddleware.js";
import { PERMISSIONS } from "../constants/roles.js";
import { profileImageUpload, handleMulterError } from "../utils/gridfs.js";

const router = express.Router();

// Authentication route alias for backward compatibility
router.post("/login", loginDoctor);

// Protected Routes (Doctor must be logged in)
router.post("/save", protectDoctor, authorize(PERMISSIONS.PROFILE_WRITE), saveDoctorProfile);
router.post(
  "/avatar",
  protectDoctor,
  authorize(PERMISSIONS.PROFILE_WRITE),
  (req, res, next) => {
    profileImageUpload.single("profileImage")(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  uploadDoctorProfileImage
);
router.get("/me", protectDoctor, authorize(PERMISSIONS.PROFILE_READ), getDoctorProfile);

export default router;