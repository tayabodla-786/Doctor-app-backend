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
    }}, { timestamps: true });

const PatAuth = mongoose.model("PatAuth", PatAuthSchema);  

export default PatAuth;

