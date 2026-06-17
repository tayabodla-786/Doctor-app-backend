import "dotenv/config";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export const getMongoUri = () => {
  const uri =
    process.env.MONGODB_URL ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL;

  if (uri && uri.trim()) {
    return uri.trim();
  }

  const envPath = path.join(projectRoot, ".env");

  if (!existsSync(envPath)) {
    throw new Error(
      [
        "Missing .env file.",
        "Run:  npm run env:init",
        "Or:   cp .env.example .env",
        "Then set: MONGODB_URL=mongodb://localhost:27017/social-doctor",
      ].join("\n")
    );
  }

  throw new Error(
    [
      "MONGODB_URL is not set in .env",
      "Add this line to .env:",
      "MONGODB_URL=mongodb://localhost:27017/social-doctor",
    ].join("\n")
  );
};
