import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL é obrigatória");
const { Pool } = await import("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: false } : undefined });
const files = [
  "migrations/001_pi5_events.sql",
  "migrations/002_pi5_training_foundation.sql",
  "migrations/003_pi5_training_views.sql",
  "migrations/004_pi5_training_operations.sql",
  "migrations/005_pi5_training_operational_views.sql",
];
try {
  for (const file of files) {
    const path = resolve(file);
    const sql = await readFile(path, "utf8");
    await pool.query(sql);
    console.log(`Aplicada: ${file}`);
  }
  console.log("Migrations PI5 concluídas.");
} finally {
  await pool.end();
}
