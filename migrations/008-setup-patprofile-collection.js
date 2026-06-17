import PatProfile from "../models/PatProfile.js";
import User from "../models/User.js";
import { ensureIndexes, resolveUserFromLegacyId } from "../utils/migrationHelpers.js";

export const name = "008-setup-patprofile-collection";

export const up = async () => {
  const profiles = await PatProfile.find({});
  let migrated = 0;

  for (const profile of profiles) {
    if (profile.user) continue;

    const legacyPatientId = profile.patient;
    if (!legacyPatientId) continue;

    const userId = await resolveUserFromLegacyId(User, legacyPatientId, "Patient");
    if (!userId) continue;

    await PatProfile.updateOne(
      { _id: profile._id },
      { $set: { user: userId, patient: legacyPatientId } }
    );
    migrated++;
  }

  await ensureIndexes(PatProfile);
  console.log(`PatProfile: migrated ${migrated} profiles to User relation`);
};

export const down = async () => {
  await PatProfile.updateMany({}, { $unset: { user: "" } });
  await PatProfile.collection.dropIndexes();
  console.log("PatProfile user field removed");
};
