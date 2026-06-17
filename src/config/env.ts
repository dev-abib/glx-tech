import { config } from "dotenv";
config();

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  API_VERSION: process.env.API_VERSION || "/api/v1"
};
