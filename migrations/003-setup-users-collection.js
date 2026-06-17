import User from "../models/User.js";
import { ensureIndexes } from "../utils/migrationHelpers.js";

export const name = "003-setup-users-collection";

export const up = async () => {
  await ensureIndexes(User);
  console.log("Users collection indexes synced");
};

export const down = async () => {
  await User.collection.dropIndexes();
  console.log("Users indexes dropped");
};
