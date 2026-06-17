import User from "../models/User.js";

export const canContact = (senderRole, receiverRole) => {
  if (senderRole === "Doctor" && receiverRole === "Patient") return true;
  if (senderRole === "Patient" && receiverRole === "Doctor") return true;
  return false;
};

export const validateReceiver = async (sender, receiverId) => {
  if (!receiverId) {
    return { ok: false, status: 400, message: "receiverId is required" };
  }

  const receiver = await User.findById(receiverId).select("name role isVerified");
  if (!receiver) {
    return { ok: false, status: 404, message: "Receiver not found" };
  }

  if (!canContact(sender.role, receiver.role)) {
    return {
      ok: false,
      status: 403,
      message: "Doctors can only contact patients and patients can only contact doctors",
    };
  }

  return { ok: true, receiver };
};
