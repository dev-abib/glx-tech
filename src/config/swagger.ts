import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env.js";
import { APP_NAME } from "../utils/constant.js";

const version = "1.0.0";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: `${APP_NAME} — Documentation`,
      version,
      description: `
## Nexus Backend API

A comprehensive backend API built with **Express 5**, **TypeScript**, **Prisma (PostgreSQL)**, and **Zod** validation.

### Authentication

Most endpoints require authentication via **JWT Bearer tokens**.

| Role | Description |
|------|-------------|
| \`user\` | Regular authenticated user |
| \`seller\` | Seller account with additional privileges |
| \`admin\` | Admin-level access |
| \`super_admin\` | Full system access |

**How to authenticate:**
1. Register or login to receive \`accessToken\` and \`refreshToken\`
2. Include the access token in the \`Authorization\` header: \`Bearer <token>\`
3. Alternatively, the token can be sent as an \`accessToken\` cookie

### Response Format

All API responses follow a consistent structure:

\`\`\`json
{
  "statusCode": 200,
  "success": true,
  "message": "Success message",
  "data": { ... }
}
\`\`\`

Error responses:
\`\`\`json
{
  "statusCode": 400,
  "success": false,
  "message": "Error description"
}
\`\`\`

### Base URL

\`${env.API_VERSION}\`

### Health Check

\`GET /health\` — Returns \`"system is up"\`
      `.trim(),
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: "Development server",
      },
      {
        url: "https://glx-tech-pink.vercel.app",
        description: "Production server (Vercel)",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Enter your JWT access token. Can be obtained via login/register endpoints.",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
          description:
            "Alternative: JWT access token sent as an 'accessToken' cookie.",
        },
      },
      schemas: {
        // ── Shared Response Wrappers ───────────────────────────────────
        ApiResponse: {
          type: "object",
          properties: {
            statusCode: { type: "integer", example: 200 },
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operation successful" },
            data: { type: "object", nullable: true },
          },
        },
        ApiError: {
          type: "object",
          properties: {
            statusCode: { type: "integer", example: 400 },
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Validation error" },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 10 },
            total: { type: "integer", example: 100 },
            totalPages: { type: "integer", example: 10 },
          },
        },

        // ── User Schemas ──────────────────────────────────────────────
        CreateUserInput: {
          type: "object",
          required: ["name", "email", "password", "confirmPassword", "phone"],
          properties: {
            name: {
              type: "string",
              example: "John Doe",
              minLength: 3,
              maxLength: 100,
            },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "P@ssw0rd!",
              minLength: 8,
            },
            confirmPassword: {
              type: "string",
              format: "password",
              example: "P@ssw0rd!",
            },
            phone: { type: "string", example: "+1234567890" },
          },
        },
        VerifyUserInput: {
          type: "object",
          required: ["email", "otp"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            otp: {
              type: "string",
              example: "1234",
              minLength: 4,
              maxLength: 4,
            },
          },
        },
        LoginUserInput: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "P@ssw0rd!",
            },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            token: {
              type: "object",
              properties: {
                accessToken: {
                  type: "string",
                  example: "eyJhbGciOiJIUzI1NiIs...",
                },
                refreshToken: {
                  type: "string",
                  example: "eyJhbGciOiJIUzI1NiIs...",
                },
              },
            },
            user: {
              type: "object",
              properties: {
                name: { type: "string", example: "John Doe" },
                email: { type: "string", example: "john@example.com" },
                avatar: {
                  type: "string",
                  nullable: true,
                  example: "https://res.cloudinary.com/...",
                },
              },
            },
          },
        },
        SafeUser: {
          type: "object",
          properties: {
            id: { type: "string", example: "uuid" },
            name: { type: "string", example: "John Doe" },
            email: { type: "string", example: "john@example.com" },
            role: {
              type: "string",
              enum: ["user", "seller", "admin", "super_admin"],
              example: "user",
            },
            avatar: { type: "string", nullable: true },
            avatarPublicId: { type: "string", nullable: true },
            phone: { type: "string", nullable: true, example: "+1234567890" },
            isEmailVerified: { type: "boolean", example: true },
            isActive: { type: "boolean", example: true },
            isPaid: { type: "boolean", example: false },
            address: { type: "string", nullable: true },
            lastLoginAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        UpdateUserInput: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "John Updated",
              minLength: 3,
              maxLength: 100,
            },
            email: {
              type: "string",
              format: "email",
              example: "john.updated@example.com",
            },
            phone: { type: "string", example: "+1987654321" },
            address: { type: "string", example: "123 Main St" },
          },
        },
        RefreshTokenInput: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIs...",
            },
          },
        },
        ChangePasswordInput: {
          type: "object",
          required: ["oldPassword", "password", "confirmPassword"],
          properties: {
            oldPassword: {
              type: "string",
              format: "password",
              example: "OldP@ss1!",
            },
            password: {
              type: "string",
              format: "password",
              example: "NewP@ss1!",
            },
            confirmPassword: {
              type: "string",
              format: "password",
              example: "NewP@ss1!",
            },
          },
        },
        ResetPasswordInput: {
          type: "object",
          required: ["password", "confirmPassword"],
          properties: {
            password: {
              type: "string",
              format: "password",
              example: "NewP@ss1!",
            },
            confirmPassword: {
              type: "string",
              format: "password",
              example: "NewP@ss1!",
            },
          },
        },
        ForgotPasswordInput: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
          },
        },
        ResendOtpInput: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
          },
        },

        // ── Admin Schemas ─────────────────────────────────────────────
        AdminLoginInput: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "admin@example.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "AdminP@ss1!",
            },
          },
        },
        AdminLoginResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
            refreshToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIs...",
            },
            admin: {
              type: "object",
              properties: {
                id: { type: "string", example: "uuid" },
                name: { type: "string", example: "Admin User" },
                email: { type: "string", example: "admin@example.com" },
                role: { type: "string", enum: ["admin", "super_admin"] },
                avatar: { type: "string", nullable: true },
              },
            },
          },
        },
        CreateAdminInput: {
          type: "object",
          required: ["name", "email", "password", "confirmPassword", "role"],
          properties: {
            name: {
              type: "string",
              example: "New Admin",
              minLength: 3,
              maxLength: 100,
            },
            email: {
              type: "string",
              format: "email",
              example: "newadmin@example.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "AdminP@ss1!",
            },
            confirmPassword: {
              type: "string",
              format: "password",
              example: "AdminP@ss1!",
            },
            role: {
              type: "string",
              enum: ["admin", "super_admin"],
              example: "admin",
            },
            phone: { type: "string", example: "+1234567890" },
          },
        },
        AdminProfile: {
          type: "object",
          properties: {
            id: { type: "string", example: "uuid" },
            name: { type: "string", example: "Admin User" },
            email: { type: "string", example: "admin@example.com" },
            role: { type: "string", enum: ["admin", "super_admin"] },
            avatar: { type: "string", nullable: true },
            phone: { type: "string", nullable: true },
            isEmailVerified: { type: "boolean", example: true },
            isActive: { type: "boolean", example: true },
            isPaid: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        AdminUpdateSelfInput: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "Updated Admin",
              minLength: 3,
              maxLength: 100,
            },
            email: {
              type: "string",
              format: "email",
              example: "admin.updated@example.com",
            },
            phone: { type: "string", example: "+1987654321" },
          },
        },
        AdminUpdateUserInput: {
          type: "object",
          properties: {
            name: { type: "string", example: "Updated User" },
            email: {
              type: "string",
              format: "email",
              example: "user.updated@example.com",
            },
            phone: { type: "string", example: "+1987654321" },
            isActive: { type: "boolean", example: true },
            role: { type: "string", enum: ["user", "admin", "super_admin"] },
          },
        },
        AdminChangePasswordInput: {
          type: "object",
          required: ["oldPassword", "password", "confirmPassword"],
          properties: {
            oldPassword: {
              type: "string",
              format: "password",
              example: "OldP@ss1!",
            },
            password: {
              type: "string",
              format: "password",
              example: "NewP@ss1!",
            },
            confirmPassword: {
              type: "string",
              format: "password",
              example: "NewP@ss1!",
            },
          },
        },

        // ── CMS: Hero Schemas ──────────────────────────────────────────
        Hero: {
          type: "object",
          properties: {
            id: { type: "string", example: "uuid" },
            title: {
              type: "string",
              nullable: true,
              example: "Welcome to Nexus",
            },
            sub_title: {
              type: "string",
              nullable: true,
              example: "Your Digital Solution Partner",
            },
            highlighted_txt: {
              type: "string",
              nullable: true,
              example: "Innovation",
            },
            services: {
              type: "array",
              items: { $ref: "#/components/schemas/Service" },
            },
          },
        },
        CreateHeroInput: {
          type: "object",
          properties: {
            title: {
              type: "string",
              example: "Welcome to Nexus",
              maxLength: 200,
            },
            sub_title: {
              type: "string",
              example: "Your Digital Solution Partner",
              maxLength: 300,
            },
            highlighted_txt: {
              type: "string",
              example: "Innovation",
              maxLength: 200,
            },
          },
        },
        UpdateHeroInput: {
          type: "object",
          properties: {
            title: { type: "string", example: "Updated Title", maxLength: 200 },
            sub_title: {
              type: "string",
              example: "Updated Subtitle",
              maxLength: 300,
            },
            highlighted_txt: {
              type: "string",
              example: "Excellence",
              maxLength: 200,
            },
          },
        },

        // ── CMS: Service Schemas ───────────────────────────────────────
        Service: {
          type: "object",
          properties: {
            id: { type: "string", example: "uuid" },
            name: {
              type: "string",
              nullable: true,
              example: "Web Development",
            },
            description: {
              type: "string",
              nullable: true,
              example: "We build modern web applications",
            },
            icon: {
              type: "string",
              nullable: true,
              example: "https://res.cloudinary.com/...",
            },
            iconPublicId: { type: "string", example: "cms/services/abc123" },
            heroId: { type: "string", nullable: true, example: "uuid" },
          },
        },
        CreateServiceInput: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              example: "Web Development",
              maxLength: 100,
            },
            description: {
              type: "string",
              example: "We build modern web applications",
              maxLength: 500,
            },
            icon: { type: "string", example: "https://example.com/icon.svg" },
          },
        },
        UpdateServiceInput: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "Mobile Development",
              maxLength: 100,
            },
            description: {
              type: "string",
              example: "iOS & Android apps",
              maxLength: 500,
            },
            icon: {
              type: "string",
              example: "https://example.com/new-icon.svg",
            },
          },
        },

        // ── CMS: Contact Inquiry Schemas ───────────────────────────────
        ContactInquiry: {
          type: "object",
          properties: {
            id: { type: "string", example: "uuid" },
            name: { type: "string", example: "Jane Doe" },
            email: { type: "string", example: "jane@example.com" },
            phone: { type: "string", nullable: true, example: "+1234567890" },
            subject: {
              type: "string",
              nullable: true,
              example: "Partnership Inquiry",
            },
            message: {
              type: "string",
              example: "I'd like to partner with you...",
            },
            isRead: { type: "boolean", example: false },
            isReplied: { type: "boolean", example: false },
            replyMessage: { type: "string", nullable: true },
            repliedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateContactInput: {
          type: "object",
          required: ["name", "email", "message"],
          properties: {
            name: { type: "string", example: "Jane Doe", maxLength: 100 },
            email: {
              type: "string",
              format: "email",
              example: "jane@example.com",
            },
            phone: { type: "string", example: "+1234567890", maxLength: 30 },
            subject: {
              type: "string",
              example: "Partnership Inquiry",
              maxLength: 200,
            },
            message: {
              type: "string",
              example: "I'd like to discuss a potential partnership.",
              maxLength: 5000,
            },
          },
        },
        ReplyContactInput: {
          type: "object",
          required: ["replyMessage"],
          properties: {
            replyMessage: {
              type: "string",
              example: "Thank you for reaching out! We'll contact you shortly.",
              maxLength: 5000,
            },
          },
        },
        InquiryStats: {
          type: "object",
          properties: {
            total: { type: "integer", example: 50 },
            unread: { type: "integer", example: 10 },
            replied: { type: "integer", example: 5 },
          },
        },

        // ── CMS: About Us Schemas ──────────────────────────────────────
        AboutUs: {
          type: "object",
          properties: {
            id: { type: "string", example: "uuid" },
            title: { type: "string", example: "About Our Company" },
            description: {
              type: "string",
              example: "We are a leading technology company...",
            },
            image1: {
              type: "string",
              nullable: true,
              example: "https://res.cloudinary.com/...",
            },
            image1PublicId: { type: "string", nullable: true },
            image2: {
              type: "string",
              nullable: true,
              example: "https://res.cloudinary.com/...",
            },
            image2PublicId: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateAboutInput: {
          type: "object",
          required: ["title", "description"],
          properties: {
            title: {
              type: "string",
              example: "About Our Company",
              maxLength: 300,
            },
            description: {
              type: "string",
              example: "We are a leading technology company...",
              maxLength: 10000,
            },
          },
        },
        UpdateAboutInput: {
          type: "object",
          properties: {
            title: {
              type: "string",
              example: "Updated About Title",
              maxLength: 300,
            },
            description: {
              type: "string",
              example: "Updated company description...",
              maxLength: 10000,
            },
          },
        },
      },
    },
    tags: [
      { name: "Health", description: "Health check endpoint" },
      {
        name: "Users (Public)",
        description:
          "Public user endpoints — registration, login, password reset, etc.",
      },
      {
        name: "Users (Authenticated)",
        description: "Endpoints for authenticated user profile management",
      },
      {
        name: "Users (Role)",
        description: "Role switching between user and seller",
      },
      {
        name: "Users (Admin)",
        description: "Admin-only user management endpoints",
      },
      {
        name: "Admin (Public)",
        description: "Public admin authentication endpoints",
      },
      {
        name: "Admin (Super Admin)",
        description: "Super admin exclusive endpoints",
      },
      {
        name: "Admin (Authenticated)",
        description: "Endpoints for authenticated admin profile management",
      },
      { name: "CMS — Hero", description: "Homepage hero section management" },
      {
        name: "CMS — Services",
        description: "Hero service section management",
      },
      { name: "CMS — Contact", description: "Contact inquiry management" },
      { name: "CMS — About Us", description: "About Us section management" },
    ],
    paths: {
      // ══════════════════════════════════════════════════════════════════
      // HEALTH
      // ══════════════════════════════════════════════════════════════════
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          description:
            "Returns a simple response to confirm the server is running.",
          responses: {
            200: {
              description: "Server is up",
              content: {
                "text/html": {
                  schema: { type: "string", example: "system is up" },
                },
              },
            },
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════
      // USER — Public
      // ══════════════════════════════════════════════════════════════════
      "/users/create-user": {
        post: {
          tags: ["Users (Public)"],
          summary: "Create a new user account",
          description:
            "Registers a new user and sends an OTP to the provided email for verification.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateUserInput" },
              },
            },
          },
          responses: {
            201: {
              description: "User created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/SafeUser" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: "Validation error" },
            409: { description: "Email already exists" },
          },
        },
      },
      "/users/verify-user": {
        post: {
          tags: ["Users (Public)"],
          summary: "Verify user account",
          description:
            "Verifies a user's email using the OTP sent during registration.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerifyUserInput" },
              },
            },
          },
          responses: {
            201: { description: "User verified successfully" },
            400: { description: "Invalid or expired OTP" },
          },
        },
      },
      "/users/login-user": {
        post: {
          tags: ["Users (Public)"],
          summary: "Login user account",
          description:
            "Authenticates a user and returns access and refresh tokens.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginUserInput" },
              },
            },
          },
          responses: {
            201: {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/LoginResponse" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Invalid credentials or account not verified" },
          },
        },
      },
      "/users/resend-otp": {
        post: {
          tags: ["Users (Public)"],
          summary: "Resend OTP",
          description: "Resends the verification OTP to the user's email.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ResendOtpInput" },
              },
            },
          },
          responses: {
            201: { description: "OTP resent successfully" },
            404: { description: "User not found" },
          },
        },
      },
      "/users/forgot-password": {
        post: {
          tags: ["Users (Public)"],
          summary: "Forgot password",
          description:
            "Initiates a password reset by sending an OTP to the user's email.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ForgotPasswordInput" },
              },
            },
          },
          responses: {
            201: { description: "Reset OTP sent to email" },
            404: { description: "User not found" },
          },
        },
      },
      "/users/verify-reset-otp": {
        post: {
          tags: ["Users (Public)"],
          summary: "Verify password reset OTP",
          description:
            "Verifies the OTP for password reset and returns a reset token.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerifyUserInput" },
              },
            },
          },
          responses: {
            201: {
              description: "OTP verified successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              token: {
                                type: "string",
                                example: "eyJhbGciOiJIUzI1NiIs...",
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: "Invalid or expired OTP" },
          },
        },
      },
      "/users/reset-pass": {
        post: {
          tags: ["Users (Public)"],
          summary: "Reset password",
          description:
            "Resets the user's password using a valid reset token (requires Authorization header with reset token).",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ResetPasswordInput" },
              },
            },
          },
          responses: {
            201: { description: "Password reset successfully" },
            400: { description: "Validation error" },
            401: { description: "Invalid or expired reset token" },
          },
        },
      },
      "/users/refresh-token": {
        post: {
          tags: ["Users (Public)"],
          summary: "Refresh access token",
          description:
            "Exchanges a valid refresh token for a new access/refresh token pair.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RefreshTokenInput" },
              },
            },
          },
          responses: {
            201: {
              description: "Tokens refreshed successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              accessToken: { type: "string" },
                              refreshToken: { type: "string" },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Invalid or expired refresh token" },
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════
      // USER — Authenticated
      // ══════════════════════════════════════════════════════════════════
      "/users/change-password": {
        post: {
          tags: ["Users (Authenticated)"],
          summary: "Change password",
          description: "Changes the authenticated user's password.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChangePasswordInput" },
              },
            },
          },
          responses: {
            201: { description: "Password changed successfully" },
            401: { description: "Invalid old password" },
          },
        },
      },
      "/users/get-me": {
        get: {
          tags: ["Users (Authenticated)"],
          summary: "Get current user profile",
          description:
            "Returns the profile of the currently authenticated user.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Profile fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/SafeUser" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/users/update-me": {
        put: {
          tags: ["Users (Authenticated)"],
          summary: "Update user profile",
          description:
            "Updates the authenticated user's profile. Supports optional avatar upload (multipart/form-data).",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "User's full name" },
                    email: {
                      type: "string",
                      format: "email",
                      description: "New email address",
                    },
                    phone: { type: "string", description: "Phone number" },
                    address: { type: "string", description: "Address" },
                    avatar: {
                      type: "string",
                      format: "binary",
                      description: "Avatar image (jpg, png, webp; max 5MB)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Profile updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/SafeUser" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: "Validation error" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/users/delete-me": {
        delete: {
          tags: ["Users (Authenticated)"],
          summary: "Delete user account",
          description: "Permanently deletes the authenticated user's account.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "User deleted successfully" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/users/logout": {
        post: {
          tags: ["Users (Authenticated)"],
          summary: "Logout user",
          description:
            "Logs out the authenticated user by clearing their stored tokens.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Logged out successfully" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/users/switch-role": {
        post: {
          tags: ["Users (Role)"],
          summary: "Switch between user and seller roles",
          description:
            "Toggles the authenticated user's role between 'user' and 'seller'. Returns new access/refresh tokens with the updated role claim.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Role switched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              accessToken: {
                                type: "string",
                                example: "eyJhbGciOiJIUzI1NiIs...",
                              },
                              refreshToken: {
                                type: "string",
                                example: "eyJhbGciOiJIUzI1NiIs...",
                              },
                              role: {
                                type: "string",
                                enum: ["user", "seller"],
                                example: "seller",
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: {
              description:
                "Only users can switch between user and seller roles",
            },
            401: { description: "Unauthorized" },
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════
      // USER — Admin
      // ══════════════════════════════════════════════════════════════════
      "/users/gt-all-users": {
        get: {
          tags: ["Users (Admin)"],
          summary: "Get all users (Admin only)",
          description:
            "Returns a paginated list of all users. Accessible only by admin or super_admin roles.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
              description: "Page number",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 10, maximum: 50 },
              description: "Items per page",
            },
          ],
          responses: {
            200: {
              description: "Users fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              users: {
                                type: "array",
                                items: {
                                  $ref: "#/components/schemas/SafeUser",
                                },
                              },
                              pagination: {
                                $ref: "#/components/schemas/Pagination",
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden — Admin access required" },
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════
      // ADMIN — Public
      // ══════════════════════════════════════════════════════════════════
      "/admin/login": {
        post: {
          tags: ["Admin (Public)"],
          summary: "Admin login",
          description:
            "Authenticates an admin or super_admin user and returns access/refresh tokens.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminLoginInput" },
              },
            },
          },
          responses: {
            200: {
              description: "Admin logged in successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            $ref: "#/components/schemas/AdminLoginResponse",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Invalid credentials or account not verified" },
            403: { description: "Access denied" },
          },
        },
      },
      "/admin/refresh-token": {
        post: {
          tags: ["Admin (Public)"],
          summary: "Admin refresh token",
          description:
            "Exchanges a valid admin refresh token for a new access/refresh token pair.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RefreshTokenInput" },
              },
            },
          },
          responses: {
            200: {
              description: "Token refreshed successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              accessToken: { type: "string" },
                              refreshToken: { type: "string" },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Invalid or expired refresh token" },
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════
      // ADMIN — Authenticated
      // ══════════════════════════════════════════════════════════════════
      "/admin/get-me": {
        get: {
          tags: ["Admin (Authenticated)"],
          summary: "Get admin profile",
          description:
            "Returns the profile of the currently authenticated admin/super_admin user.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Admin profile fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/AdminProfile" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
          },
        },
      },
      "/admin/update-me": {
        put: {
          tags: ["Admin (Authenticated)"],
          summary: "Update admin profile",
          description:
            "Updates the admin's own profile. Supports optional avatar upload (multipart/form-data).",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Admin's full name" },
                    email: {
                      type: "string",
                      format: "email",
                      description: "New email address",
                    },
                    phone: { type: "string", description: "Phone number" },
                    avatar: {
                      type: "string",
                      format: "binary",
                      description: "Avatar image (jpg, png, webp; max 5MB)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Profile updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/AdminProfile" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: "Validation error" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/admin/change-password": {
        post: {
          tags: ["Admin (Authenticated)"],
          summary: "Change admin password",
          description: "Changes the authenticated admin's password.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AdminChangePasswordInput",
                },
              },
            },
          },
          responses: {
            200: { description: "Password changed successfully" },
            401: { description: "Invalid old password or unauthorized" },
          },
        },
      },
      "/admin/get-user/{id}": {
        get: {
          tags: ["Admin (Authenticated)"],
          summary: "Get user by ID (Admin only)",
          description:
            "Returns a single user/admin by their ID. Requires admin or super_admin role.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "User ID",
            },
          ],
          responses: {
            200: {
              description: "User fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/AdminProfile" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "User not found" },
          },
        },
      },
      "/admin/delete-user/{id}": {
        delete: {
          tags: ["Admin (Authenticated)"],
          summary: "Delete a user (Admin only)",
          description:
            "Deletes a regular user by ID. Super admins can also delete admins via this endpoint.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "User ID to delete",
            },
          ],
          responses: {
            200: { description: "User deleted successfully" },
            403: { description: "Forbidden — Cannot delete admins" },
            404: { description: "User not found" },
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════
      // ADMIN — Super Admin
      // ══════════════════════════════════════════════════════════════════
      "/admin/create-admin": {
        post: {
          tags: ["Admin (Super Admin)"],
          summary: "Create admin (Super Admin only)",
          description:
            "Creates a new admin or super_admin user. Only accessible by super_admin role.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateAdminInput" },
              },
            },
          },
          responses: {
            201: {
              description: "Admin created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              name: { type: "string" },
                              email: { type: "string" },
                              role: { type: "string" },
                              isEmailVerified: { type: "boolean" },
                              isActive: { type: "boolean" },
                              createdAt: {
                                type: "string",
                                format: "date-time",
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: "Validation error" },
            403: { description: "Forbidden — Super admin access required" },
          },
        },
      },
      "/admin/gt-all-users": {
        get: {
          tags: ["Admin (Super Admin)"],
          summary: "Get all users (Super Admin only)",
          description:
            "Returns a paginated list of all users across all roles. Super admin only.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 10, maximum: 50 },
            },
          ],
          responses: {
            200: {
              description: "Users fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              users: {
                                type: "array",
                                items: {
                                  $ref: "#/components/schemas/AdminProfile",
                                },
                              },
                              pagination: {
                                $ref: "#/components/schemas/Pagination",
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            403: { description: "Forbidden" },
          },
        },
      },
      "/admin/gt-all-admins": {
        get: {
          tags: ["Admin (Super Admin)"],
          summary: "Get all admins (Super Admin only)",
          description:
            "Returns a paginated list of all admin and super_admin users.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 10, maximum: 50 },
            },
          ],
          responses: {
            200: {
              description: "Admins fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              admins: {
                                type: "array",
                                items: {
                                  $ref: "#/components/schemas/AdminProfile",
                                },
                              },
                              pagination: {
                                $ref: "#/components/schemas/Pagination",
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            403: { description: "Forbidden" },
          },
        },
      },
      "/admin/delete-admin/{id}": {
        delete: {
          tags: ["Admin (Super Admin)"],
          summary: "Delete an admin (Super Admin only)",
          description:
            "Deletes an admin or super_admin user by ID. A super admin cannot delete their own account through this endpoint.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Admin ID to delete",
            },
          ],
          responses: {
            200: { description: "Admin deleted successfully" },
            400: {
              description:
                "Cannot delete own account or target is not an admin",
            },
            403: { description: "Forbidden" },
          },
        },
      },
      "/admin/update-admin/{id}": {
        put: {
          tags: ["Admin (Super Admin)"],
          summary: "Update an admin (Super Admin only)",
          description:
            "Updates an admin/super_admin user's details including name, email, role, and active status.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Admin ID to update",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminUpdateUserInput" },
              },
            },
          },
          responses: {
            200: {
              description: "Admin updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/AdminProfile" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: "Cannot demote the last super admin" },
            403: { description: "Forbidden" },
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════
      // CMS — Hero (Public)
      // ══════════════════════════════════════════════════════════════════
      "/cms/hero": {
        get: {
          tags: ["CMS — Hero"],
          summary: "Get home hero section",
          description:
            "Returns the homepage hero section with its associated services.",
          responses: {
            200: {
              description: "Home hero section fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            nullable: true,
                            allOf: [{ $ref: "#/components/schemas/Hero" }],
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════
      // CMS — Hero (Admin)
      // ══════════════════════════════════════════════════════════════════
      "/cms/create-hero": {
        post: {
          tags: ["CMS — Hero"],
          summary: "Create hero section (Admin only)",
          description:
            "Creates the homepage hero section. Only one hero section can exist.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateHeroInput" },
              },
            },
          },
          responses: {
            201: {
              description: "Home hero section created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/Hero" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            409: { description: "Hero section already exists" },
          },
        },
      },
      "/cms/update-hero/{id}": {
        put: {
          tags: ["CMS — Hero"],
          summary: "Update hero section (Admin only)",
          description: "Updates an existing hero section by ID.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Hero ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateHeroInput" },
              },
            },
          },
          responses: {
            200: {
              description: "Home hero section updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/Hero" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Hero not found" },
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════
      // CMS — Services (Public)
      // ══════════════════════════════════════════════════════════════════
      "/cms/hero/{heroId}/services": {
        get: {
          tags: ["CMS — Services"],
          summary: "Get services by hero",
          description: "Returns all services associated with a hero section.",
          parameters: [
            {
              name: "heroId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Hero ID",
            },
          ],
          responses: {
            200: {
              description: "Services fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Service" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Hero not found" },
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════
      // CMS — Services (Admin)
      // ══════════════════════════════════════════════════════════════════
      "/cms/hero/{heroId}/create-service": {
        post: {
          tags: ["CMS — Services"],
          summary: "Create service (Admin only)",
          description:
            "Creates a new service under a hero section. Supports optional icon upload (multipart/form-data).",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "heroId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Hero ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", description: "Service name" },
                    description: {
                      type: "string",
                      description: "Service description",
                    },
                    icon: {
                      type: "string",
                      format: "binary",
                      description:
                        "Service icon image (jpg, png, webp; max 5MB)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Service created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/Service" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Hero not found" },
          },
        },
      },
      "/cms/update-service/{serviceId}": {
        put: {
          tags: ["CMS — Services"],
          summary: "Update service (Admin only)",
          description:
            "Updates a service by ID. Supports optional icon upload (multipart/form-data).",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "serviceId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Service ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Service name" },
                    description: {
                      type: "string",
                      description: "Service description",
                    },
                    icon: {
                      type: "string",
                      format: "binary",
                      description: "New service icon image",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Service updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/Service" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Service not found" },
          },
        },
      },
      "/cms/delete-service/{serviceId}": {
        delete: {
          tags: ["CMS — Services"],
          summary: "Delete service (Admin only)",
          description: "Deletes a service by ID.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "serviceId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Service ID",
            },
          ],
          responses: {
            200: { description: "Service deleted successfully" },
            404: { description: "Service not found" },
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════
      // CMS — Contact (Public)
      // ══════════════════════════════════════════════════════════════════
      "/cms/submit-inquiry": {
        post: {
          tags: ["CMS — Contact"],
          summary: "Submit contact inquiry (Public)",
          description:
            "Submits a new contact inquiry. Sends a notification email to the site owner.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateContactInput" },
              },
            },
          },
          responses: {
            201: {
              description: "Inquiry submitted successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              message: { type: "string" },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: "Validation error" },
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════
      // CMS — Contact (Admin)
      // ══════════════════════════════════════════════════════════════════
      "/cms/gt-all-inquiries": {
        get: {
          tags: ["CMS — Contact"],
          summary: "Get all inquiries (Admin only)",
          description:
            "Returns a paginated, filterable list of all contact inquiries.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 10, maximum: 50 },
            },
            {
              name: "sortBy",
              in: "query",
              schema: { type: "string", default: "createdAt" },
              description: "Sort field",
            },
            {
              name: "sortOrder",
              in: "query",
              schema: {
                type: "string",
                enum: ["asc", "desc"],
                default: "desc",
              },
            },
            {
              name: "search",
              in: "query",
              schema: { type: "string" },
              description:
                "Search keyword for name, email, subject, or message",
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: ["all", "unread", "replied"],
                default: "all",
              },
            },
          ],
          responses: {
            200: {
              description: "Inquiries fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              inquiries: {
                                type: "array",
                                items: {
                                  $ref: "#/components/schemas/ContactInquiry",
                                },
                              },
                              pagination: {
                                $ref: "#/components/schemas/Pagination",
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/cms/get-inquiry-stats": {
        get: {
          tags: ["CMS — Contact"],
          summary: "Get inquiry statistics (Admin only)",
          description: "Returns total, unread, and replied inquiry counts.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Inquiry stats fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/InquiryStats" },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      "/cms/get-inquiry/{id}": {
        get: {
          tags: ["CMS — Contact"],
          summary: "Get inquiry by ID (Admin only)",
          description: "Returns a single contact inquiry by its ID.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Inquiry ID",
            },
          ],
          responses: {
            200: {
              description: "Inquiry fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/ContactInquiry" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Inquiry not found" },
          },
        },
      },
      "/cms/mark-inquiry-read/{id}": {
        patch: {
          tags: ["CMS — Contact"],
          summary: "Mark inquiry as read (Admin only)",
          description: "Marks a contact inquiry as read.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Inquiry ID",
            },
          ],
          responses: {
            200: {
              description: "Inquiry marked as read",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/ContactInquiry" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Inquiry not found" },
          },
        },
      },
      "/cms/reply-inquiry/{id}": {
        post: {
          tags: ["CMS — Contact"],
          summary: "Reply to inquiry (Admin only)",
          description:
            "Sends a reply to a contact inquiry and emails the response to the inquirer.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Inquiry ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReplyContactInput" },
              },
            },
          },
          responses: {
            200: {
              description: "Reply sent successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/ContactInquiry" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Inquiry not found" },
          },
        },
      },
      "/cms/delete-inquiry/{id}": {
        delete: {
          tags: ["CMS — Contact"],
          summary: "Delete inquiry (Admin only)",
          description: "Permanently deletes a contact inquiry.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Inquiry ID",
            },
          ],
          responses: {
            200: { description: "Inquiry deleted successfully" },
            404: { description: "Inquiry not found" },
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════
      // CMS — About Us (Public)
      // ══════════════════════════════════════════════════════════════════
      "/cms/get-about": {
        get: {
          tags: ["CMS — About Us"],
          summary: "Get About Us section",
          description: "Returns the About Us section content.",
          responses: {
            200: {
              description: "About Us section fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            nullable: true,
                            allOf: [{ $ref: "#/components/schemas/AboutUs" }],
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════
      // CMS — About Us (Admin)
      // ══════════════════════════════════════════════════════════════════
      "/cms/create-about": {
        post: {
          tags: ["CMS — About Us"],
          summary: "Create About Us section (Admin only)",
          description:
            "Creates the About Us section. Only one section can exist. Supports up to 2 image uploads (multipart/form-data).",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["title", "description"],
                  properties: {
                    title: { type: "string", description: "About Us title" },
                    description: {
                      type: "string",
                      description: "About Us description",
                    },
                    image1: {
                      type: "string",
                      format: "binary",
                      description: "First about image",
                    },
                    image2: {
                      type: "string",
                      format: "binary",
                      description: "Second about image",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "About Us section created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/AboutUs" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            409: { description: "About Us section already exists" },
          },
        },
      },
      "/cms/update-about/{id}": {
        put: {
          tags: ["CMS — About Us"],
          summary: "Update About Us section (Admin only)",
          description:
            "Updates the About Us section. Supports up to 2 image uploads (multipart/form-data).",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "About Us ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "About Us title" },
                    description: {
                      type: "string",
                      description: "About Us description",
                    },
                    image1: {
                      type: "string",
                      format: "binary",
                      description: "New first about image",
                    },
                    image2: {
                      type: "string",
                      format: "binary",
                      description: "New second about image",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "About Us section updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/AboutUs" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "About Us section not found" },
          },
        },
      },
      "/cms/delete-about-image/{id}": {
        delete: {
          tags: ["CMS — About Us"],
          summary: "Delete About Us image (Admin only)",
          description:
            "Deletes a specific image (image1 or image2) from the About Us section via query parameter.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "About Us ID",
            },
            {
              name: "image",
              in: "query",
              required: true,
              schema: { type: "string", enum: ["image1", "image2"] },
              description: "Which image to delete",
            },
          ],
          responses: {
            200: {
              description: "Image deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/AboutUs" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "About Us section not found" },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
