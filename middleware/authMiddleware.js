import jwt from "jsonwebtoken";
import User from "../models/User.js";
import DocAuth from "../models/DocAuth.js";
import PatAuth from "../models/PatAuth.js";
import { getPermissionsForRole } from "../constants/roles.js";

const getTokenFromHeader = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

const findLegacyUser = async (decoded) => {
  if (decoded.role === "Doctor") {
    return await DocAuth.findById(decoded.id).select("-password");
  }
  if (decoded.role === "Patient") {
    return await PatAuth.findById(decoded.id).select("-password");
  }
  return null;
};

const findUserByDecoded = async (decoded) => {
  if (decoded.id) {
    const user = await User.findById(decoded.id).select("-password");
    if (user) return user;

    const legacyUser = await findLegacyUser(decoded);
    if (legacyUser) {
      const syncedUser = await User.findOne({ email: legacyUser.email }).select("-password");
      if (syncedUser) return syncedUser;

      return {
        ...legacyUser.toObject(),
        permissions: decoded.permissions || getPermissionsForRole(decoded.role),
      };
    }
  }

  return null;
};

const attachUserToRequest = (req, user, decoded) => {
  const userObj = user.toObject ? user.toObject() : user;
  req.user = {
    ...userObj,
    id: userObj._id?.toString() || userObj.id,
    role: decoded.role || userObj.role,
    permissions: decoded.permissions || userObj.permissions || getPermissionsForRole(userObj.role),
  };
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

    attachUserToRequest(req, user, decoded);
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

    const user = await findUserByDecoded(decoded);
    if (!user) {
      return res.status(401).json({ success: false, message: "Doctor not found" });
    }

    attachUserToRequest(req, user, decoded);
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

    const user = await findUserByDecoded(decoded);
    if (!user) {
      return res.status(401).json({ success: false, message: "Patient not found" });
    }

    attachUserToRequest(req, user, decoded);
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
};

export const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
        required: requiredPermissions,
      });
    }

    next();
  };
};
