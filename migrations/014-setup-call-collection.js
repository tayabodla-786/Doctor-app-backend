import Call from "../models/Call.js";
import User from "../models/User.js";
import { ensureIndexes, resolveUserFromAnyId } from "../utils/migrationHelpers.js";

export const name = "014-setup-call-collection";

export const up = async () => {
  const calls = await Call.find({});
  let migrated = 0;

  for (const call of calls) {
    const callerId = await resolveUserFromAnyId(User, call.caller);
    const calleeId = await resolveUserFromAnyId(User, call.callee);

    if (!callerId || !calleeId) continue;

    await Call.updateOne(
      { _id: call._id },
      {
        $set: {
          caller: callerId,
          callee: calleeId,
          callerModel: "User",
          calleeModel: "User",
        },
      }
    );
    migrated++;
  }

  await ensureIndexes(Call);
  console.log(`Call: migrated ${migrated} records to User relations`);
};

export const down = async () => {
  await Call.collection.dropIndexes();
  console.log("Call indexes dropped");
};
