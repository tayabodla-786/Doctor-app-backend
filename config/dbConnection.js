import mongoose from "mongoose";
import { getMongoUri } from "./env.js";

export const dbConnect = async () => {
  mongoose.connection.on("connected", () => {
    console.log("MongoDB is connected");
  });

  mongoose.connection.on("error", (error) => {
    console.log("Failed to connect: ", error);
  });

  await mongoose.connect(getMongoUri());
};
