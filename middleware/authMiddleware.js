import jwt from "jsonwebtoken";
import DocAuth from "../models/DocAuth.js";
import PatAuth from "../models/PatAuth.js";

const getTokenFromHeader = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

const findUserByDecoded = async (decoded) => {
  if (decoded.role === "Doctor") {
    return await DocAuth.findById(decoded.id).select("-password");
  }
  if (decoded.role === "Patient") {
    return await PatAuth.findById(decoded.id).select("-password");
  }
  return null;
};

export const protect = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserByDecoded(decoded);

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = { ...user.toObject(), id: user._id.toString(), role: decoded.role };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
};

export const protectDoctor = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "Doctor") {
      return res.status(403).json({ success: false, message: "Access denied. Doctor login required." });
    }

    const user = await DocAuth.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Doctor not found" });
    }

    req.user = { ...user.toObject(), id: user._id.toString(), role: decoded.role };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
};

export const protectPatient = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "Patient") {
      return res.status(403).json({ success: false, message: "Access denied. Patient login required." });
    }

    const user = await PatAuth.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Patient not found" });
    }

    req.user = { ...user.toObject(), id: user._id.toString(), role: decoded.role };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
};