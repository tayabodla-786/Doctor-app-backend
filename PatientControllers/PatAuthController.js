import PatAuth from "../models/PatAuth.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

// ====================== SEND OTP EMAIL ======================
const sendOTPEmail = async (email, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS are required in .env to send OTP emails');
  }

    const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const info = await transporter.sendMail({
    from: `"Doctor Patient App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verification OTP - Doctor Patient App",
    html: `
      <h2>Welcome to Doctor Patient App</h2>
      <p>Your verification code is:</p>
      <h1 style="color: #00BFA5; letter-spacing: 4px;">${otp}</h1>
      <p>This code will expire in <strong>10 minutes</strong>.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  });

  console.log(`OTP email send result for ${email}:`, {
    accepted: info.accepted,
    rejected: info.rejected,
    pending: info.pending,
    messageId: info.messageId,
    response: info.response
  });

  return info;
};

// ====================== REGISTER PATIENT (Send OTP) ======================
export const registerPatient = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    // Check if patient already exists
    const existingPatient = await PatAuth.findOne({ email });
    if (existingPatient) {
      return res.status(400).json({ success: false, message: "Patient with this email already exists" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create patient with OTP (not verified yet)
    const newPatient = new PatAuth({
      name,
      email,
      password: hashedPassword,
      role: "Patient",
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
      isVerified: false
    });

    await newPatient.save();

    // Send OTP
    const info = await sendOTPEmail(email, otp);

    if (info.rejected && info.rejected.length > 0) {
      return res.status(500).json({
        success: false,
        message: "OTP email was rejected by the SMTP server.",
        rejected: info.rejected,
        response: info.response
      });
    }

    const responseBody = {
      success: true,
      message: "OTP sent to your email. Please verify to complete registration.",
      email: email
    };

    if (process.env.SHOW_OTP === 'true' || process.env.NODE_ENV !== 'production') {
      responseBody.otp = otp;
    }

    res.status(200).json(responseBody);

  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ====================== VERIFY OTP ======================
export const verifyPatientOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpValue = otp !== undefined && otp !== null ? String(otp).trim() : "";

    console.log("🔍 Verify OTP Request:", { email, receivedOTP: otpValue });

    const patient = await PatAuth.findOne({ email });

    if (!patient) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("📊 Database Record:", {
      storedOTP: patient.otp,
      isVerified: patient.isVerified,
      expiresAt: patient.otpExpires ? new Date(patient.otpExpires) : null
    });

    if (patient.isVerified) {
      return res.status(400).json({ success: false, message: "Account already verified" });
    }

    if (!otpValue) {
      return res.status(400).json({ success: false, message: "OTP is required" });
    }

    if (!patient.otp) {
      return res.status(400).json({ success: false, message: "No OTP found. Please register again." });
    }

    if (patient.otpExpires < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please register again." });
    }

    if (patient.otp !== otpValue) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid OTP",
        hint: "Verify the OTP exactly as sent by email or use the registration response OTP"
      });
    }

    // Success
    patient.isVerified = true;
    patient.otp = undefined;
    patient.otpExpires = undefined;
    await patient.save();

    console.log("✅ Patient Verified Successfully:", email);

    res.status(200).json({
      success: true,
      message: "Account verified successfully! You can now login."
    });

  } catch (error) {
    console.error("❌ Verify OTP Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ====================== LOGIN PATIENT ======================
export const loginPatient = async (req, res) => {
  try {
    const { email, password } = req.body;

    const patient = await PatAuth.findOne({ email });
    if (!patient) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    if (!patient.isVerified) {
      return res.status(400).json({ success: false, message: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, patient.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: patient._id, role: patient.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      patient: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        role: patient.role
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Forgot Password & Reset Password (Optional for now)
export const forgotPasswordPatient = async (req, res) => {
  // You can copy from doctor if needed
  res.status(200).json({ message: "Forgot password for patient - coming soon" });
};

export const resetPasswordPatient = async (req, res) => {
  res.status(200).json({ message: "Reset password for patient - coming soon" });
};