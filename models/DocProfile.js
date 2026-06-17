import mongoose from "mongoose";

const DocProfileSchema = new mongoose.Schema({
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DocAuth",
        required: true,
        unique: true
    },
    degree: {
        type: String,
        required: true
    },
    specialty: {
        type: String,
        required: true
    },
    experience: {
        type: String,
        required: true,
        set: value => value === undefined || value === null ? value : String(value)
    },
    hospitalName: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    licenseId: {
        type: String,
        required: true,
        unique: true
    }
}, { timestamps: true });

const DocProfile = mongoose.model("DoctorProfile", DocProfileSchema);

export default DocProfile;