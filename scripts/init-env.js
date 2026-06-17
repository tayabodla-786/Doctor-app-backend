import { access, copyFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(projectRoot, ".env");
const examplePath = path.join(projectRoot, ".env.example");

const envExists = await access(envPath)
  .then(() => true)
  .catch(() => false);

if (envExists) {
  process.exit(0);
}

const exampleExists = await access(examplePath)
  .then(() => true)
  .catch(() => false);

if (!exampleExists) {
  console.error("Error: .env.example not found. Cannot create .env automatically.");
  process.exit(1);
}

await copyFile(examplePath, envPath);
console.log("Created .env from .env.example");
console.log("Update MONGODB_URL and JWT_SECRET in .env if needed.");
