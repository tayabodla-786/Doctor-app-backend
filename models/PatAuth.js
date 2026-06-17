import mongoose from "mongoose";

const PatAuthSchema = new mongoose.Schema({

    name: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,   
        default: "Patient",
    },

    resetPasswordToken: String,
    resetPasswordExpire: Date,

    otp: String,
    otpExpires: Date,
    isVerified: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const PatAuth = mongoose.model("PatAuth", PatAuthSchema);  

export default PatAuth;

