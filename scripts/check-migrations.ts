/// <reference types="node" />

/**
 * check-migrations.ts
 *
 * Connects to the database (via DATABASE_URL or DIRECT_URL from .env),
 * queries the `_prisma_migrations` table, and compares the applied
 * migrations against the local migration files on disk.
 *
 * Run with:   npm run check:migrations
 *
 * Set the env var to a production database URL to check production:
 *   DATABASE_URL=postgresql://... npm run check:migrations
 *
 * Or set DIRECT_URL in your .env file and the script will prefer it
 * (mirroring the prisma.config.ts behaviour).
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// ─── Config ───────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = resolve(projectRoot, "src/prisma/migrations");
const DIRECT_URL = process.env.DIRECT_URL || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

// ─── Helpers ──────────────────────────────────────────────────────────────

interface LocalMigration {
  name: string;
  path: string;
  sql: string;
}

function getLocalMigrations(): LocalMigration[] {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const entries = readdirSync(MIGRATIONS_DIR, { withFileTypes: true });

  const migrations: LocalMigration[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const migrationDir = resolve(MIGRATIONS_DIR, entry.name);
    const sqlFile = resolve(migrationDir, "migration.sql");
    if (!existsSync(sqlFile)) continue;

    const sql = readFileSync(sqlFile, "utf-8");
    migrations.push({ name: entry.name, path: migrationDir, sql });
  }

  // Sort by migration name (timestamp-based, so alphabetical = chronological)
  migrations.sort((a, b) => a.name.localeCompare(b.name));

  return migrations;
}

interface AppliedMigration {
  migration_name: string;
  finished_at: string | null;
  rolled_back_at: string | null;
  started_at: string;
}

async function getAppliedMigrations(): Promise<AppliedMigration[]> {
  const connectionString = DIRECT_URL || DATABASE_URL;

  if (!connectionString) {
    console.error(
      "\n❌ No database URL found. Set DIRECT_URL or DATABASE_URL in your .env file."
    );
    console.error("   Example: DATABASE_URL=postgresql://user:pass@host:5432/db\n");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  let migrations: AppliedMigration[] = [];

  try {
    const result = await pool.query<AppliedMigration>(
      `SELECT migration_name, finished_at, rolled_back_at, started_at
       FROM _prisma_migrations
       ORDER BY started_at ASC`
    );
    migrations = result.rows;
  } catch (err) {
    if (err instanceof Error) {
      console.error("\n❌ Could not query _prisma_migrations table.");
      console.error(`   ${err.message}`);
      console.error(
        "\n   Make sure the connection string is correct and the database has been initialized with Prisma.\n"
      );
    }
    process.exit(1);
  } finally {
    await pool.end();
  }

  return migrations;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dbHost = (() => {
    try {
      const url = new URL(DIRECT_URL || DATABASE_URL);
      return url.host; // e.g. "db.example.com:5432"
    } catch {
      return "(unknown)";
    }
  })();

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║       Prisma Migration Status Check          ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  if (DIRECT_URL || DATABASE_URL) {
    console.log(`🔌 Database host: ${dbHost}\n`);
  }

  // ── 1. Read local migration files ──────────────────────────────────

  const localMigrations = getLocalMigrations();
  console.log(`📁 Local migrations found: ${localMigrations.length}\n`);

  localMigrations.forEach((m) => {
    console.log(`   ${m.name}`);
  });

  // ── 2. Fetch applied migrations from database ──────────────────────

  console.log(`\n📡 Querying _prisma_migrations table...\n`);

  const appliedMigrations = await getAppliedMigrations();
  const appliedNames = new Map<string, AppliedMigration>();
  const failedApplied: AppliedMigration[] = [];

  for (const m of appliedMigrations) {
    appliedNames.set(m.migration_name, m);
    if (!m.finished_at) {
      failedApplied.push(m);
    }
  }

  console.log(`✅ Applied in database: ${appliedMigrations.length}\n`);

  if (appliedMigrations.length > 0) {
    appliedMigrations.forEach((m) => {
      const status = m.finished_at ? "✓" : "✗";
      const finishedAt = m.finished_at
        ? new Date(m.finished_at).toLocaleString()
        : "INCOMPLETE";
      console.log(`   ${status} ${m.migration_name} — ${finishedAt}`);
    });
  }

  // ── 3. Compute pending migrations ─────────────────────────────────

  const pendingMigrations = localMigrations.filter(
    (m) => !appliedNames.has(m.name)
  );
  const unknownApplied = appliedMigrations.filter(
    (m) => !localMigrations.some((l) => l.name === m.migration_name)
  );

  console.log(`\n─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─\n`);

  if (pendingMigrations.length === 0 && unknownApplied.length === 0 && failedApplied.length === 0) {
    console.log("✅ All migrations are in sync! No pending migrations.");
  }

  if (pendingMigrations.length > 0) {
    console.log(`⚠️  PENDING migrations (${pendingMigrations.length}):\n`);
    pendingMigrations.forEach((m) => {
      console.log(`   ⏳ ${m.name}`);
    });
    console.log(
      `\n   To apply: npx prisma migrate deploy\n`
    );
  }

  if (failedApplied.length > 0) {
    console.log(`\n❌ FAILED migrations (incomplete in database):\n`);
    failedApplied.forEach((m) => {
      console.log(`   ✗ ${m.migration_name} — started at ${new Date(m.started_at).toLocaleString()}`);
    });
    console.log(
      `\n   To resolve: npx prisma migrate resolve --rolled-back "${failedApplied[0].migration_name}"`
    );
  }

  if (unknownApplied.length > 0) {
    console.log(`\n❓ ORPHANED migrations (in database but not found locally):\n`);
    unknownApplied.forEach((m) => {
      console.log(`   ? ${m.migration_name}`);
    });
  }

  console.log("");

  // Exit with error if there are pending or failed migrations
  if (pendingMigrations.length > 0 || failedApplied.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ Script failed:", err.message);
  process.exit(1);
});
