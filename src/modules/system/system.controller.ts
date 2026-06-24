import { RequestHandler, Response } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { ApiResponse } from "../../utils/api-response.js";
import { env } from "../../config/env.js";
import { getPrismaClient } from "../../config/database.js";

const API_VERSION = "1.0.0";
const serverStartTime = Date.now();

interface SystemReport {
  status: string;
  version: string;
  environment: string;
  uptime: {
    seconds: number;
    human: string;
  };
  timestamp: string;
  node: {
    version: string;
    memory: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
      external: string;
    };
  };
  api: {
    name: string;
    version: string;
    baseUrl: string;
  };
  database: {
    status: "connected" | "disconnected";
    provider: string;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

export const getSystemReport: RequestHandler<
  {},
  ApiResponse<SystemReport>
> = asyncHandler(async (_req, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  const mem = process.memoryUsage();

  // Check database connectivity
  let dbStatus: "connected" | "disconnected" = "connected";
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "disconnected";
  }

  const report: SystemReport = {
    status: "healthy",
    version: API_VERSION,
    environment: env.NODE_ENV,
    uptime: {
      seconds: uptimeSeconds,
      human: formatDuration(uptimeSeconds),
    },
    timestamp: new Date().toISOString(),
    node: {
      version: process.version,
      memory: {
        rss: formatBytes(mem.rss),
        heapTotal: formatBytes(mem.heapTotal),
        heapUsed: formatBytes(mem.heapUsed),
        external: formatBytes(mem.external),
      },
    },
    api: {
      name: "GLX-Tech",
      version: API_VERSION,
      baseUrl: `${env.API_VERSION}`,
    },
    database: {
      status: dbStatus,
      provider: "PostgreSQL (Prisma)",
    },
  };

  const statusCode = dbStatus === "connected" ? 200 : 503;

  return res
    .status(statusCode)
    .json(new ApiResponse(statusCode, `System is ${report.status}`, report));
});
