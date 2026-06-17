import DocProfile from "../models/DocProfile.js";
import User from "../models/User.js";
import { ensureIndexes, resolveUserFromLegacyId } from "../utils/migrationHelpers.js";

export const name = "007-setup-docprofile-collection";

export const up = async () => {
  const profiles = await DocProfile.find({});
  let migrated = 0;

  for (const profile of profiles) {
    if (profile.user) continue;

    const legacyDoctorId = profile.doctor;
    if (!legacyDoctorId) continue;

    const userId = await resolveUserFromLegacyId(User, legacyDoctorId, "Doctor");
    if (!userId) continue;

    await DocProfile.updateOne(
      { _id: profile._id },
      { $set: { user: userId, doctor: legacyDoctorId } }
    );
    migrated++;
  }

  await ensureIndexes(DocProfile);
  console.log(`DocProfile: migrated ${migrated} profiles to User relation`);
};

export const down = async () => {
  await DocProfile.updateMany({}, { $unset: { user: "" } });
  await DocProfile.collection.dropIndexes();
  console.log("DocProfile user field removed");
};
