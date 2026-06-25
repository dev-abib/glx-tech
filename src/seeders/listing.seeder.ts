import { config } from "dotenv";
config();

import { hashPassword } from "../utils/hash.js";
import { getPrismaClient } from "../config/database.js";
import { ListingService } from "../modules/listing/listing.service.js";

async function seedListings(): Promise<void> {
  const prisma = getPrismaClient();

  try {
    await prisma.$connect();
    console.log("[ListingSeeder] Connected to database.\n");

    // ── 1. Seed seller users ──────────────────────────────────────────

    const sellers = [
      {
        email: "seller1@demo.com",
        name: "Alice Johnson",
        password: "12345678",
      },
      {
        email: "seller2@demo.com",
        name: "Bob Smith",
        password: "12345678",
      },
    ];

    const createdSellers: Array<{ id: string; name: string }> = [];

    for (const s of sellers) {
      let seller = await prisma.user.findUnique({ where: { email: s.email } });
      if (!seller) {
        const hashedPw = await hashPassword(s.password);
        seller = await prisma.user.create({
          data: {
            name: s.name,
            email: s.email,
            password: hashedPw,
            role: "seller",
            isEmailVerified: true,
            isActive: true,
            isPaid: true,
          },
        });
        console.log(`  ✓ Created seller: ${s.name} (${s.email})`);
      } else {
        console.log(`  ○ Using existing seller: ${s.name} (${s.email})`);
      }
      createdSellers.push({ id: seller.id, name: seller.name });
    }

    // ── 2. Seed demo users (for writing reviews) ─────────────────────

    const demoUsers = [
      { email: "reviewer1@demo.com", name: "Charlie Brown" },
      { email: "reviewer2@demo.com", name: "Diana Prince" },
      { email: "reviewer3@demo.com", name: "Eve Adams" },
    ];

    const createdUsers: Array<{ id: string; name: string }> = [];

    for (const u of demoUsers) {
      let user = await prisma.user.findUnique({ where: { email: u.email } });
      if (!user) {
        const hashedPw = await hashPassword("12345678");
        user = await prisma.user.create({
          data: {
            name: u.name,
            email: u.email,
            password: hashedPw,
            role: "user",
            isEmailVerified: true,
            isActive: true,
            isPaid: false,
          },
        });
        console.log(`  ✓ Created user: ${u.name} (${u.email})`);
      } else {
        console.log(`  ○ Using existing user: ${u.name} (${u.email})`);
      }
      createdUsers.push({ id: user.id, name: user.name });
    }

    // ── 3. Get or create a service ────────────────────────────────────

    let service = await prisma.service.findFirst();

    if (!service) {
      service = await prisma.service.create({
        data: {
          name: "Web Development",
          description:
            "Professional web development services including frontend, backend, and full-stack solutions.",
          iconPublicId: "",
          heroId: null,
        },
      });
      console.log(`  ✓ Created demo service: ${service.name}`);
    } else {
      console.log(`  ○ Using existing service: ${service.name}`);
    }

    // ── 4. Seed demo listings ─────────────────────────────────────────

    const listingData = [
      {
        sellerIdx: 0,
        title: "Professional Web Development",
        slug: "professional-web-development",
        description:
          "We build modern, responsive web applications using React, Next.js, and Node.js. From landing pages to complex SaaS platforms.",
        address: "123 Tech Street, Silicon Valley, CA",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        weekend: ["Saturday"],
        timeSlot: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
        basePrice: "1500",
        hourlyPrice: "75",
        dailyPrice: "500",
        estimatedDuration: "2-4 weeks",
      },
      {
        sellerIdx: 0,
        title: "Mobile App Development",
        slug: "mobile-app-development",
        description:
          "Cross-platform mobile applications built with React Native. iOS and Android support with native performance.",
        address: "123 Tech Street, Silicon Valley, CA",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        weekend: [],
        timeSlot: ["10:00", "11:00", "13:00", "14:00", "15:00"],
        basePrice: "2500",
        hourlyPrice: "85",
        dailyPrice: "600",
        estimatedDuration: "4-8 weeks",
      },
      {
        sellerIdx: 0,
        title: "UI/UX Design Consultation",
        slug: "ui-ux-design-consultation",
        description:
          "Expert UI/UX design services including wireframing, prototyping, user research, and usability testing.",
        address: "123 Tech Street, Silicon Valley, CA",
        days: ["Monday", "Wednesday", "Friday"],
        weekend: [],
        timeSlot: ["09:00", "10:00", "11:00", "14:00"],
        basePrice: "800",
        hourlyPrice: "60",
        dailyPrice: "400",
        estimatedDuration: "1-2 weeks",
      },
      {
        sellerIdx: 1,
        title: "Cloud Infrastructure Setup",
        slug: "cloud-infrastructure-setup",
        description:
          "AWS/Azure/GCP cloud infrastructure setup, migration, and management. Includes CI/CD pipelines and monitoring.",
        address: "456 Cloud Avenue, Seattle, WA",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        weekend: ["Saturday", "Sunday"],
        timeSlot: ["08:00", "09:00", "10:00", "11:00", "12:00"],
        basePrice: "3000",
        hourlyPrice: "100",
        dailyPrice: "700",
        estimatedDuration: "3-6 weeks",
      },
      {
        sellerIdx: 1,
        title: "DevOps & Automation",
        slug: "devops-automation",
        description:
          "Complete DevOps setup including Docker, Kubernetes, Terraform, and automated deployment pipelines.",
        address: "456 Cloud Avenue, Seattle, WA",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        weekend: [],
        timeSlot: ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00"],
        basePrice: "2000",
        hourlyPrice: "90",
        dailyPrice: "650",
        estimatedDuration: "2-4 weeks",
      },
      {
        sellerIdx: 1,
        title: "Cybersecurity Audit",
        slug: "cybersecurity-audit",
        description:
          "Comprehensive security audit including penetration testing, vulnerability assessment, and remediation planning.",
        address: "456 Cloud Avenue, Seattle, WA",
        days: ["Monday", "Tuesday", "Thursday", "Friday"],
        weekend: [],
        timeSlot: ["10:00", "11:00", "13:00", "14:00", "15:00", "16:00"],
        basePrice: "3500",
        hourlyPrice: "120",
        dailyPrice: "800",
        estimatedDuration: "1-2 weeks",
      },
    ];

    const createdListings: Array<{
      id: string;
      title: string;
      slug: string;
    }> = [];

    for (const listing of listingData) {
      const exists = await prisma.listing.findUnique({
        where: { slug: listing.slug },
      });

      if (exists) {
        console.log(`  ○ Listing already exists: "${listing.title}"`);
        createdListings.push({
          id: exists.id,
          title: exists.title,
          slug: exists.slug,
        });
        continue;
      }

      const seller = createdSellers[listing.sellerIdx];

      const created = await prisma.listing.create({
        data: {
          userId: seller.id,
          title: listing.title,
          slug: listing.slug,
          serviceId: service.id,
          description: listing.description,
          address: listing.address,
          media: [],
          days: listing.days,
          weekend: listing.weekend,
          timeSlot: listing.timeSlot,
          basePrice: listing.basePrice,
          hourlyPrice: listing.hourlyPrice,
          dailyPrice: listing.dailyPrice,
          estimatedDuration: listing.estimatedDuration,
        },
      });

      console.log(
        `  ✓ Created listing: "${listing.title}" (slug: ${listing.slug})`
      );
      createdListings.push({
        id: created.id,
        title: created.title,
        slug: created.slug,
      });
    }

    // ── 5. Seed user reviews ──────────────────────────────────────────

    const reviewData = [
      {
        listingIdx: 0,
        userIdx: 0,
        rating: 5,
        review:
          "Amazing work! The team delivered a stunning website ahead of schedule. Highly recommended!",
      },
      {
        listingIdx: 0,
        userIdx: 1,
        rating: 4.5,
        review:
          "Great communication and excellent technical skills. The final product exceeded our expectations.",
      },
      {
        listingIdx: 1,
        userIdx: 2,
        rating: 5,
        review:
          "The mobile app they built for us is fantastic. Smooth performance and beautiful design.",
      },
      {
        listingIdx: 2,
        userIdx: 0,
        rating: 4,
        review:
          "Good UI/UX consultation. Provided valuable insights that improved our product significantly.",
      },
      {
        listingIdx: 3,
        userIdx: 1,
        rating: 5,
        review:
          "Our cloud migration was seamless. Zero downtime and significant cost savings. Exceptional service!",
      },
      {
        listingIdx: 3,
        userIdx: 2,
        rating: 4.5,
        review:
          "Professional and knowledgeable. The CI/CD pipeline setup has transformed our deployment process.",
      },
      {
        listingIdx: 4,
        userIdx: 0,
        rating: 5,
        review:
          "Best DevOps engineer we've worked with. Automated everything and documented thoroughly.",
      },
      {
        listingIdx: 5,
        userIdx: 1,
        rating: 4,
        review:
          "Comprehensive security audit. Found several vulnerabilities we weren't aware of and provided clear remediation steps.",
      },
    ];

    let reviewsCreated = 0;
    for (const review of reviewData) {
      const listing = createdListings[review.listingIdx];
      const user = createdUsers[review.userIdx];

      // Check if this user already reviewed this listing
      const existingReview = await prisma.userReview.findFirst({
        where: { userId: user.id, listingId: listing.id },
      });

      if (existingReview) {
        continue;
      }

      await prisma.userReview.create({
        data: {
          userId: user.id,
          listingId: listing.id,
          rating: review.rating,
          review: review.review,
        },
      });
      reviewsCreated++;
    }

    if (reviewsCreated > 0) {
      console.log(`\n  ✓ Created ${reviewsCreated} user reviews`);
    } else {
      console.log(`\n  ○ All reviews already exist, skipping`);
    }

    // ── Summary ───────────────────────────────────────────────────────

    console.log("\n╔══════════════════════════════════════════════╗");
    console.log("║         Seeding Complete!                   ║");
    console.log("╠══════════════════════════════════════════════╣");
    console.log(`║  Listings: ${String(createdListings.length).padStart(25)} ║`);
    console.log(`║  Reviews:  ${String(reviewsCreated).padStart(25)} ║`);
    console.log(`║  Sellers:  ${String(createdSellers.length).padStart(25)} ║`);
    console.log(`║  Users:    ${String(createdUsers.length).padStart(25)} ║`);
    console.log("╚══════════════════════════════════════════════╝");

    console.log("\nDemo slugs you can test:");
    for (const l of createdListings) {
      console.log(`  • ${l.slug}`);
    }

    // ── 6. Verify getListingBySlug works ───────────────────────────

    console.log("\n── Testing getListingBySlug ──\n");

    const listingService = new ListingService();
    let testsPassed = 0;
    let testsFailed = 0;

    // Test 1: Existing slug returns a listing
    const testSlug = createdListings[0].slug;
    try {
      const result = await listingService.getListingBySlug(testSlug);
      if (result && result.slug === testSlug) {
        console.log(`  ✓ getListingBySlug("${testSlug}") → OK`);
        console.log(`    Title: ${result.title}`);
        console.log(`    Reviews: ${result.userReview?.length ?? 0}`);
        testsPassed++;
      } else {
        console.log(`  ✗ getListingBySlug("${testSlug}") → unexpected result`);
        testsFailed++;
      }
    } catch (err) {
      console.log(`  ✗ getListingBySlug("${testSlug}") → error: ${err}`);
      testsFailed++;
    }

    // Test 2: Non-existent slug throws 404
    try {
      await listingService.getListingBySlug("non-existent-slug");
      console.log(`  ✗ getListingBySlug("non-existent-slug") → should have thrown`);
      testsFailed++;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "statusCode" in err &&
        (err as { statusCode: number }).statusCode === 404
      ) {
        console.log(`  ✓ getListingBySlug("non-existent-slug") → 404 OK`);
        testsPassed++;
      } else {
        console.log(
          `  ✗ getListingBySlug("non-existent-slug") → wrong error: ${err}`
        );
        testsFailed++;
      }
    }

    // Test 3: All seeded slugs are accessible
    let allAccessible = true;
    for (const l of createdListings) {
      try {
        const result = await listingService.getListingBySlug(l.slug);
        if (!result || result.slug !== l.slug) {
          console.log(`  ✗ Could not verify listing: ${l.slug}`);
          allAccessible = false;
        }
      } catch {
        console.log(`  ✗ Failed to fetch listing by slug: ${l.slug}`);
        allAccessible = false;
      }
    }
    if (allAccessible) {
      console.log(`  ✓ All ${createdListings.length} listings accessible by slug`);
      testsPassed++;
    } else {
      testsFailed++;
    }

    console.log(
      `\n  Results: ${testsPassed} passed, ${testsFailed} failed`
    );
  } catch (error) {
    console.error("[ListingSeeder] Error seeding data:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log("\n[ListingSeeder] Disconnected from database.");
  }
}

seedListings();
