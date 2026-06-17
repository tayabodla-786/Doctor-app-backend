import Group from "../models/Group.js";
import User from "../models/User.js";
import { ensureIndexes, resolveUserFromAnyId } from "../utils/migrationHelpers.js";

export const name = "013-setup-group-collection";

export const up = async () => {
  const groups = await Group.find({});
  let migrated = 0;

  for (const group of groups) {
    const createdByUserId = await resolveUserFromAnyId(User, group.createdBy);
    if (!createdByUserId) continue;

    const members = [];
    for (const member of group.members || []) {
      const memberUserId = member.user
        ? await resolveUserFromAnyId(User, member.user)
        : member.userId
          ? await resolveUserFromAnyId(User, member.userId)
          : null;

      if (memberUserId) {
        members.push({
          user: memberUserId,
          role: member.role || (member.userType === "DocAuth" ? "Doctor" : "Patient"),
        });
      }
    }

    await Group.updateOne(
      { _id: group._id },
      {
        $set: { createdBy: createdByUserId, members },
        $unset: { createdByType: "" },
      }
    );
    migrated++;
  }

  await ensureIndexes(Group);
  console.log(`Group: migrated ${migrated} records to User relations`);
};

export const down = async () => {
  await Group.collection.dropIndexes();
  console.log("Group indexes dropped");
};
