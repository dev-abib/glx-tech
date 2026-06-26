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
      {
        email: "seller3@demo.com",
        name: "Carol Williams",
        password: "12345678",
      },
      {
        email: "seller4@demo.com",
        name: "David Chen",
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
      { email: "reviewer4@demo.com", name: "Frank Miller" },
      { email: "reviewer5@demo.com", name: "Grace Lee" },
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

    // ── 3. Get or create services ────────────────────────────────────

    const serviceData = [
      {
        name: "Web Development",
        description:
          "Professional web development services including frontend, backend, and full-stack solutions.",
      },
      {
        name: "Graphic Design",
        description:
          "Creative graphic design services including logos, branding, marketing materials, and illustrations.",
      },
      {
        name: "Data Science",
        description:
          "Data analytics, machine learning, and AI consulting services for data-driven decision making.",
      },
    ];

    const createdServices: Array<{ id: string; name: string }> = [];
    for (const sd of serviceData) {
      let svc = await prisma.service.findFirst({
        where: { name: sd.name },
      });
      if (!svc) {
        svc = await prisma.service.create({
          data: {
            name: sd.name,
            description: sd.description,
            iconPublicId: "",
            heroId: null,
          },
        });
        console.log(`  ✓ Created service: ${svc.name}`);
      } else {
        console.log(`  ○ Using existing service: ${svc.name}`);
      }
      createdServices.push({ id: svc.id, name: svc.name });
    }

    // Helper to pick a service by index (cyclically)
    const getServiceId = (idx: number) =>
      createdServices[idx % createdServices.length].id;

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
      // ── Seller 2 (Carol) — Graphic Design listings ──
      {
        sellerIdx: 2,
        title: "Logo & Brand Identity Design",
        slug: "logo-brand-identity-design",
        description:
          "Custom logo design and complete brand identity packages including color palettes, typography, and brand guidelines.",
        address: "789 Design Boulevard, Austin, TX",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        weekend: [],
        timeSlot: ["09:00", "10:00", "11:00", "14:00", "15:00"],
        basePrice: "600",
        hourlyPrice: "45",
        dailyPrice: "300",
        estimatedDuration: "1-2 weeks",
      },
      {
        sellerIdx: 2,
        title: "Social Media Graphics Pack",
        slug: "social-media-graphics-pack",
        description:
          "Eye-catching social media graphics for Instagram, Facebook, LinkedIn, and Twitter. Templates included for consistent branding.",
        address: "789 Design Boulevard, Austin, TX",
        days: ["Monday", "Wednesday", "Friday"],
        weekend: ["Saturday"],
        timeSlot: ["10:00", "11:00", "13:00", "14:00"],
        basePrice: "350",
        hourlyPrice: "35",
        dailyPrice: "200",
        estimatedDuration: "3-5 days",
      },
      {
        sellerIdx: 2,
        title: "Print & Marketing Materials",
        slug: "print-marketing-materials",
        description:
          "Professional print design for brochures, flyers, business cards, banners, and trade show displays.",
        address: "789 Design Boulevard, Austin, TX",
        days: ["Monday", "Tuesday", "Thursday", "Friday"],
        weekend: [],
        timeSlot: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
        basePrice: "500",
        hourlyPrice: "40",
        dailyPrice: "250",
        estimatedDuration: "1-2 weeks",
      },
      // ── Seller 3 (David) — Data Science listings ──
      {
        sellerIdx: 3,
        title: "Data Analytics & Dashboard Setup",
        slug: "data-analytics-dashboard-setup",
        description:
          "End-to-end data analytics setup including data pipeline construction, cleaning, analysis, and interactive dashboards.",
        address: "321 Data Drive, San Francisco, CA",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        weekend: ["Saturday"],
        timeSlot: ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00"],
        basePrice: "2800",
        hourlyPrice: "95",
        dailyPrice: "650",
        estimatedDuration: "3-5 weeks",
      },
      {
        sellerIdx: 3,
        title: "Machine Learning Model Development",
        slug: "machine-learning-model-development",
        description:
          "Custom ML model development for classification, regression, NLP, and computer vision tasks. Includes training, evaluation, and deployment.",
        address: "321 Data Drive, San Francisco, CA",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        weekend: [],
        timeSlot: ["09:00", "10:00", "11:00", "14:00", "15:00"],
        basePrice: "4500",
        hourlyPrice: "130",
        dailyPrice: "900",
        estimatedDuration: "4-8 weeks",
      },
      {
        sellerIdx: 3,
        title: "Business Intelligence Consulting",
        slug: "business-intelligence-consulting",
        description:
          "Strategic BI consulting to help your organization leverage data for better decision-making. Includes KPI definition and reporting.",
        address: "321 Data Drive, San Francisco, CA",
        days: ["Monday", "Wednesday", "Friday"],
        weekend: [],
        timeSlot: ["10:00", "11:00", "14:00", "15:00"],
        basePrice: "1800",
        hourlyPrice: "80",
        dailyPrice: "550",
        estimatedDuration: "2-3 weeks",
      },
    ];

    const createdListings: Array<{
      id: string;
      title: string;
      slug: string;
    }> = [];

    for (const [i, listing] of listingData.entries()) {
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
          serviceId: getServiceId(i),
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
      // ── Original reviews ──
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
      // ── New reviews: lower ratings for realism ──
      {
        listingIdx: 1,
        userIdx: 3,
        rating: 3,
        review:
          "The app works well but the development took longer than promised. Communication could have been better during the process.",
      },
      {
        listingIdx: 2,
        userIdx: 4,
        rating: 2.5,
        review:
          "The UI/UX consultation was decent but the deliverables felt generic. Expected more tailored recommendations for our specific industry.",
      },
      {
        listingIdx: 4,
        userIdx: 3,
        rating: 2,
        review:
          "DevOps setup had several issues post-deployment. The automation scripts broke twice in the first week. Had to bring in another team to fix things.",
      },
      // ── New reviews: Graphic Design listings ──
      {
        listingIdx: 6,
        userIdx: 0,
        rating: 5,
        review:
          "Incredible logo design! Carol really understood our vision and delivered something beyond what we imagined. The brand guidelines were thorough.",
      },
      {
        listingIdx: 6,
        userIdx: 4,
        rating: 4,
        review:
          "Great brand identity package. The color palette and typography choices were spot-on. Would have liked more iterations on the logo.",
      },
      {
        listingIdx: 7,
        userIdx: 1,
        rating: 3.5,
        review:
          "Social media graphics look good overall. Some templates needed minor adjustments but customer service was responsive.",
      },
      {
        listingIdx: 8,
        userIdx: 2,
        rating: 4,
        review:
          "Professional print materials delivered on time. The business cards and brochures look fantastic. Great attention to detail.",
      },
      {
        listingIdx: 8,
        userIdx: 3,
        rating: 1.5,
        review:
          "Disappointed with the print work. Colors came out different from what was shown in the proof. Had to get them reprinted elsewhere.",
      },
      // ── New reviews: Data Science listings ──
      {
        listingIdx: 9,
        userIdx: 0,
        rating: 5,
        review:
          "The dashboard transformed how we view our business data. David set up everything from data pipelines to beautiful visualizations. Outstanding work!",
      },
      {
        listingIdx: 9,
        userIdx: 2,
        rating: 4.5,
        review:
          "Excellent analytics setup. The dashboards are intuitive and insightful. Slight delay in delivery but the quality made up for it.",
      },
      {
        listingIdx: 10,
        userIdx: 1,
        rating: 4,
        review:
          "The ML model performs well in production. Accuracy exceeded our benchmarks. Documentation was clear and deployment was smooth.",
      },
      {
        listingIdx: 10,
        userIdx: 4,
        rating: 3,
        review:
          "Model works but the training pipeline was complex to understand. Could have benefited from better documentation and simpler architecture.",
      },
      {
        listingIdx: 11,
        userIdx: 3,
        rating: 5,
        review:
          "BI consulting was eye-opening. Helped us identify key metrics we weren't tracking. The reporting setup has already paid for itself.",
      },
      {
        listingIdx: 11,
        userIdx: 0,
        rating: 4,
        review:
          "Solid BI consulting engagement. Good strategic recommendations and clean report designs. Would work with David again.",
      },
      // ── Extra reviews for listings with only 1 review ──
      {
        listingIdx: 5,
        userIdx: 2,
        rating: 4.5,
        review:
          "Security audit was very thorough! The team found issues we overlooked and provided a detailed remediation roadmap. Worth every penny.",
      },
      {
        listingIdx: 5,
        userIdx: 4,
        rating: 3.5,
        review:
          "Good security assessment overall. The report was comprehensive but took longer to deliver than initially estimated.",
      },
      {
        listingIdx: 7,
        userIdx: 0,
        rating: 4,
        review:
          "Social media templates saved us so much time! Consistent branding across all platforms now. Would recommend for small businesses.",
      },
      {
        listingIdx: 7,
        userIdx: 2,
        rating: 3,
        review:
          "Decent graphics pack but the templates needed some tweaking for our brand colors. Good starting point though.",
      },
      {
        listingIdx: 7,
        userIdx: 4,
        rating: 4.5,
        review:
          "Love the social media designs! Our engagement went up significantly after using these templates. Carol has a great eye for design.",
      },
      // ── Extra reviews for more diversity ──
      {
        listingIdx: 0,
        userIdx: 3,
        rating: 4,
        review:
          "Solid web development work. The site performs well and the code quality is excellent. Minor delays in the review phase but overall great.",
      },
      {
        listingIdx: 0,
        userIdx: 4,
        rating: 5,
        review:
          "Alice and her team are fantastic! They built our entire SaaS platform from scratch. Modern tech stack, clean code, and great UI.",
      },
      {
        listingIdx: 3,
        userIdx: 0,
        rating: 4.5,
        review:
          "Cloud migration was handled professionally. Minimal downtime and great documentation. Bob really knows his AWS stuff.",
      },
      {
        listingIdx: 3,
        userIdx: 3,
        rating: 5,
        review:
          "Incredible cloud architecture setup! Our infrastructure costs dropped by 40% after the migration. Absolutely recommend Bob's services.",
      },
      {
        listingIdx: 6,
        userIdx: 1,
        rating: 4.5,
        review:
          "Carol's logo design completely transformed our brand. We've received so many compliments. The brand guidelines made implementation easy.",
      },
      {
        listingIdx: 6,
        userIdx: 2,
        rating: 5,
        review:
          "Best branding investment we've made! The complete identity package was worth every dollar. Professional, creative, and timely delivery.",
      },
      {
        listingIdx: 9,
        userIdx: 1,
        rating: 4,
        review:
          "Data dashboards are clean and insightful. David helped us identify key metrics we weren't tracking before. Highly skilled analyst.",
      },
      {
        listingIdx: 9,
        userIdx: 4,
        rating: 5,
        review:
          "Game-changing analytics setup! The real-time dashboards transformed how our management team makes decisions. Outstanding work!",
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
