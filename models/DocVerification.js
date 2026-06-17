import mongoose from "mongoose";

const docVerificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "DocAuth", default: null },
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
      default: "Pending",
    },
    remarks: String,
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

docVerificationSchema.index({ doctor: 1 }, { sparse: true });
docVerificationSchema.index({ status: 1 });

export default mongoose.model("DocVerification", docVerificationSchema);
