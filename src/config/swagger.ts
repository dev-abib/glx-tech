import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as yaml from "js-yaml";
import { env } from "./env.js";
import { APP_NAME } from "../utils/constant.js";

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);
const API_DIR: string = path.resolve(__dirname, "..", "..", "api");

function loadYaml<T = unknown>(relativePath: string): T {
  return yaml.load(fs.readFileSync(path.join(API_DIR, relativePath), "utf8")) as T;
}

function loadPathFragment(file: string, fragment: string): Record<string, unknown> {
  const doc: Record<string, unknown> = loadYaml<Record<string, unknown>>(path.join("paths", file));
  const value: unknown = doc[fragment];
  if (!value) throw new Error('Fragment ' + JSON.stringify(fragment) + ' not found in api/paths/' + file);
  return value as Record<string, unknown>;
}

function loadSchemaFragment(file: string, fragment: string): Record<string, unknown> {
  const doc: Record<string, unknown> = loadYaml<Record<string, unknown>>(path.join("components", "schemas", file));
  const value: unknown = doc[fragment];
  if (!value) throw new Error('Fragment ' + JSON.stringify(fragment) + ' not found in api/components/schemas/' + file);
  return value as Record<string, unknown>;
}

const servers: Array<{ url: string; description: string }> = [
  { url: 'https://glx-tech-pink.vercel.app' + env.API_VERSION, description: "Production server (Vercel)" },
  { url: 'http://localhost:' + env.PORT + env.API_VERSION, description: "Development server" },
];

const openapiBase: Record<string, unknown> = loadYaml<Record<string, unknown>>("openapi.yaml");
const securitySchemes: Record<string, unknown> = loadYaml<Record<string, unknown>>("components/securitySchemes.yaml");

const schemas: Record<string, unknown> = {};
const S = (f: string, n: string): void => { schemas[n] = loadSchemaFragment(f, n); };
S("common.yaml", "SystemReport"); S("common.yaml", "ApiResponse"); S("common.yaml", "ApiError"); S("common.yaml", "Pagination");
S("auth.yaml", "CreateUserInput"); S("auth.yaml", "VerifyUserInput"); S("auth.yaml", "LoginUserInput"); S("auth.yaml", "LoginResponse");
S("auth.yaml", "RefreshTokenInput"); S("auth.yaml", "ForgotPasswordInput"); S("auth.yaml", "ResendOtpInput"); S("auth.yaml", "ResetPasswordInput");
S("user.yaml", "SafeUser"); S("user.yaml", "UpdateUserInput"); S("user.yaml", "ChangePasswordInput");
S("admin.yaml", "AdminLoginInput"); S("admin.yaml", "AdminLoginResponse"); S("admin.yaml", "CreateAdminInput"); S("admin.yaml", "AdminProfile");
S("admin.yaml", "AdminUpdateSelfInput"); S("admin.yaml", "AdminUpdateUserInput"); S("admin.yaml", "AdminChangePasswordInput");
S("cms-hero.yaml", "Hero"); S("cms-hero.yaml", "CreateHeroInput"); S("cms-hero.yaml", "UpdateHeroInput");
S("cms-hero.yaml", "Service"); S("cms-hero.yaml", "CreateServiceInput"); S("cms-hero.yaml", "UpdateServiceInput");
S("cms-contact.yaml", "ContactInquiry"); S("cms-contact.yaml", "CreateContactInput"); S("cms-contact.yaml", "ReplyContactInput"); S("cms-contact.yaml", "InquiryStats");
S("cms-about.yaml", "AboutUs"); S("cms-about.yaml", "CreateAboutInput"); S("cms-about.yaml", "UpdateAboutInput");
S("cms-settings.yaml", "SiteSettings"); S("cms-settings.yaml", "CreateSiteSettingsInput"); S("cms-settings.yaml", "UpdateSiteSettingsInput");
S("cms-settings.yaml", "SocialLink"); S("cms-settings.yaml", "CreateSocialInput"); S("cms-settings.yaml", "UpdateSocialInput");
S("cms-reviews.yaml", "ReviewSection"); S("cms-reviews.yaml", "CreateReviewSectionInput"); S("cms-reviews.yaml", "UpdateReviewSectionInput");
S("cms-reviews.yaml", "Review"); S("cms-reviews.yaml", "CreateReviewInput"); S("cms-reviews.yaml", "UpdateReviewInput");
S("listing.yaml", "Listing"); S("listing.yaml", "CreateListingInput"); S("listing.yaml", "UpdateListingInput");
S("listing.yaml", "UserReview"); S("listing.yaml", "CreateUserReviewInput"); S("listing.yaml", "UpdateUserReviewInput");
S("newsletter.yaml", "NewsLetterInput"); S("seller.yaml", "UpdateUserAsSellerInput");
S("admin-campaigns.yaml", "Campaign"); S("admin-campaigns.yaml", "CreateCampaignInput");
S("appointment.yaml", "UpdateAppointmentStatusInput"); S("appointment.yaml", "BookedTimes");
S("stripe-donate.yaml", "CreateDonationInput"); S("stripe-donate.yaml", "DonationPaymentLinkResponse");
S("stripe-donate.yaml", "Donation"); S("stripe-donate.yaml", "DonationListResponse"); S("stripe-donate.yaml", "DonationStatsResponse");

const paths: Record<string, unknown> = {};
// P(file, pathKey, fragmentName) — load fragmentName from YAML file and assign to pathKey in paths
const P = (f: string, p: string, frag: string): void => { paths[p] = loadPathFragment(f, frag); };
P("health.yaml", "/health", "health");
// ── Users — Authentication ──────────────────────────────────────────
P("users-auth.yaml", "/users/create-user", "create-user");
P("users-auth.yaml", "/users/verify-user", "verify-user");
P("users-auth.yaml", "/users/login-user", "login-user");
P("users-auth.yaml", "/users/resend-otp", "resend-otp");
P("users-auth.yaml", "/users/forgot-password", "forgot-password");
P("users-auth.yaml", "/users/verify-reset-otp", "verify-reset-otp");
P("users-auth.yaml", "/users/reset-pass", "reset-pass");
P("users-auth.yaml", "/users/refresh-token", "refresh-token");
// ── Users — Profile ─────────────────────────────────────────────────
P("users-profile.yaml", "/users/change-password", "change-password");
P("users-profile.yaml", "/users/get-me", "get-me");
P("users-profile.yaml", "/users/update-me", "update-me");
P("users-profile.yaml", "/users/delete-me", "delete-me");
P("users-profile.yaml", "/users/logout", "logout");
// ── Users — Role ────────────────────────────────────────────────────
P("users-role.yaml", "/users/update-as-seller", "update-as-seller");
P("users-role.yaml", "/users/switch-role", "switch-role");
// ── Users — Admin ───────────────────────────────────────────────────
P("users-admin.yaml", "/users/gt-all-users", "gt-all-users");
// ── Admin — Authentication ──────────────────────────────────────────
P("admin-auth.yaml", "/admin/login", "login");
P("admin-auth.yaml", "/admin/refresh-token", "refresh-token");
// ── Admin — Profile ─────────────────────────────────────────────────
P("admin-profile.yaml", "/admin/get-me", "get-me");
P("admin-profile.yaml", "/admin/update-me", "update-me");
P("admin-profile.yaml", "/admin/change-password", "change-password");
P("admin-profile.yaml", "/admin/get-user/{id}", "get-user");
P("admin-profile.yaml", "/admin/delete-user/{id}", "delete-user");
// ── Admin — Super Admin ─────────────────────────────────────────────
P("admin-super.yaml", "/admin/create-admin", "create-admin");
P("admin-super.yaml", "/admin/gt-all-users", "gt-all-users");
P("admin-super.yaml", "/admin/gt-all-admins", "gt-all-admins");
P("admin-super.yaml", "/admin/delete-admin/{id}", "delete-admin");
P("admin-super.yaml", "/admin/update-admin/{id}", "update-admin");
// ── CMS — Hero & Services ───────────────────────────────────────────
P("cms-hero.yaml", "/cms/hero", "get-hero");
P("cms-hero.yaml", "/cms/create-hero", "create-hero");
P("cms-hero.yaml", "/cms/update-hero/{id}", "update-hero");
P("cms-hero.yaml", "/cms/hero/{heroId}/services", "get-services");
P("cms-hero.yaml", "/cms/hero/{heroId}/create-service", "create-service");
P("cms-hero.yaml", "/cms/update-service/{serviceId}", "update-service");
P("cms-hero.yaml", "/cms/delete-service/{serviceId}", "delete-service");
// ── CMS — Contact ───────────────────────────────────────────────────
P("cms-contact.yaml", "/cms/submit-inquiry", "submit-inquiry");
P("cms-contact.yaml", "/cms/gt-all-inquiries", "gt-all-inquiries");
P("cms-contact.yaml", "/cms/get-inquiry-stats", "get-inquiry-stats");
P("cms-contact.yaml", "/cms/get-inquiry/{id}", "get-inquiry");
P("cms-contact.yaml", "/cms/mark-inquiry-read/{id}", "mark-inquiry-read");
P("cms-contact.yaml", "/cms/reply-inquiry/{id}", "reply-inquiry");
P("cms-contact.yaml", "/cms/delete-inquiry/{id}", "delete-inquiry");
// ── CMS — About Us ──────────────────────────────────────────────────
P("cms-about.yaml", "/cms/get-about", "get-about");
P("cms-about.yaml", "/cms/create-about", "create-about");
P("cms-about.yaml", "/cms/update-about/{id}", "update-about");
P("cms-about.yaml", "/cms/delete-about-image/{id}", "delete-about-image");
// ── CMS — Site Settings ─────────────────────────────────────────────
P("cms-settings.yaml", "/cms/site-settings", "gt-site-settings");
P("cms-settings.yaml", "/cms/create-site-settings", "create-site-settings");
P("cms-settings.yaml", "/cms/update-site-settings/{id}", "update-site-settings");
P("cms-settings.yaml", "/cms/site-settings/socials", "get-social-links");
P("cms-settings.yaml", "/cms/site-settings/create-social", "create-social-link");
P("cms-settings.yaml", "/cms/site-settings/update-social/{socialId}", "update-social-link");
P("cms-settings.yaml", "/cms/site-settings/delete-social/{socialId}", "delete-social-link");
// ── CMS — Reviews ───────────────────────────────────────────────────
P("cms-reviews.yaml", "/cms/review/section", "get-review-section");
P("cms-reviews.yaml", "/cms/review/create-section", "create-review-section");
P("cms-reviews.yaml", "/cms/review/update-section/{id}", "update-review-section");
P("cms-reviews.yaml", "/cms/review/delete-section/{id}", "delete-review-section");
P("cms-reviews.yaml", "/cms/review/{sectionId}/reviews", "get-reviews");
P("cms-reviews.yaml", "/cms/review/{reviewId}", "get-review");
P("cms-reviews.yaml", "/cms/review/{sectionId}/create-review", "create-review");
P("cms-reviews.yaml", "/cms/review/update-review/{reviewId}", "update-review");
P("cms-reviews.yaml", "/cms/review/delete-review/{reviewId}", "delete-review");
// ── Listings & Reviews ──────────────────────────────────────────────
P("listings.yaml", "/listings/create-listing", "create-listing");
P("listings.yaml", "/listings/get-all-listings", "get-all-listings");
P("listings.yaml", "/listings/listing/{slug}", "get-listing");
P("listings.yaml", "/listings/listing/{slug}/related", "get-related-listings");
P("listings.yaml", "/listings/my-listings", "get-my-listings");
P("listings.yaml", "/listings/update-listing/{id}", "update-listing");
P("listings.yaml", "/listings/delete-listing/{id}", "delete-listing");
P("listings.yaml", "/listings/listing/{listingId}/reviews", "get-listing-reviews");
P("listings.yaml", "/listings/review/{reviewId}", "get-review");
P("listings.yaml", "/listings/listing/{listingId}/create-review", "create-review");
P("listings.yaml", "/listings/update-review/{reviewId}", "update-review");
P("listings.yaml", "/listings/delete-review/{reviewId}", "delete-review");
// ── Admin — Listings, Reviews & Dashboard ───────────────────────────
P("admin-listings.yaml", "/admin/listings", "get-all-listings");
P("admin-listings.yaml", "/admin/listings/listing/{slug}", "get-listing-by-slug");
P("admin-listings.yaml", "/admin/listings/{listingId}/reviews", "get-listing-reviews");
P("admin-listings.yaml", "/admin/reviews", "get-all-reviews");
P("admin-listings.yaml", "/admin/dashboard-trends", "get-dashboard-trends");

// ── Newsletter ──────────────────────────────────────────────────────
P("newsletter.yaml", "/newsletter/subscribe", "subscribe");
P("newsletter.yaml", "/newsletter/unsubscribe", "unsubscribe");

// ── Admin — Campaigns ────────────────────────────────────────────────
P("admin-campaigns.yaml", "/admin/campaigns", "campaigns");
P("admin-campaigns.yaml", "/admin/campaigns/{id}/send", "send-campaign");
P("admin-campaigns.yaml", "/admin/campaigns/subscriber-count", "get-subscriber-count");

// ── Donations / Stripe ────────────────────────────────────────────────
P("stripe-donate.yaml", "/stripe/donate/checkout", "quick-donate");
P("stripe-donate.yaml", "/stripe/donate", "create-donation");
P("stripe-donate.yaml", "/stripe/donations", "get-donations");
P("stripe-donate.yaml", "/stripe/donations/stats", "get-donation-stats");
P("stripe-donate.yaml", "/stripe/webhook", "stripe-webhook");

const infoDescription: string = ((openapiBase?.info as Record<string, unknown> | undefined)?.description as string) ?? '';

export const swaggerSpec: Record<string, unknown> = {
  openapi: "3.0.0",
  info: {
    title: APP_NAME + " API Documentation",
    version: "1.0.0",
    description: infoDescription,
  },
  servers,
  tags: openapiBase.tags,
  components: { securitySchemes, schemas },
  paths,
};
