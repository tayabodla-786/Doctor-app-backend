import PatAuth from "../models/PatAuth.js";
import User from "../models/User.js";
import { ensureIndexes } from "../utils/migrationHelpers.js";

export const name = "006-setup-patauth-collection";

export const up = async () => {
  await ensureIndexes(PatAuth);

  const patients = await PatAuth.find({ user: null });
  let linked = 0;

  for (const patient of patients) {
    const user = await User.findOne({
      $or: [{ email: patient.email }, { legacyPatientId: patient._id }],
    });
    if (user) {
      await PatAuth.updateOne({ _id: patient._id }, { $set: { user: user._id } });
      linked++;
    }
  }

  console.log(`PatAuth indexes synced, linked ${linked} patients to User`);
};

export const down = async () => {
  await PatAuth.updateMany({}, { $unset: { user: "" } });
  await PatAuth.collection.dropIndexes();
  console.log("PatAuth user links removed, indexes dropped");
};
