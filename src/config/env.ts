import { config } from "dotenv";
config();

// When adding vars here, also update:
//   - the `env` object below
//   - scripts/generate-env-example.ts (add metadata to envVars[])
//   - then run `npm run generate:env-example` to regenerate .env.example

export interface EnvConfig {
  readonly PORT: string;
  readonly NODE_ENV: string;
  readonly API_VERSION: string;
  readonly DATABASE_URL: string;
  readonly JWT_ACCESS_SECRET: string;
  readonly JWT_ACCESS_EXPIRES_IN: string;
  readonly JWT_REFRESH_SECRET: string;
  readonly JWT_REFRESH_EXPIRES_IN: string;
  readonly JWT_ADMIN_SECRET: string;
  readonly JWT_ADMIN_EXPIRES_IN: string;
  readonly JWT_ADMIN_REFRESH_SECRET: string;
  readonly JWT_ADMIN_REFRESH_EXPIRES_IN: string;
  readonly JWT_RESET_SECRET: string;
  readonly JWT_RESET_EXPIRES_IN: string;
  readonly MAIL_HOST: string;
  readonly MAIL_PORT: string;
  readonly MAIL_USERNAME: string;
  readonly MAIL_PASSWORD: string;
  readonly MAIL_FROM_NAME: string;
  readonly MAIL_FROM_ADDRESS: string;
  readonly CLOUDINARY_CLOUD_NAME: string;
  readonly CLOUDINARY_API_KEY: string;
  readonly CLOUDINARY_API_SECRET: string;
  readonly CLOUDINARY_BASE_FOLDER: string;
  readonly SITE_NAME: string;
  readonly SITE_URL: string;
  readonly APP_URL: string;
  readonly FRONTEND_URL: string;
  readonly LOCATIONIQ_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET: string;
  readonly STRIPE_SECRET_KEY: string;
}

// ─── Critical env var validation ─────────────────────────────────────────
//
// These variables have no sensible default — the server cannot operate
// without them.  The check runs once at import time so you get a clear,
// early failure instead of a cryptic runtime error later.

const criticalEnvVars: Array<{
  key: keyof EnvConfig;
  label: string;
  group: string;
}> = [
  // Database
  { key: "DATABASE_URL", label: "DATABASE_URL", group: "Database" },

  // JWT — secrets only (expiry has safe defaults)
  { key: "JWT_ACCESS_SECRET", label: "JWT_ACCESS_SECRET", group: "JWT" },
  { key: "JWT_REFRESH_SECRET", label: "JWT_REFRESH_SECRET", group: "JWT" },
  { key: "JWT_ADMIN_SECRET", label: "JWT_ADMIN_SECRET", group: "JWT" },
  {
    key: "JWT_ADMIN_REFRESH_SECRET",
    label: "JWT_ADMIN_REFRESH_SECRET",
    group: "JWT",
  },
  { key: "JWT_RESET_SECRET", label: "JWT_RESET_SECRET", group: "JWT" },

  // Mail
  {
    key: "CLOUDINARY_CLOUD_NAME",
    label: "CLOUDINARY_CLOUD_NAME",
    group: "Cloudinary",
  },
  {
    key: "CLOUDINARY_API_KEY",
    label: "CLOUDINARY_API_KEY",
    group: "Cloudinary",
  },
  {
    key: "CLOUDINARY_API_SECRET",
    label: "CLOUDINARY_API_SECRET",
    group: "Cloudinary",
  },

  { key: "MAIL_HOST", label: "MAIL_HOST", group: "Mail" },
  { key: "MAIL_PORT", label: "MAIL_PORT", group: "Mail" },
  { key: "MAIL_USERNAME", label: "MAIL_USERNAME", group: "Mail" },
  { key: "MAIL_PASSWORD", label: "MAIL_PASSWORD", group: "Mail" },
  { key: "MAIL_FROM_NAME", label: "MAIL_FROM_NAME", group: "Mail" },
  {
    key: "MAIL_FROM_ADDRESS",
    label: "MAIL_FROM_ADDRESS",
    group: "Mail",
  },

  // location iq key
  {
    key: "LOCATIONIQ_KEY",
    label: "LOCATIONIQ_KEY",
    group: "location",
  },

  // Stripe
  {
    key: "STRIPE_SECRET_KEY",
    label: "STRIPE_SECRET_KEY",
    group: "Stripe",
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    label: "STRIPE_WEBHOOK_SECRET",
    group: "Stripe",
  },

];

function validateCriticalEnv(config: EnvConfig): void {
  const missing: string[] = [];

  for (const { key, label, group } of criticalEnvVars) {
    if (!config[key]) {
      missing.push(`  • ${label}  (${group})`);
    }
  }

  if (missing.length > 0) {
    const message = [
      "",
      "═══ Missing critical environment variables ═══",
      "",
      "The following environment variables are required but were not set.",
      "Check your .env file or environment configuration.",
      "",
      ...missing,
      "",
      "───────────────────────────────────────────────",
      "",
    ].join("\n");

    throw new Error(message);
  }
}

export const env = {
  // Server
  PORT: process.env.PORT || "5000",
  NODE_ENV: process.env.NODE_ENV || "development",
  // Normalize to undo Git Bash/MSYS2 path conversion ("C:/Program Files/Git/api/v1" → "/api/v1")
  API_VERSION: (process.env.API_VERSION || "/api/v1")
    .replace(/^[a-zA-Z]:[\\\/].+[\\\/](.+)$/, "/$1")
    .replace(/\\/g, "/"),

  // Database
  DATABASE_URL: process.env.DATABASE_URL || "",

  // JWT — User
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  // JWT — Admin / Super Admin
  JWT_ADMIN_SECRET: process.env.JWT_ADMIN_SECRET || "",
  JWT_ADMIN_EXPIRES_IN: process.env.JWT_ADMIN_EXPIRES_IN || "15m",
  JWT_ADMIN_REFRESH_SECRET: process.env.JWT_ADMIN_REFRESH_SECRET || "",
  JWT_ADMIN_REFRESH_EXPIRES_IN:
    process.env.JWT_ADMIN_REFRESH_EXPIRES_IN || "7d",

  // JWT — Password reset
  JWT_RESET_SECRET: process.env.JWT_RESET_SECRET || "",
  JWT_RESET_EXPIRES_IN: process.env.JWT_RESET_EXPIRES_IN || "15m",

  // Mail (SMTP)
  MAIL_HOST: process.env.MAIL_HOST || "",
  MAIL_PORT: process.env.MAIL_PORT || "465",
  MAIL_USERNAME: process.env.MAIL_USERNAME || "",
  MAIL_PASSWORD: process.env.MAIL_PASSWORD || "",
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || "",
  MAIL_FROM_ADDRESS: process.env.MAIL_FROM_ADDRESS || "",

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
  CLOUDINARY_BASE_FOLDER: process.env.CLOUDINARY_BASE_FOLDER || "glx-tech",

  // Site
  SITE_NAME: process.env.SITE_NAME || "Verep",
  SITE_URL: process.env.SITE_URL || "#",
  APP_URL: process.env.APP_URL || "http://localhost:5173",
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173",
  LOCATIONIQ_KEY: process.env.LOCATIONIQ_KEY || "",

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
} as const satisfies EnvConfig;

// Validate at startup
validateCriticalEnv(env);
