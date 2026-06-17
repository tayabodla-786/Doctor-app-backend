import Availability from "../models/Availability.js";
import User from "../models/User.js";
import { ensureIndexes, resolveUserFromAnyId } from "../utils/migrationHelpers.js";

export const name = "011-setup-availability-collection";

export const up = async () => {
  const records = await Availability.find({});
  let migrated = 0;

  for (const record of records) {
    const doctorUserId = await resolveUserFromAnyId(User, record.doctor);
    if (!doctorUserId) continue;

    const updatedSlots = [];
    for (const slot of record.slots || []) {
      const bookedByUserId = slot.bookedBy
        ? await resolveUserFromAnyId(User, slot.bookedBy)
        : null;

      updatedSlots.push({
        ...slot.toObject?.() || slot,
        bookedBy: bookedByUserId || slot.bookedBy || null,
      });
    }

    await Availability.updateOne(
      { _id: record._id },
      { $set: { doctor: doctorUserId, slots: updatedSlots } }
    );
    migrated++;
  }

  await ensureIndexes(Availability);
  console.log(`Availability: migrated ${migrated} records to User relations`);
};

export const down = async () => {
  await Availability.collection.dropIndexes();
  console.log("Availability indexes dropped");
};
