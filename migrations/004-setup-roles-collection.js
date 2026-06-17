import Role from "../models/Role.js";
import { ensureIndexes } from "../utils/migrationHelpers.js";

export const name = "004-setup-roles-collection";

export const up = async () => {
  await ensureIndexes(Role);
  console.log("Roles collection indexes synced");
};

export const down = async () => {
  await Role.collection.dropIndexes();
  console.log("Roles indexes dropped");
};
