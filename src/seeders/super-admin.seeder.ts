import { config } from "dotenv";
config();

import { hashPassword } from "../utils/hash.js";
import { getPrismaClient } from "../config/database.js";

async function seedSuperAdmin(): Promise<void> {
  const prisma = getPrismaClient();

  try {
    await prisma.$connect();
    console.log("[Seeder] Connected to database.");

    const email = "admin@admin.com";
    const password = "12345678";

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log("[Seeder] Super admin already exists, skipping.");
      return;
    }

    const hashedPassword = await hashPassword(password);

    await prisma.user.create({
      data: {
        name: "Super Admin",
        email,
        password: hashedPassword,
        role: "super_admin",
        isEmailVerified: true,
        isActive: true,
        isPaid: true,
      },
    });

    console.log("[Seeder] Super admin seeded successfully!");
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role:     super_admin`);
  } catch (error) {
    console.error("[Seeder] Error seeding super admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log("[Seeder] Disconnected from database.");
  }
}

seedSuperAdmin();
