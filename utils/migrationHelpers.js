import mongoose from "mongoose";

const isIndexConflict = (err) =>
  err?.code === 86 || err?.codeName === "IndexKeySpecsConflict";

export const ensureIndexes = async (model) => {
  try {
    await model.syncIndexes();
  } catch (err) {
    if (!isIndexConflict(err)) {
      throw err;
    }

    const existing = await model.collection.indexes();
    for (const idx of existing) {
      if (idx.name === "_id_") continue;
      await model.collection.dropIndex(idx.name).catch(() => {});
    }

    await model.syncIndexes();
  }
};

export const resolveUserFromLegacyId = async (User, legacyId, type) => {
  if (!legacyId) return null;

  const legacyObjId = new mongoose.Types.ObjectId(legacyId);

  if (type === "Doctor") {
    const byLegacy = await User.findOne({ legacyDoctorId: legacyObjId });
    if (byLegacy) return byLegacy._id;

    const DocAuth = (await import("../models/DocAuth.js")).default;
    const doc = await DocAuth.findById(legacyObjId);
    if (doc) {
      const byEmail = await User.findOne({ email: doc.email });
      if (byEmail) return byEmail._id;
    }
  }

  if (type === "Patient") {
    const byLegacy = await User.findOne({ legacyPatientId: legacyObjId });
    if (byLegacy) return byLegacy._id;

    const PatAuth = (await import("../models/PatAuth.js")).default;
    const pat = await PatAuth.findById(legacyObjId);
    if (pat) {
      const byEmail = await User.findOne({ email: pat.email });
      if (byEmail) return byEmail._id;
    }
  }

  return null;
};

export const resolveUserFromAnyId = async (User, id) => {
  if (!id) return null;

  const objId = new mongoose.Types.ObjectId(id);
  const direct = await User.findById(objId);
  if (direct) return direct._id;

  return (
    (await resolveUserFromLegacyId(User, objId, "Doctor")) ||
    (await resolveUserFromLegacyId(User, objId, "Patient"))
  );
};
