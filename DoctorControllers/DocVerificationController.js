import mongoose from "mongoose";
import { ObjectId, GridFSBucket } from "mongodb";
import DocVerification from "../models/DocVerification.js";

export const submitDoctorVerification = async (req, res) => {
  try {
    // Authorization check
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token required or invalid"
      });
    }

    const doctorId = req.user.id;
    const files = req.files;

    console.log('Files received:', files);
    console.log('Doctor ID:', doctorId);

    // Verify user has doctor role
    if (req.user.role !== "Doctor") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only doctors can upload verification documents"
      });
    }

    if (!files || !files.degreeCertificate || !files.medicalLicense || !files.cnicProof) {
      return res.status(400).json({
        success: false,
        message: "All three documents are required",
        receivedFiles: files ? Object.keys(files) : []
      });
    }

    const verificationData = {
      doctor: doctorId,
      status: "Pending",
      submittedAt: Date.now()
    };

    // Degree Certificate
    if (files.degreeCertificate) {
      verificationData.degreeCertificate = {
        gridId: files.degreeCertificate[0].id,
        filename: files.degreeCertificate[0].filename,
        originalName: files.degreeCertificate[0].originalname,
        contentType: files.degreeCertificate[0].mimetype,
      };
    }

    // Medical License
    if (files.medicalLicense) {
      verificationData.medicalLicense = {
        gridId: files.medicalLicense[0].id,
        filename: files.medicalLicense[0].filename,
        originalName: files.medicalLicense[0].originalname,
        contentType: files.medicalLicense[0].mimetype,
      };
    }

    // CNIC / ID Proof
    if (files.cnicProof) {
      verificationData.cnicProof = {
        gridId: files.cnicProof[0].id,
        filename: files.cnicProof[0].filename,
        originalName: files.cnicProof[0].originalname,
        contentType: files.cnicProof[0].mimetype,
      };
    }

    const verification = await DocVerification.findOneAndUpdate(
      { doctor: doctorId },
      verificationData,
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      message: "Documents uploaded successfully. Waiting for admin verification.",
      verification
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDoctorVerificationStatus = async (req, res) => {
  try {
    // Authorization check
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token required or invalid"
      });
    }

    const doctorId = req.user.id;
    const verification = await DocVerification.findOne({ doctor: doctorId }).populate('doctor', 'name email');

    if (!verification) {
      return res.status(404).json({ success: false, message: "No verification data found" });
    }

    res.status(200).json({ success: true, verification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getVerificationFile = async (req, res) => {
  try {
    // Authorization check
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token required or invalid"
      });
    }

    const fileId = req.params.fileId;
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });

    if (!ObjectId.isValid(fileId)) {
      return res.status(400).json({ success: false, message: "Invalid file ID" });
    }

    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

    downloadStream.on('error', () => {
      res.status(404).json({ success: false, message: 'File not found' });
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};