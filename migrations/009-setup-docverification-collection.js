import DocVerification from "../models/DocVerification.js";
import User from "../models/User.js";
import { ensureIndexes, resolveUserFromLegacyId } from "../utils/migrationHelpers.js";

export const name = "009-setup-docverification-collection";

export const up = async () => {
  const records = await DocVerification.find({});
  let migrated = 0;

  for (const record of records) {
    const updates = {};

    if (!record.user && record.doctor) {
      const userId = await resolveUserFromLegacyId(User, record.doctor, "Doctor");
      if (userId) {
        updates.user = userId;
        updates.doctor = record.doctor;
      }
    }

    if (record.reviewedBy) {
      const reviewerId = await resolveUserFromLegacyId(User, record.reviewedBy, "Doctor");
      if (reviewerId) updates.reviewedBy = reviewerId;
    }

    if (Object.keys(updates).length > 0) {
      await DocVerification.updateOne({ _id: record._id }, { $set: updates });
      migrated++;
    }
  }

  await ensureIndexes(DocVerification);
  console.log(`DocVerification: migrated ${migrated} records to User relations`);
};

export const down = async () => {
  await DocVerification.updateMany({}, { $unset: { user: "" } });
  await DocVerification.collection.dropIndexes();
  console.log("DocVerification user field removed");
};
