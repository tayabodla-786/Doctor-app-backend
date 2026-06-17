// models/DocVerification.js
import mongoose from "mongoose";

const docVerificationSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DocAuth",
    required: true
  },

  degreeCertificate: {
    gridId: mongoose.Schema.Types.ObjectId,
    filename: String,
    originalName: String,
    contentType: String,
  },

  medicalLicense: {
    gridId: mongoose.Schema.Types.ObjectId,
    filename: String,
    originalName: String,
    contentType: String,
  },

  cnicProof: {
    gridId: mongoose.Schema.Types.ObjectId,
    filename: String,
    originalName: String,
    contentType: String,
  },

  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  },

  remarks: String,
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }
}, { timestamps: true });

export default mongoose.model("DocVerification", docVerificationSchema);