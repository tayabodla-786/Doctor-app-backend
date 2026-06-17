import Role from "../models/Role.js";
import { ROLES, ROLE_PERMISSIONS } from "../constants/roles.js";

export const name = "001-seed-roles-permissions";

export const up = async () => {
  const roleEntries = Object.entries(ROLE_PERMISSIONS).map(([roleName, permissions]) => ({
    name: roleName,
    permissions,
    description: `${roleName} role with default permissions`,
  }));

  for (const entry of roleEntries) {
    await Role.findOneAndUpdate(
      { name: entry.name },
      { $set: entry },
      { upsert: true, new: true }
    );
  }

  console.log(`Seeded ${roleEntries.length} roles`);
};

export const down = async () => {
  await Role.deleteMany({ name: { $in: Object.values(ROLES) } });
  console.log("Removed seeded roles");
};
