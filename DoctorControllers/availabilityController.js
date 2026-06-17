import Availability from "../models/Availability.js";
import Appointment from "../models/Appointment.js";
import mongoose from "mongoose";

// Doctor sets availability slots
export const setAvailability = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { date, slots } = req.body;

    if (!date || !slots || !Array.isArray(slots)) {
      return res.status(400).json({ success: false, message: "Date and slots are required" });
    }

    // Create consistent date at start of day
    const dateObj = new Date(date);
    const dateKey = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

    const doctorObjId = new mongoose.Types.ObjectId(doctorId);

    const availability = await Availability.findOneAndUpdate(
      { doctor: doctorObjId, date: { $gte: dateKey, $lt: new Date(dateKey.getTime() + 24 * 60 * 60 * 1000) } },
      { 
        doctor: doctorObjId, 
        date: dateKey,
        slots 
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: "Availability set successfully",
      availability
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get available slots for patient
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ success: false, message: "Doctor ID and Date are required" });
    }

    // Validate and convert doctorId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: "Invalid doctor ID" });
    }

    const doctorObjId = new mongoose.Types.ObjectId(doctorId);

    // Create consistent date at start of day
    const dateObj = new Date(date);
    const dateKey = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const endOfDay = new Date(dateKey.getTime() + 24 * 60 * 60 * 1000);

    const availability = await Availability.findOne({
      doctor: doctorObjId,
      date: { $gte: dateKey, $lt: endOfDay }
    });

    const availableSlots = availability 
      ? availability.slots.filter(slot => !slot.isBooked)
      : [];

    res.status(200).json({
      success: true,
      slots: availableSlots
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};