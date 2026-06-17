import DocAuth from "../models/DocAuth.js";
import User from "../models/User.js";
import { ensureIndexes } from "../utils/migrationHelpers.js";

export const name = "005-setup-docauth-collection";

export const up = async () => {
  await ensureIndexes(DocAuth);

  const doctors = await DocAuth.find({ user: null });
  let linked = 0;

  for (const doctor of doctors) {
    const user = await User.findOne({
      $or: [{ email: doctor.email }, { legacyDoctorId: doctor._id }],
    });
    if (user) {
      await DocAuth.updateOne({ _id: doctor._id }, { $set: { user: user._id } });
      linked++;
    }
  }

  console.log(`DocAuth indexes synced, linked ${linked} doctors to User`);
};

export const down = async () => {
  await DocAuth.updateMany({}, { $unset: { user: "" } });
  await DocAuth.collection.dropIndexes();
  console.log("DocAuth user links removed, indexes dropped");
};
