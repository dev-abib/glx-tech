/// <reference types="node" />

/**
 * check-env-example.ts
 *
 * CI check that verifies `.env.example` is up-to-date with the env var
 * metadata in `generate-env-example.ts`.
 *
 * Run with:   npm run check:env-example
 *
 * Exits with code 0 if the file is in sync, or code 1 with a diff
 * if it has drifted.  Intended for CI pipelines.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "./generate-env-example.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const envExamplePath = resolve(projectRoot, ".env.example");

function main(): void {
  const expected = generate();
  let actual: string;

  try {
    actual = readFileSync(envExamplePath, "utf-8");
  } catch {
    console.error(`❌ .env.example not found at ${envExamplePath}`);
    console.error(`\nTo generate it, run:  npm run generate:env-example\n`);
    process.exit(1);
  }

  if (expected === actual) {
    console.log("✅ .env.example is up-to-date.");
    process.exit(0);
  }

  // ── Build a compact diff ──────────────────────────────────────────────

  const expectedLines = expected.split("\n");
  const actualLines = actual.split("\n");
  const maxLen = Math.max(expectedLines.length, actualLines.length);
  const diffLines: string[] = [];

  for (let i = 0; i < maxLen; i++) {
    const e = expectedLines[i];
    const a = actualLines[i];
    if (e !== a) {
      diffLines.push(`L${i + 1}  -${e ?? ""}`);
      diffLines.push(`L${i + 1}  +${a ?? ""}`);
    }
  }

  console.error("❌ .env.example is out of date.");
  console.error("");
  console.error("Diff (expected vs actual):");
  console.error(diffLines.join("\n"));
  console.error("");
  console.error("To fix, run:  npm run generate:env-example");
  console.error("");

  process.exit(1);
}

main();
