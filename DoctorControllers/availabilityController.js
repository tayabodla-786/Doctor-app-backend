import Availability from "../models/Availability.js";
import mongoose from "mongoose";
import {
  formatDateKey,
  getDayRangeFromKey,
  normalizeTime,
} from "../utils/dateHelpers.js";

// Doctor sets availability slots
export const setAvailability = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { date, slots } = req.body;

    if (!date || !slots || !Array.isArray(slots)) {
      return res.status(400).json({ success: false, message: "Date and slots are required" });
    }

    const dayRange = getDayRangeFromKey(date);
    if (!dayRange) {
      return res.status(400).json({ success: false, message: "Invalid date" });
    }

    const doctorObjId = new mongoose.Types.ObjectId(doctorId);
    const existing = await Availability.findOne({
      doctor: doctorObjId,
      date: { $gte: dayRange.start, $lt: dayRange.end },
    });

    const slotKey = (s) => `${normalizeTime(s.startTime)}-${normalizeTime(s.endTime)}`;
    const mergedMap = new Map();

    if (existing) {
      for (const s of existing.slots) {
        mergedMap.set(slotKey(s), s);
      }
    }

    for (const s of slots) {
      const key = slotKey(s);
      if (!mergedMap.has(key)) {
        mergedMap.set(key, {
          startTime: normalizeTime(s.startTime),
          endTime: normalizeTime(s.endTime),
          isBooked: false,
          bookedBy: null,
        });
      }
    }

    const availability = await Availability.findOneAndUpdate(
      { doctor: doctorObjId, date: { $gte: dayRange.start, $lt: dayRange.end } },
      {
        doctor: doctorObjId,
        date: dayRange.start,
        slots: Array.from(mergedMap.values()),
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: "Availability set successfully",
      availability,
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

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: "Invalid doctor ID" });
    }

    const dayRange = getDayRangeFromKey(date);
    if (!dayRange) {
      return res.status(400).json({ success: false, message: "Invalid date" });
    }

    const doctorObjId = new mongoose.Types.ObjectId(doctorId);

    const availability = await Availability.findOne({
      doctor: doctorObjId,
      date: { $gte: dayRange.start, $lt: dayRange.end },
    });

    const availableSlots = availability
      ? availability.slots.filter((slot) => !slot.isBooked)
      : [];

    res.status(200).json({
      success: true,
      dateKey: dayRange.dateKey,
      slots: availableSlots,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get doctor schedule for patient booking (next N days)
export const getDoctorSchedule = async (req, res) => {
  try {
    const { doctorId } = req.query;
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 90);

    if (!doctorId) {
      return res.status(400).json({ success: false, message: "Doctor ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: "Invalid doctor ID" });
    }

    const doctorObjId = new mongoose.Types.ObjectId(doctorId);
    const todayRange = getDayRangeFromKey(new Date());
    const startOfDay = todayRange?.start ?? new Date();
    const endDate = new Date(startOfDay.getTime() + days * 24 * 60 * 60 * 1000);

    const availabilities = await Availability.find({
      doctor: doctorObjId,
      date: { $gte: startOfDay, $lt: endDate },
    }).sort({ date: 1 });

    const schedule = availabilities
      .map((item) => {
        const availableSlots = item.slots.filter((slot) => !slot.isBooked);
        if (availableSlots.length === 0) return null;

        const dateKey = formatDateKey(item.date);
        if (!dateKey) return null;

        return {
          date: dateKey,
          dateKey,
          slots: availableSlots.map((slot) => ({
            startTime: normalizeTime(slot.startTime),
            endTime: normalizeTime(slot.endTime),
            isBooked: false,
          })),
        };
      })
      .filter(Boolean);

    res.status(200).json({
      success: true,
      schedule,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
