import "dotenv/config";
import mongoose from "mongoose";
import { readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "migrations");

const MigrationState = new mongoose.Schema({
  name: { type: String, unique: true },
  appliedAt: { type: Date, default: Date.now },
});

const MigrationModel =
  mongoose.models.Migration || mongoose.model("Migration", MigrationState);

const loadMigrations = async () => {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".js"))
    .sort();

  const migrations = [];
  for (const file of files) {
    const mod = await import(path.join(migrationsDir, file));
    migrations.push({
      name: mod.name || file.replace(".js", ""),
      up: mod.up,
      down: mod.down,
    });
  }
  return migrations;
};

const connect = async () => {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required in .env");
  }
  await mongoose.connect(process.env.MONGODB_URL);
};

const runUp = async () => {
  await connect();
  const migrations = await loadMigrations();
  const applied = await MigrationModel.find().lean();
  const appliedNames = new Set(applied.map((m) => m.name));

  for (const migration of migrations) {
    if (appliedNames.has(migration.name)) {
      console.log(`Skipping ${migration.name} (already applied)`);
      continue;
    }

    console.log(`Running ${migration.name}...`);
    await migration.up();
    await MigrationModel.create({ name: migration.name });
    console.log(`Applied ${migration.name}`);
  }

  await mongoose.disconnect();
  console.log("Migrations complete");
};

const runDown = async () => {
  await connect();
  const migrations = await loadMigrations();
  const last = await MigrationModel.findOne().sort({ appliedAt: -1 });

  if (!last) {
    console.log("No migrations to rollback");
    await mongoose.disconnect();
    return;
  }

  const migration = migrations.find((m) => m.name === last.name);
  if (!migration?.down) {
    throw new Error(`Rollback not defined for ${last.name}`);
  }

  console.log(`Rolling back ${migration.name}...`);
  await migration.down();
  await MigrationModel.deleteOne({ name: migration.name });
  await mongoose.disconnect();
  console.log(`Rolled back ${migration.name}`);
};

const command = process.argv[2] || "up";

if (command === "up") {
  runUp().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else if (command === "down") {
  runDown().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.error("Usage: node scripts/migrate.js [up|down]");
  process.exit(1);
}
