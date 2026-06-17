import mongoose from "mongoose";

const DocAuthSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,           
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,   
        default: "Doctor",
    },
    specialty: {
  type: String,
  required: true,
  enum: [
    "Cardiology", "Neurology", "Orthopedic", "Dermatology", 
    "Psychiatry", "Oncology", "Ophthalmology", "Gynecology",
    "Pediatrics", "Radiology", "Gastroenterology", "Urology",
    "Endocrinology", 
  ]
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

const DocAuth = mongoose.model("DocAuth", DocAuthSchema);  

export default DocAuth;