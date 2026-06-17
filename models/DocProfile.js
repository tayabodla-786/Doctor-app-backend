import mongoose from "mongoose";

const DocProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "DocAuth", default: null },
    degree: { type: String, required: true },
    specialty: { type: String, required: true },
    experience: {
      type: String,
      required: true,
      set: (value) => (value === undefined || value === null ? value : String(value)),
    },
    hospitalName: { type: String, required: true },
    address: { type: String, required: true },
    licenseId: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

DocProfileSchema.index({ doctor: 1 }, { sparse: true });
DocProfileSchema.index({ specialty: 1 });

const DocProfile = mongoose.model("DoctorProfile", DocProfileSchema);
export default DocProfile;
