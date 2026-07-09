/// <reference types="node" />

/**
 * generate-env-example.ts
 *
 * Generates `.env.example` from the canonical list of environment variables.
 * Run with:   npm run generate:env-example
 *
 * When adding a new env var:
 *   1. Add it to the `EnvConfig` interface in `src/config/env.ts`
 *   2. Add its runtime binding in the `env` object in `src/config/env.ts`
 *   3. Add its metadata entry in the `envVars` array below
 *   4. Run `npm run generate:env-example` to regenerate `.env.example`
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// ─── Env var metadata ─────────────────────────────────────────────────────

interface EnvVarEntry {
  /** Env var key (e.g. "PORT") */
  key: string;
  /** Default fallback used at runtime */
  default: string;
  /** Example value shown in .env.example */
  example: string;
  /** Section heading group */
  group: string;
  /** Short description shown as a comment */
  description?: string;
  /** Whether the server will refuse to start without this var */
  critical?: boolean;
  /** Quote the value in the output (for values containing special chars) */
  quote?: boolean;
}

const envVars: EnvVarEntry[] = [
  // ── Server ──────────────────────────────────────────────────────────────
  {
    key: "PORT",
    default: "5000",
    example: "5000",
    group: "Server Configuration",
    description: "Port the Express server listens on",
  },
  {
    key: "NODE_ENV",
    default: "development",
    example: "development",
    group: "Server Configuration",
    description: "Runtime environment (development | production | test)",
  },
  {
    key: "API_VERSION",
    default: "/api/v1",
    example: "/api/v1",
    group: "Server Configuration",
    description: "API route prefix",
  },

  // ── Database ────────────────────────────────────────────────────────────
  {
    key: "DATABASE_URL",
    default: "",
    example: "postgresql://user:password@host:6543/postgres?pgbouncer=true",
    group: "Database — PostgreSQL",
    description: "PostgreSQL connection string (required)",
    critical: true,
    quote: true,
  },

  // ── JWT — User ─────────────────────────────────────────────────────────
  {
    key: "JWT_ACCESS_SECRET",
    default: "",
    example: "change-me-user-access-secret",
    group: "JWT — User tokens (login / registration)",
    description: "Secret for signing user access tokens (required)",
    critical: true,
  },
  {
    key: "JWT_ACCESS_EXPIRES_IN",
    default: "15m",
    example: "15m",
    group: "JWT — User tokens (login / registration)",
  },
  {
    key: "JWT_REFRESH_SECRET",
    default: "",
    example: "change-me-user-refresh-secret",
    group: "JWT — User tokens (login / registration)",
    description: "Secret for signing user refresh tokens (required)",
    critical: true,
  },
  {
    key: "JWT_REFRESH_EXPIRES_IN",
    default: "7d",
    example: "7d",
    group: "JWT — User tokens (login / registration)",
  },

  // ── JWT — Admin / Super Admin ──────────────────────────────────────────
  {
    key: "JWT_ADMIN_SECRET",
    default: "",
    example: "change-me-admin-access-secret",
    group: "JWT — Admin / Super Admin tokens",
    description: "Secret for signing admin access tokens (required)",
    critical: true,
  },
  {
    key: "JWT_ADMIN_EXPIRES_IN",
    default: "15m",
    example: "15m",
    group: "JWT — Admin / Super Admin tokens",
  },
  {
    key: "JWT_ADMIN_REFRESH_SECRET",
    default: "",
    example: "change-me-admin-refresh-secret",
    group: "JWT — Admin / Super Admin tokens",
    description: "Secret for signing admin refresh tokens (required)",
    critical: true,
  },
  {
    key: "JWT_ADMIN_REFRESH_EXPIRES_IN",
    default: "7d",
    example: "7d",
    group: "JWT — Admin / Super Admin tokens",
  },

  // ── JWT — Password reset ────────────────────────────────────────────────
  {
    key: "JWT_RESET_SECRET",
    default: "",
    example: "change-me-reset-secret",
    group: "JWT — Password reset token",
    description: "Secret for signing password-reset tokens (required)",
    critical: true,
  },
  {
    key: "JWT_RESET_EXPIRES_IN",
    default: "15m",
    example: "15m",
    group: "JWT — Password reset token",
  },

  // ── Mail (SMTP) ─────────────────────────────────────────────────────────
  {
    key: "MAIL_HOST",
    default: "",
    example: "smtp.gmail.com",
    group: "SMTP — Email",
    description: "SMTP server hostname (required)",
    critical: true,
  },
  {
    key: "MAIL_PORT",
    default: "465",
    example: "465",
    group: "SMTP — Email",
    description: "SMTP server port (required)",
    critical: true,
  },
  {
    key: "MAIL_USERNAME",
    default: "",
    example: "you@gmail.com",
    group: "SMTP — Email",
    description: "SMTP username (required)",
    critical: true,
  },
  {
    key: "MAIL_PASSWORD",
    default: "",
    example: "your-app-password",
    group: "SMTP — Email",
    description: "SMTP password or app password (required)",
    critical: true,
  },
  {
    key: "MAIL_FROM_NAME",
    default: "",
    example: "YourAppName",
    group: "SMTP — Email",
    description: "Sender display name (required)",
    critical: true,
  },
  {
    key: "MAIL_FROM_ADDRESS",
    default: "",
    example: "you@gmail.com",
    group: "SMTP — Email",
    description: "Sender email address (required)",
    critical: true,
  },

  // ── Cloudinary ────────────────────────────────────────────────────────
  {
    key: "CLOUDINARY_CLOUD_NAME",
    default: "",
    example: "your-cloud-name",
    group: "Cloudinary",
    description: "Cloudinary cloud name (required)",
    critical: true,
  },
  {
    key: "CLOUDINARY_API_KEY",
    default: "",
    example: "123456789012345",
    group: "Cloudinary",
    description: "Cloudinary API key (required)",
    critical: true,
  },
  {
    key: "CLOUDINARY_API_SECRET",
    default: "",
    example: "abc123def456",
    group: "Cloudinary",
    description: "Cloudinary API secret (required)",
    critical: true,
  },
  {
    key: "CLOUDINARY_BASE_FOLDER",
    default: "glx-tech",
    example: "my-app",
    group: "Cloudinary",
    description: "Base folder prefix in Cloudinary for app uploads",
  },

  // ── Extra — used by Prisma & infra (not in EnvConfig) ────────────
  {
    key: "DIRECT_URL",
    default: "",
    example: "postgresql://user:password@host:5432/postgres",
    group: "Database — PostgreSQL",
    description: "Direct connection string for Prisma migrations (not pooled)",
    quote: true,
  },
  {
    key: "MAIL_MAILER",
    default: "smtp",
    example: "smtp",
    group: "SMTP — Email",
    description: "Mail driver (used by underlying mail library)",
  },
  {
    key: "MAIL_ENCRYPTION",
    default: "SSL",
    example: "SSL",
    group: "SMTP — Email",
    description: "Encryption protocol for SMTP",
  },
  {
    key: "SITE_OWNER_MAIL",
    default: "",
    example: "admin@yourapp.com",
    group: "SMTP — Email",
    description: "Site owner email for admin notifications",
  },

  // ── LocationIQ ───────────────────────────────────────────────────────────
  {
    key: "LOCATIONIQ_KEY",
    default: "",
    example: "your-locationiq-api-key",
    group: "LocationIQ — Geocoding",
    description: "LocationIQ API key for geocoding addresses (required)",
    critical: true,
  },

  // ── Stripe ─────────────────────────────────────────────────────────────
  {
    key: "STRIPE_SECRET_KEY",
    default: "",
    example: "sk_test_...",
    group: "Stripe — Payments",
    description: "Stripe secret key (required)",
    critical: true,
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    default: "",
    example: "whsec_...",
    group: "Stripe — Payments",
    description: "Stripe webhook signing secret (required)",
    critical: true,
  },

  // ── Site ────────────────────────────────────────────────────────────────
  {
    key: "SITE_NAME",
    default: "Verep",
    example: "YourAppName",
    group: "Site",
    description: "Application name used in email templates",
  },
  {
    key: "SITE_URL",
    default: "#",
    example: "https://yourapp.com",
    group: "Site",
    description: "Application website URL used in email footers",
  },
  {
    key: "APP_URL",
    default: "http://localhost:5173",
    example: "https://api.yourapp.com",
    group: "Site",
    description: "Application root URL used in email CTA buttons",
  },
  {
    key: "FRONTEND_URL",
    default: "http://localhost:5173",
    example: "https://yourapp.com",
    group: "Site",
    description: "Frontend URL used for Stripe checkout redirects and link generation",
  },
];

// ─── Generator ─────────────────────────────────────────────────────────────

const HEADER = `# ══════════════════════════════════════════════
# Environment Configuration
# ══════════════════════════════════════════════
#
# This file was auto-generated by:
#   npm run generate:env-example
#
# Copy this file to .env and fill in your values.
#
# Note: vars marked with ⚠ are required — the server won't start without them.
`;

function groupEntries(entries: EnvVarEntry[]): Map<string, EnvVarEntry[]> {
  const map = new Map<string, EnvVarEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.group) ?? [];
    list.push(entry);
    map.set(entry.group, list);
  }
  return map;
}

function formatValue(value: string, quote?: boolean): string {
  return quote ? `"${value}"` : value;
}

export function generate(): string {
  const lines: string[] = [HEADER, ""];

  const grouped = groupEntries(envVars);

  for (const [group, entries] of grouped) {
    lines.push("# ──────────────────────────────────────────────");
    lines.push(`# ${group}`);
    lines.push("# ──────────────────────────────────────────────");

    const criticalEntries = entries.filter((e) => e.critical);
    if (criticalEntries.length > 0) {
      const criticalNames = criticalEntries.map((e) => e.key).join(", ");
      lines.push(`# ⚠ Required: ${criticalNames}`);
    }

    lines.push("");

    for (const entry of entries) {
      if (entry.description) {
        lines.push(`# ${entry.description}`);
      }
      lines.push(`${entry.key}=${formatValue(entry.example, entry.quote)}`);
      lines.push("");
    }
  }

  lines.push("# ══════════════════════════════════════════════");
  lines.push("");

  return lines.join("\n");
}

// ─── CLI entry point ──────────────────────────────────────────────────────

function main(): void {
  const content = generate();
  const outputPath = resolve(projectRoot, ".env.example");

  writeFileSync(outputPath, content, "utf-8");
  console.log(`✅ Generated ${outputPath}`);
}

const isDirectExecution =
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isDirectExecution) {
  main();
}
