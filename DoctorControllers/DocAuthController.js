import DocAuth from "../models/DocAuth.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { normalizeSpecialty } from "../utils/specialties.js";
import { syncUserFromLegacy } from "../utils/userHelpers.js";
import { getPermissionsForRole } from "../constants/roles.js";




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

  await transporter.sendMail({
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
};

// ====================== REGISTER DOCTOR (Send OTP) ======================
export const registerDoctor = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, specialty } = req.body;

    if (!name || !email || !password || !confirmPassword || !specialty) {
      return res.status(400).json({ success: false, message: "All fields including specialty are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    const normalizedSpecialty = normalizeSpecialty(specialty);
    if (!normalizedSpecialty) {
      return res.status(400).json({ success: false, message: "Invalid specialty" });
    }

    // Check if user already exists
    const existingDoctor = await DocAuth.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ success: false, message: "Doctor with this email already exists" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create doctor with OTP (not verified yet)
    const newDoctor = new DocAuth({
      name,
      email,
      password: hashedPassword,
      role: "Doctor",
      specialty: normalizedSpecialty,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
      isVerified: false
    });

    await newDoctor.save();

    await syncUserFromLegacy({
      name,
      email,
      password: hashedPassword,
      role: "Doctor",
      specialty: normalizedSpecialty,
      otp,
      otpExpires: newDoctor.otpExpires,
      isVerified: false,
      legacyId: newDoctor._id,
      legacyField: "legacyDoctorId",
    });

    // Send OTP to email
    try {
      await sendOTPEmail(email, otp);
    } catch (mailError) {
      console.error('Doctor OTP email failed:', mailError.message);
      if (process.env.SHOW_OTP === 'true' || process.env.NODE_ENV !== 'production') {
        return res.status(200).json({
          success: true,
          message: 'OTP generated (email not sent). Use OTP below in development.',
          email,
          otp,
        });
      }
      await DocAuth.deleteOne({ email });
      await User.deleteOne({ email });
      return res.status(500).json({
        success: false,
        message: 'Could not send OTP email. Check EMAIL_USER and EMAIL_PASS in .env',
      });
    }

    const payload = {
      success: true,
      message: 'OTP sent to your email. Please verify to complete registration.',
      email,
    };

    if (process.env.SHOW_OTP === 'true' || process.env.NODE_ENV !== 'production') {
      payload.otp = otp;
    }

    res.status(200).json(payload);

  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ====================== VERIFY OTP ======================
export const verifyDoctorOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const emailValue = email?.toString().trim().toLowerCase();
    const otpValue = otp !== undefined && otp !== null ? String(otp).trim() : '';

    if (!emailValue || !otpValue) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const doctor = await DocAuth.findOne({ email: emailValue });

    if (!doctor) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (doctor.isVerified) {
      return res.status(400).json({ success: false, message: "Account already verified" });
    }

    if (String(doctor.otp) !== otpValue || doctor.otpExpires < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Verify the account
    doctor.isVerified = true;
    doctor.otp = undefined;
    doctor.otpExpires = undefined;
    await doctor.save();

    await User.findOneAndUpdate(
      { email },
      { $set: { isVerified: true, otp: undefined, otpExpires: undefined } }
    );

    res.status(200).json({
      success: true,
      message: "Account verified successfully! You can now login."
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ====================== LOGIN DOCTOR ======================
export const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    const doctor = await DocAuth.findOne({ email });
    if (!doctor) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    if (!doctor.isVerified) {
      return res.status(400).json({ success: false, message: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const user = await User.findOne({ email: doctor.email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Account sync error. Please contact support.",
      });
    }

    const tokenId = user._id;
    const permissions = getPermissionsForRole(doctor.role);

    const token = jwt.sign(
      { id: tokenId, role: doctor.role, permissions },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      doctor: {
        id: tokenId,
        name: doctor.name,
        email: doctor.email,
        role: doctor.role,
        specialty: doctor.specialty,
        permissions,
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Forgot Password 
export const forgotPasswordDoctor = async (req, res) => {
  try {
    const { email } = req.body;

    const doctor = await DocAuth.findOne({ email });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor with this email not found" });
    }

    const resetToken = jwt.sign(
      { id: doctor._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    doctor.resetPasswordToken = resetToken;
    doctor.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await doctor.save();

    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    console.log(`Password reset link for Doctor: ${resetUrl}`);

    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
      resetToken,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// Reset Password
export const resetPasswordDoctor = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const doctor = await DocAuth.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!doctor) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const salt = await bcrypt.genSalt(10);
    doctor.password = await bcrypt.hash(newPassword, salt);

    doctor.resetPasswordToken = undefined;
    doctor.resetPasswordExpire = undefined;

    await doctor.save();
    await User.updateOne({ email: doctor.email }, { $set: { password: doctor.password } });

    res.status(200).json({
      success: true,
      message: "Password reset successful. You can now login."
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};