import { PrismaPg } from "@prisma/adapter-pg";
import * as Prisma from "@prisma/client";
import { Pool } from "pg";

let prismaInstance: Prisma.PrismaClient | null = null;

export const getPrismaClient = (): Prisma.PrismaClient => {
  if (!prismaInstance) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prismaInstance = new Prisma.PrismaClient({ adapter });
  }
  return prismaInstance;
};

export const connectDatabase = async (): Promise<void> => {
  const prisma = getPrismaClient();
  try {
    await prisma.$connect();
    console.info("[DB] Prisma (PostgreSQL) connected successfully.");
  } catch (err) {
    console.error(
      "[DB] Prisma connection error:",
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (prismaInstance) {
    try {
      await prismaInstance.$disconnect();
      prismaInstance = null;
      console.info("[DB] Prisma disconnected.");
    } catch (err) {
      console.error(
        "[DB] Prisma disconnection error:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }
};

let shutdownRegistered = false;

export const registerShutdownHandlers = (): void => {
  if (shutdownRegistered) return;
  shutdownRegistered = true;

  const shutdown = async (signal: string) => {
    console.info(`[DB] ${signal} received. Closing database connections...`);
    await disconnectDatabase();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};
