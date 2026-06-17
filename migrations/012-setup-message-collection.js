import Message from "../models/Message.js";
import User from "../models/User.js";
import { ensureIndexes, resolveUserFromAnyId } from "../utils/migrationHelpers.js";

export const name = "012-setup-message-collection";

export const up = async () => {
  const messages = await Message.find({});
  let migrated = 0;

  for (const msg of messages) {
    const updates = { senderModel: "User", receiverModel: msg.receiver ? "User" : null };

    if (msg.sender) {
      const senderId = await resolveUserFromAnyId(User, msg.sender);
      if (senderId) updates.sender = senderId;
    }

    if (msg.receiver) {
      const receiverId = await resolveUserFromAnyId(User, msg.receiver);
      if (receiverId) updates.receiver = receiverId;
    }

    await Message.updateOne({ _id: msg._id }, { $set: updates });
    migrated++;
  }

  await ensureIndexes(Message);
  console.log(`Message: migrated ${migrated} records to User relations`);
};

export const down = async () => {
  await Message.collection.dropIndexes();
  console.log("Message indexes dropped");
};
