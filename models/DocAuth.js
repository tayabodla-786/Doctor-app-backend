import mongoose from "mongoose";

const DocAuthSchema = new mongoose.Schema({

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
        default: "Doctor",
    }}, { timestamps: true });

const DocAuth = mongoose.model("DocAuth", DocAuthSchema);  

export default DocAuth;

