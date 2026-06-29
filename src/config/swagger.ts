import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env.js";
import { APP_NAME } from "../utils/constant.js";

const version = "1.0.0";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: `${APP_NAME} API Documentation`,
      version,
      description: `
## GLX-Tech Backend API

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

### Health Check      \`GET /health\` — Returns a detailed system report with server status, database connectivity, uptime, and memory usage.
      `.trim(),
    },
    servers: [
      {
        url: `https://glx-tech-pink.vercel.app${env.API_VERSION}`,
        description: "Production server (Vercel)",
      },
      {
        url: `http://localhost:${env.PORT}${env.API_VERSION}`,
        description: "Development server",
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
        SystemReport: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["healthy"],
              example: "healthy",
            },
            version: { type: "string", example: "1.0.0" },
            environment: {
              type: "string",
              example: "development",
              enum: ["development", "production"],
            },
            uptime: {
              type: "object",
              properties: {
                seconds: { type: "integer", example: 3600 },
                human: { type: "string", example: "1h 0m 0s" },
              },
            },
            timestamp: {
              type: "string",
              format: "date-time",
              example: "2026-06-24T07:00:00.000Z",
            },
            node: {
              type: "object",
              properties: {
                version: { type: "string", example: "v25.9.3" },
                memory: {
                  type: "object",
                  properties: {
                    rss: { type: "string", example: "45.23 MB" },
                    heapTotal: { type: "string", example: "30.12 MB" },
                    heapUsed: { type: "string", example: "20.45 MB" },
                    external: { type: "string", example: "5.67 MB" },
                  },
                },
              },
            },
            api: {
              type: "object",
              properties: {
                name: { type: "string", example: "GLX-Tech" },
                version: { type: "string", example: "1.0.0" },
                baseUrl: { type: "string", example: "/api/v1" },
              },
            },
            database: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  enum: ["connected", "disconnected"],
                  example: "connected",
                },
                provider: {
                  type: "string",
                  example: "PostgreSQL (Prisma)",
                },
              },
            },
          },
        },
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
        Hero: {
          type: "object",
          properties: {
            id: { type: "string", example: "uuid" },
            title: {
              type: "string",
              nullable: true,
              example: "Welcome to GLX-Tech",
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
              example: "Welcome to GLX-Tech",
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
        SiteSettings: {
          type: "object",
          properties: {
            id: { type: "string", example: "uuid" },
            title: {
              type: "string",
              nullable: true,
              example: "GLX-Tech",
            },
            subTitle: {
              type: "string",
              nullable: true,
              example: "Your Digital Partner",
            },
            footerTxt: {
              type: "string",
              nullable: true,
              example: "© 2026 GLX-Tech. All rights reserved.",
            },
            siteLink: {
              type: "string",
              nullable: true,
              example: "https://glx-tech.com",
            },
            location: {
              type: "string",
              nullable: true,
              example: "123 Tech Street, Silicon Valley, CA",
            },
            phone: {
              type: "string",
              nullable: true,
              example: "+1 (555) 123-4567",
            },
            email: {
              type: "string",
              nullable: true,
              example: "contact@glx-tech.com",
            },
          },
        },
        CreateSiteSettingsInput: {
          type: "object",
          properties: {
            title: {
              type: "string",
              example: "GLX-Tech",
              maxLength: 200,
            },
            subTitle: {
              type: "string",
              example: "Your Digital Partner",
              maxLength: 300,
            },
            footerTxt: {
              type: "string",
              example: "© 2026 GLX-Tech. All rights reserved.",
              maxLength: 1000,
            },
            siteLink: {
              type: "string",
              example: "https://glx-tech.com",
              maxLength: 500,
            },
            location: {
              type: "string",
              example: "123 Tech Street, Silicon Valley, CA",
              maxLength: 500,
            },
            phone: {
              type: "string",
              example: "+1 (555) 123-4567",
              maxLength: 30,
            },
            email: {
              type: "string",
              format: "email",
              example: "contact@glx-tech.com",
            },
          },
        },
        UpdateSiteSettingsInput: {
          type: "object",
          properties: {
            title: {
              type: "string",
              example: "GLX-Tech",
              maxLength: 200,
            },
            subTitle: {
              type: "string",
              example: "Your Digital Partner",
              maxLength: 300,
            },
            footerTxt: {
              type: "string",
              example: "Updated footer text",
              maxLength: 1000,
            },
            siteLink: {
              type: "string",
              example: "https://glx-tech.com",
              maxLength: 500,
            },
            location: {
              type: "string",
              example: "456 New Avenue, NYC",
              maxLength: 500,
            },
            phone: {
              type: "string",
              example: "+1 (555) 987-6543",
              maxLength: 30,
            },
            email: {
              type: "string",
              format: "email",
              example: "info@glx-tech.com",
            },
          },
        },
        SocialLink: {
          type: "object",
          properties: {
            id: { type: "string", example: "uuid" },
            icon: {
              type: "string",
              example: "https://res.cloudinary.com/...",
            },
            iconPublicId: {
              type: "string",
              example: "cms/socials/abc123",
            },
            socialLink: {
              type: "string",
              example: "https://facebook.com/glxtech",
            },
          },
        },
        CreateSocialInput: {
          type: "object",
          required: ["socialLink"],
          properties: {
            socialLink: {
              type: "string",
              example: "https://facebook.com/glxtech",
              maxLength: 500,
            },
            icon: {
              type: "string",
              example: "https://res.cloudinary.com/...",
            },
          },
        },
        UpdateSocialInput: {
          type: "object",
          properties: {
            socialLink: {
              type: "string",
              example: "https://twitter.com/glxtech",
              maxLength: 500,
            },
            icon: {
              type: "string",
              example: "https://res.cloudinary.com/...",
            },
          },
        },
        ReviewSection: {
          type: "object",
          properties: {
            id: { type: "string", example: "uuid" },
            title: { type: "string", example: "What Our Clients Say" },
            subTitle: {
              type: "string",
              example: "Trusted by hundreds of businesses worldwide",
            },
            reviews: {
              type: "array",
              items: { $ref: "#/components/schemas/Review" },
            },
          },
        },
        CreateReviewSectionInput: {
          type: "object",
          required: ["title", "subTitle"],
          properties: {
            title: {
              type: "string",
              example: "What Our Clients Say",
              maxLength: 200,
            },
            subTitle: {
              type: "string",
              example: "Trusted by hundreds of businesses worldwide",
              maxLength: 300,
            },
          },
        },
        UpdateReviewSectionInput: {
          type: "object",
          properties: {
            title: {
              type: "string",
              example: "Updated Section Title",
              maxLength: 200,
            },
            subTitle: {
              type: "string",
              example: "Updated subtitle text",
              maxLength: 300,
            },
          },
        },
        Review: {
          type: "object",
          properties: {
            id: { type: "string", example: "uuid" },
            name: { type: "string", example: "Jane Smith" },
            position: { type: "string", example: "CEO, TechCorp" },
            reviewDate: { type: "string", example: "June 2026" },
            picture: {
              type: "string",
              example: "https://res.cloudinary.com/...",
            },
            picturePublicId: {
              type: "string",
              example: "cms/reviews/abc123",
            },
            review: {
              type: "string",
              example: "GLX-Tech provided outstanding service...",
            },
            ratingCount: { type: "string", example: "5" },
            sectionId: { type: "string", nullable: true, example: "uuid" },
          },
        },
        CreateReviewInput: {
          type: "object",
          required: ["name", "position", "reviewDate", "review", "ratingCount"],
          properties: {
            name: { type: "string", example: "Jane Smith", maxLength: 100 },
            position: {
              type: "string",
              example: "CEO, TechCorp",
              maxLength: 200,
            },
            reviewDate: {
              type: "string",
              example: "June 2026",
              maxLength: 50,
            },
            review: {
              type: "string",
              example:
                "GLX-Tech provided outstanding service and delivered beyond our expectations.",
              maxLength: 5000,
            },
            ratingCount: { type: "string", example: "5", maxLength: 10 },
            picture: {
              type: "string",
              example: "https://res.cloudinary.com/...",
            },
          },
        },
        UpdateReviewInput: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "Jane Smith Updated",
              maxLength: 100,
            },
            position: {
              type: "string",
              example: "CTO, TechCorp",
              maxLength: 200,
            },
            reviewDate: { type: "string", example: "July 2026", maxLength: 50 },
            review: {
              type: "string",
              example: "Updated review text...",
              maxLength: 5000,
            },
            ratingCount: { type: "string", example: "4", maxLength: 10 },
            picture: {
              type: "string",
              example: "https://res.cloudinary.com/...",
            },
          },
        },
        Listing: {
          type: "object",
          properties: {
            id: { type: "string", example: "uuid" },
            userId: { type: "string", example: "uuid" },
            title: { type: "string", example: "Professional Web Development" },
            slug: { type: "string", example: "professional-web-development" },
            serviceId: { type: "string", example: "uuid" },
            description: {
              type: "string",
              example: "We build modern web applications...",
            },
            address: { type: "string", example: "123 Tech Street" },
            media: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  url: {
                    type: "string",
                    example: "https://res.cloudinary.com/...",
                  },
                  publicId: { type: "string", example: "listings/abc123" },
                },
              },
            },
            days: {
              type: "array",
              items: { type: "string" },
              example: ["Monday", "Tuesday"],
            },
            weekend: {
              type: "array",
              items: { type: "string" },
              example: ["Saturday", "Sunday"],
            },
            timeSlot: {
              type: "array",
              items: { type: "string" },
              example: ["09:00", "10:00"],
            },
            basePrice: { type: "string", example: "500" },
            hourlyPrice: { type: "string", example: "50" },
            dailyPrice: { type: "string", example: "200" },
            estimatedDuration: { type: "string", example: "2 weeks" },
            latitude: { type: "number", example: 40.7128 },
            longitude: { type: "number", example: -74.006 },
            isAvailable: { type: "boolean", example: true },
            avgRating: { type: "number", example: 4.5, description: "Average user rating (0 if no reviews)" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateListingInput: {
          type: "object",
          required: [
            "title",
            "slug",
            "serviceId",
            "description",
            "address",
            "days",
            "weekend",
            "timeSlot",
            "basePrice",
            "hourlyPrice",
            "dailyPrice",
            "estimatedDuration",
            "isAvailable",
          ],
          properties: {
            title: { type: "string", example: "Professional Web Development" },
            slug: { type: "string", example: "professional-web-development" },
            serviceId: { type: "string", example: "uuid" },
            description: {
              type: "string",
              example: "We build modern web applications...",
            },
            address: { type: "string", example: "123 Tech Street" },
            days: {
              type: "array",
              items: { type: "string" },
              example: ["Monday", "Tuesday"],
            },
            weekend: {
              type: "array",
              items: { type: "string" },
              example: ["Saturday", "Sunday"],
            },
            timeSlot: {
              type: "array",
              items: { type: "string" },
              example: ["09:00", "10:00"],
            },
            basePrice: { type: "string", example: "500" },
            hourlyPrice: { type: "string", example: "50" },
            dailyPrice: { type: "string", example: "200" },
            estimatedDuration: { type: "string", example: "2 weeks" },
            isAvailable: { type: "boolean", example: true },
          },
        },
        UpdateListingInput: {
          type: "object",
          properties: {
            title: { type: "string", example: "Updated Title" },
            slug: { type: "string", example: "updated-slug" },
            serviceId: { type: "string", example: "uuid" },
            description: { type: "string", example: "Updated description..." },
            address: { type: "string", example: "456 New Street" },
            days: { type: "array", items: { type: "string" } },
            weekend: { type: "array", items: { type: "string" } },
            timeSlot: { type: "array", items: { type: "string" } },
            basePrice: { type: "string", example: "600" },
            hourlyPrice: { type: "string", example: "60" },
            dailyPrice: { type: "string", example: "250" },
            estimatedDuration: { type: "string", example: "3 weeks" },
            isAvailable: { type: "boolean", example: true },
          },
        },
        UserReview: {
          type: "object",
          properties: {
            id: { type: "string", example: "uuid" },
            userId: { type: "string", example: "uuid" },
            listingId: { type: "string", example: "uuid" },
            rating: { type: "number", example: 4.5, minimum: 1, maximum: 5 },
            review: {
              type: "string",
              example: "Great service! Highly recommended.",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            user: {
              type: "object",
              properties: {
                id: { type: "string", example: "uuid" },
                name: { type: "string", example: "John Doe" },
                avatar: { type: "string", nullable: true },
              },
            },
          },
        },
        CreateUserReviewInput: {
          type: "object",
          required: ["rating", "review"],
          properties: {
            rating: { type: "number", example: 4.5, minimum: 1, maximum: 5 },
            review: {
              type: "string",
              example: "Great service! Highly recommended.",
              maxLength: 5000,
            },
          },
        },
        UpdateUserReviewInput: {
          type: "object",
          properties: {
            rating: { type: "number", example: 5, minimum: 1, maximum: 5 },
            review: {
              type: "string",
              example: "Updated review text...",
              maxLength: 5000,
            },
          },
        },
        UpdateUserAsSellerInput: {
          type: "object",
          required: [
            "storeName",
            "servicesId",
            "insuranceStatus",
            "socialLInk",
            "businessNumber",
            "businessEmail",
            "streetAddress",
            "city",
            "state",
            "zipCode",
          ],
          properties: {
            storeName: {
              type: "string",
              example: "GLX-Tech Store",
              description: "Name of the store/business",
            },
            servicesId: {
              type: "array",
              items: { type: "string" },
              example: ["uuid-1", "uuid-2"],
              description: "Array of service IDs the seller offers",
            },
            insuranceStatus: {
              type: "string",
              enum: ["yes", "no", "not_applicable"],
              example: "yes",
              description: "Insurance status",
            },
            socialLInk: {
              type: "string",
              example: "https://facebook.com/glxtech",
              description: "Social media profile link",
            },
            businessNumber: {
              type: "string",
              example: "+1234567890",
              description: "Business phone number",
            },
            businessEmail: {
              type: "string",
              format: "email",
              example: "business@glxtech.com",
              description: "Business email address",
            },
            streetAddress: {
              type: "string",
              example: "123 Tech Street, Suite 100",
              description: "Street address of the business",
            },
            city: {
              type: "string",
              example: "San Francisco",
              description: "City of the business",
            },
            state: {
              type: "string",
              example: "California",
              description: "State of the business",
            },
            zipCode: {
              type: "string",
              example: "94105",
              description: "ZIP / postal code of the business",
            },
          },
        },
      },
    },
    tags: [
      { name: "01 — Health", description: "Health check endpoint" },
      {
        name: "02 — Users — Authentication",
        description:
          "Public user endpoints — registration, login, email verification, password reset, token refresh",
      },
      {
        name: "03 — Users — Profile",
        description:
          "Endpoints for authenticated user profile management (get/update profile, change password, logout)",
      },
      {
        name: "04 — Users — Role",
        description: "Role switching between user and seller",
      },
      {
        name: "05 — Users — Admin",
        description: "Admin-only user management endpoints",
      },
      {
        name: "06 — Admin — Authentication",
        description: "Public admin authentication endpoints",
      },
      {
        name: "07 — Admin — Profile",
        description:
          "Endpoints for authenticated admin/super_admin profile and user management (get/update profile, change password, get/delete users by ID)",
      },
      {
        name: "08 — Admin — Super Admin",
        description:
          "Super admin exclusive endpoints (create/update/delete admins, list all admins and users)",
      },
      {
        name: "09 — CMS — Hero & Services",
        description: "Homepage hero section and service management",
      },
      { name: "10 — CMS — Contact", description: "Contact inquiry management" },
      {
        name: "11 — CMS — About Us",
        description: "About Us section management",
      },
      {
        name: "12 — CMS — Site Settings",
        description:
          "Site-wide settings (title, contact info) and social media link management",
      },
      {
        name: "13 — CMS — Reviews",
        description:
          "Testimonial review section management (section header + individual reviews with ratings and pictures)",
      },
      {
        name: "14 — Listings & Reviews",
        description: "Seller listings (CRUD) and user reviews for listings",
      },
    ],
    paths: {
      "/health": {
        get: {
          tags: ["01 — Health"],
          summary: "System health report",
          description:
            "Returns a detailed system health report including server status, database connectivity, uptime, Node.js version, and memory usage.",
          responses: {
            200: {
              description: "System is healthy",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/SystemReport" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            503: {
              description: "System is unhealthy (e.g., database disconnected)",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/SystemReport" },
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
      "/users/create-user": {
        post: {
          tags: ["02 — Users — Authentication"],
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
          tags: ["02 — Users — Authentication"],
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
          tags: ["02 — Users — Authentication"],
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
          tags: ["02 — Users — Authentication"],
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
          tags: ["02 — Users — Authentication"],
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
          tags: ["02 — Users — Authentication"],
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
          tags: ["02 — Users — Authentication"],
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
          tags: ["02 — Users — Authentication"],
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
      "/users/change-password": {
        post: {
          tags: ["03 — Users — Profile"],
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
          tags: ["03 — Users — Profile"],
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
          tags: ["03 — Users — Profile"],
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
      "/users/update-as-seller": {
        post: {
          tags: ["04 — Users — Role"],
          summary: "Update user profile as seller",
          description:
            "Marks the authenticated user as a seller by creating their seller profile (SellerInfo record). Requires an authenticated user role. Creates a seller business profile with store details, services, and contact information.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UpdateUserAsSellerInput",
                },
              },
            },
          },
          responses: {
            200: {
              description: "User updated as seller successfully",
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
                              message: {
                                type: "string",
                                example:
                                  "User updated as seller successfully",
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
            400: { description: "User already marked as a seller or validation error" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/users/delete-me": {
        delete: {
          tags: ["03 — Users — Profile"],
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
          tags: ["03 — Users — Profile"],
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
          tags: ["04 — Users — Role"],
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
      "/users/gt-all-users": {
        get: {
          tags: ["05 — Users — Admin"],
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
      "/admin/login": {
        post: {
          tags: ["06 — Admin — Authentication"],
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
          tags: ["06 — Admin — Authentication"],
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
      "/admin/get-me": {
        get: {
          tags: ["07 — Admin — Profile"],
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
          tags: ["07 — Admin — Profile"],
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
          tags: ["07 — Admin — Profile"],
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
          tags: ["07 — Admin — Profile"],
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
          tags: ["07 — Admin — Profile"],
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
      "/admin/create-admin": {
        post: {
          tags: ["08 — Admin — Super Admin"],
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
          tags: ["08 — Admin — Super Admin"],
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
          tags: ["08 — Admin — Super Admin"],
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
          tags: ["08 — Admin — Super Admin"],
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
          tags: ["08 — Admin — Super Admin"],
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
      "/cms/hero": {
        get: {
          tags: ["09 — CMS — Hero & Services"],
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
      "/cms/create-hero": {
        post: {
          tags: ["09 — CMS — Hero & Services"],
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
          tags: ["09 — CMS — Hero & Services"],
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
      "/cms/hero/{heroId}/services": {
        get: {
          tags: ["09 — CMS — Hero & Services"],
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
      "/cms/hero/{heroId}/create-service": {
        post: {
          tags: ["09 — CMS — Hero & Services"],
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
          tags: ["09 — CMS — Hero & Services"],
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
          tags: ["09 — CMS — Hero & Services"],
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
      "/cms/submit-inquiry": {
        post: {
          tags: ["10 — CMS — Contact"],
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
      "/cms/gt-all-inquiries": {
        get: {
          tags: ["10 — CMS — Contact"],
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
          tags: ["10 — CMS — Contact"],
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
          tags: ["10 — CMS — Contact"],
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
          tags: ["10 — CMS — Contact"],
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
          tags: ["10 — CMS — Contact"],
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
          tags: ["10 — CMS — Contact"],
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
      "/cms/get-about": {
        get: {
          tags: ["11 — CMS — About Us"],
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
      "/cms/create-about": {
        post: {
          tags: ["11 — CMS — About Us"],
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
          tags: ["11 — CMS — About Us"],
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
          tags: ["11 — CMS — About Us"],
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
      "/cms/site-settings": {
        get: {
          tags: ["12 — CMS — Site Settings"],
          summary: "Get site settings",
          description:
            "Returns the site-wide configuration including title, subtitle, footer text, contact info, and links.",
          responses: {
            200: {
              description: "Site settings fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            nullable: true,
                            allOf: [
                              { $ref: "#/components/schemas/SiteSettings" },
                            ],
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
      "/cms/create-site-settings": {
        post: {
          tags: ["12 — CMS — Site Settings"],
          summary: "Create site settings (Admin only)",
          description:
            "Creates the site-wide configuration. Only one set of site settings can exist.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreateSiteSettingsInput",
                },
              },
            },
          },
          responses: {
            201: {
              description: "Site settings created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/SiteSettings" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            409: { description: "Site settings already exist" },
          },
        },
      },
      "/cms/update-site-settings/{id}": {
        put: {
          tags: ["12 — CMS — Site Settings"],
          summary: "Update site settings (Admin only)",
          description: "Updates an existing site configuration by ID.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Site settings ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UpdateSiteSettingsInput",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Site settings updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/SiteSettings" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Site settings not found" },
          },
        },
      },
      "/cms/site-settings/socials": {
        get: {
          tags: ["12 — CMS — Site Settings"],
          summary: "Get all social links",
          description: "Returns all social media links for the site.",
          responses: {
            200: {
              description: "Social links fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "array",
                            items: { $ref: "#/components/schemas/SocialLink" },
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
      "/cms/site-settings/create-social": {
        post: {
          tags: ["12 — CMS — Site Settings"],
          summary: "Create social link (Admin only)",
          description:
            "Creates a new social media link. Supports optional icon upload (multipart/form-data).",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["socialLink"],
                  properties: {
                    socialLink: {
                      type: "string",
                      description: "Social media profile URL",
                    },
                    icon: {
                      type: "string",
                      format: "binary",
                      description:
                        "Social platform icon image (jpg, png, webp; max 5MB)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Social link created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/SocialLink" },
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
      "/cms/site-settings/update-social/{socialId}": {
        put: {
          tags: ["12 — CMS — Site Settings"],
          summary: "Update social link (Admin only)",
          description:
            "Updates a social media link by ID. Supports optional icon upload (multipart/form-data).",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "socialId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Social link ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    socialLink: {
                      type: "string",
                      description: "Social media profile URL",
                    },
                    icon: {
                      type: "string",
                      format: "binary",
                      description: "New social platform icon image",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Social link updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/SocialLink" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Social link not found" },
          },
        },
      },
      "/cms/site-settings/delete-social/{socialId}": {
        delete: {
          tags: ["12 — CMS — Site Settings"],
          summary: "Delete social link (Admin only)",
          description: "Deletes a social media link by ID.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "socialId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Social link ID",
            },
          ],
          responses: {
            200: { description: "Social link deleted successfully" },
            404: { description: "Social link not found" },
          },
        },
      },
      "/cms/review/section": {
        get: {
          tags: ["13 — CMS — Reviews"],
          summary: "Get review section",
          description:
            "Returns the review/testimonial section header with its associated reviews.",
          responses: {
            200: {
              description: "Review section fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            nullable: true,
                            allOf: [
                              { $ref: "#/components/schemas/ReviewSection" },
                            ],
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
      "/cms/review/create-section": {
        post: {
          tags: ["13 — CMS — Reviews"],
          summary: "Create review section (Admin only)",
          description:
            "Creates the review/testimonial section. Only one section can exist.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreateReviewSectionInput",
                },
              },
            },
          },
          responses: {
            201: {
              description: "Review section created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/ReviewSection" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            409: { description: "Review section already exists" },
          },
        },
      },
      "/cms/review/update-section/{id}": {
        put: {
          tags: ["13 — CMS — Reviews"],
          summary: "Update review section (Admin only)",
          description: "Updates an existing review section by ID.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Review section ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UpdateReviewSectionInput",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Review section updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/ReviewSection" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Review section not found" },
          },
        },
      },
      "/cms/review/delete-section/{id}": {
        delete: {
          tags: ["13 — CMS — Reviews"],
          summary: "Delete review section (Admin only)",
          description:
            "Deletes a review section and all its associated reviews.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Review section ID",
            },
          ],
          responses: {
            200: { description: "Review section deleted successfully" },
            404: { description: "Review section not found" },
          },
        },
      },
      "/cms/review/{sectionId}/reviews": {
        get: {
          tags: ["13 — CMS — Reviews"],
          summary: "Get reviews by section",
          description:
            "Returns all individual reviews for a given review section.",
          parameters: [
            {
              name: "sectionId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Review section ID",
            },
          ],
          responses: {
            200: {
              description: "Reviews fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Review" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Review section not found" },
          },
        },
      },
      "/cms/review/{reviewId}": {
        get: {
          tags: ["13 — CMS — Reviews"],
          summary: "Get review by ID",
          description: "Returns a single review by its ID.",
          parameters: [
            {
              name: "reviewId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Review ID",
            },
          ],
          responses: {
            200: {
              description: "Review fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/Review" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Review not found" },
          },
        },
      },
      "/cms/review/{sectionId}/create-review": {
        post: {
          tags: ["13 — CMS — Reviews"],
          summary: "Create review (Admin only)",
          description:
            "Creates a new review under a review section. Supports optional picture upload (multipart/form-data).",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "sectionId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Review section ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: [
                    "name",
                    "position",
                    "reviewDate",
                    "review",
                    "ratingCount",
                  ],
                  properties: {
                    name: { type: "string", description: "Reviewer name" },
                    position: {
                      type: "string",
                      description: "Reviewer position/role",
                    },
                    reviewDate: {
                      type: "string",
                      description: "Review date or timeframe",
                    },
                    review: {
                      type: "string",
                      description: "Review/testimonial text",
                    },
                    ratingCount: {
                      type: "string",
                      description: "Rating (e.g. '5' for 5 stars)",
                    },
                    picture: {
                      type: "string",
                      format: "binary",
                      description:
                        "Reviewer picture image (jpg, png, webp; max 5MB)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Review created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/Review" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Review section not found" },
          },
        },
      },
      "/cms/review/update-review/{reviewId}": {
        put: {
          tags: ["13 — CMS — Reviews"],
          summary: "Update review (Admin only)",
          description:
            "Updates a review by ID. Supports optional picture upload (multipart/form-data).",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "reviewId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Review ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Reviewer name" },
                    position: {
                      type: "string",
                      description: "Reviewer position/role",
                    },
                    reviewDate: {
                      type: "string",
                      description: "Review date or timeframe",
                    },
                    review: {
                      type: "string",
                      description: "Review/testimonial text",
                    },
                    ratingCount: {
                      type: "string",
                      description: "Rating (e.g. '5' for 5 stars)",
                    },
                    picture: {
                      type: "string",
                      format: "binary",
                      description: "New reviewer picture image",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Review updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/Review" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Review not found" },
          },
        },
      },
      "/cms/review/delete-review/{reviewId}": {
        delete: {
          tags: ["13 — CMS — Reviews"],
          summary: "Delete review (Admin only)",
          description: "Deletes a review by ID.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "reviewId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Review ID",
            },
          ],
          responses: {
            200: { description: "Review deleted successfully" },
            404: { description: "Review not found" },
          },
        },
      },
      "/listings/get-all-listings": {
        get: {
          tags: ["14 — Listings & Reviews"],
          summary: "Get all listings (Public)",
          description:
            "Returns a paginated list of all listings with optional search, filtering by service, location-based proximity, minimum rating, and availability.",
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
            {
              name: "search",
              in: "query",
              schema: { type: "string" },
              description: "Search keyword (slug, description, address)",
            },
            {
              name: "serviceId",
              in: "query",
              schema: { type: "string" },
              description: "Filter by exact service ID",
            },
            {
              name: "serviceName",
              in: "query",
              schema: { type: "string" },
              description:
                "Filter by service name (case-insensitive partial match)",
            },
            {
              name: "address",
              in: "query",
              schema: { type: "string" },
              description:
                "Address for location-based filtering (required when using 'radius')",
            },
            {
              name: "radius",
              in: "query",
              schema: { type: "number", minimum: 1, maximum: 30 },
              description:
                "Search radius in miles (5/10/15/20/30). Requires 'address' parameter.",
            },
            {
              name: "minRating",
              in: "query",
              schema: { type: "number", minimum: 1, maximum: 5 },
              description:
                "Minimum average rating filter (listings with avg rating >= this value)",
            },
            {
              name: "isAvailable",
              in: "query",
              schema: { type: "boolean" },
              description: "Filter by availability (true/false)",
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
          ],
          responses: {
            200: {
              description: "Listings fetched successfully",
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
                              listings: {
                                type: "array",
                                items: { $ref: "#/components/schemas/Listing" },
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
          },
        },
      },
            400: {
              description:
                "Validation error (e.g., radius provided without address, or invalid parameter values)",
            },
      "/listings/listing/{slug}": {
        get: {
          tags: ["14 — Listings & Reviews"],
          summary: "Get listing by slug (Public)",
          description:
            "Returns a single listing with full details including user info, service info, and reviews.",
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Listing slug",
            },
          ],
          responses: {
            200: {
              description: "Listing fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/Listing" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Listing not found" },
          },
        },
      },
      "/listings/listing/{slug}/related": {
        get: {
          tags: ["14 — Listings & Reviews"],
          summary: "Get related listings by service type (Public)",
          description:
            "Returns a curated list of listings that share the same service type as the given listing slug. Excludes the source listing itself. Useful for showing 'More like this' sections.",
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Slug of the source listing",
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
              description: "Page number",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 6, maximum: 20 },
              description: "Maximum number of related listings per page",
            },
          ],
          responses: {
            200: {
              description: "Related listings fetched successfully",
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
                              service: {
                                type: "object",
                                properties: {
                                  id: { type: "string", example: "uuid" },
                                  name: {
                                    type: "string",
                                    nullable: true,
                                    example: "Web Development",
                                  },
                                },
                              },
                              listings: {
                                type: "array",
                                items: { $ref: "#/components/schemas/Listing" },
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
            404: { description: "Source listing not found" },
          },
        },
      },
      "/listings/create-listing": {
        post: {
          tags: ["14 — Listings & Reviews"],
          summary: "Create listing (Seller only)",
          description:
            "Creates a new listing with up to 10 images (multipart/form-data). Accessible by seller role.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: [
                    "title",
                    "slug",
                    "serviceId",
                    "description",
                    "address",
                    "days",
                    "weekend",
                    "timeSlot",
                    "basePrice",
                    "hourlyPrice",
                    "dailyPrice",
                    "estimatedDuration",
                    "isAvailable",
                  ],
                  properties: {
                    title: { type: "string", description: "Listing title" },
                    slug: { type: "string", description: "URL-friendly slug" },
                    serviceId: { type: "string", description: "Service ID" },
                    description: {
                      type: "string",
                      description: "Detailed description",
                    },
                    address: { type: "string", description: "Service address" },
                    days: {
                      type: "string",
                      description: "Comma-separated working days",
                    },
                    weekend: {
                      type: "string",
                      description: "Comma-separated weekend days",
                    },
                    timeSlot: {
                      type: "string",
                      description: "Comma-separated time slots",
                    },
                    basePrice: { type: "string", description: "Base price" },
                    hourlyPrice: { type: "string", description: "Hourly rate" },
                    dailyPrice: { type: "string", description: "Daily rate" },
                    estimatedDuration: {
                      type: "string",
                      description: "Estimated duration",
                    },
                    isAvailable: {
                      type: "boolean",
                      description: "Whether the listing is available (true/false)",
                    },
                    images: {
                      type: "array",
                      items: { type: "string", format: "binary" },
                      description:
                        "Listing images (up to 10, jpg/png/webp, max 5MB each)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Listing created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { type: "object" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden - Seller access required" },
          },
        },
      },
      "/listings/my-listings": {
        get: {
          tags: ["14 — Listings & Reviews"],
          summary: "Get my listings (Seller only)",
          description: "Returns the authenticated seller's own listings.",
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
              description: "My listings fetched successfully",
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
                              listings: {
                                type: "array",
                                items: { $ref: "#/components/schemas/Listing" },
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
            403: { description: "Forbidden - Seller access required" },
          },
        },
      },

      "/listings/update-listing/{id}": {
        put: {
          tags: ["14 — Listings & Reviews"],
          summary: "Update listing (Seller only)",
          description:
            "Updates an existing listing by ID. Supports up to 10 new image uploads (multipart/form-data). Only the listing owner can update it.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Listing ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Listing title" },
                    slug: { type: "string", description: "URL-friendly slug" },
                    serviceId: { type: "string", description: "Service ID" },
                    description: {
                      type: "string",
                      description: "Detailed description",
                    },
                    address: { type: "string", description: "Service address" },
                    days: {
                      type: "string",
                      description: "Comma-separated working days",
                    },
                    weekend: {
                      type: "string",
                      description: "Comma-separated weekend days",
                    },
                    timeSlot: {
                      type: "string",
                      description: "Comma-separated time slots",
                    },
                    basePrice: { type: "string", description: "Base price" },
                    hourlyPrice: { type: "string", description: "Hourly rate" },
                    dailyPrice: { type: "string", description: "Daily rate" },
                    estimatedDuration: {
                      type: "string",
                      description: "Estimated duration",
                    },
                    isAvailable: {
                      type: "boolean",
                      description: "Whether the listing is available (true/false)",
                    },
                    images: {
                      type: "array",
                      items: { type: "string", format: "binary" },
                      description:
                        "New listing images (up to 10, replaces old ones)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Listing updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { type: "object" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: "Validation error" },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden - Not the listing owner" },
            404: { description: "Listing not found" },
          },
        },
      },
      "/listings/delete-listing/{id}": {
        delete: {
          tags: ["14 — Listings & Reviews"],
          summary: "Delete listing (Seller only)",
          description:
            "Deletes a listing by ID. Only the listing owner can delete it.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Listing ID",
            },
          ],
          responses: {
            200: {
              description: "Listing deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            nullable: true,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden - Not the listing owner" },
            404: { description: "Listing not found" },
          },
        },
      },
      // USER REVIEWS — Public

      "/listings/listing/{listingId}/reviews": {
        get: {
          tags: ["14 — Listings & Reviews"],
          summary: "Get listing reviews (Public)",
          description:
            "Returns a paginated list of user reviews for a specific listing.",
          parameters: [
            {
              name: "listingId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Listing ID",
            },
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
              description: "Reviews fetched successfully",
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
                              reviews: {
                                type: "array",
                                items: {
                                  $ref: "#/components/schemas/UserReview",
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
            404: { description: "Listing not found" },
          },
        },
      },
      "/listings/review/{reviewId}": {
        get: {
          tags: ["14 — Listings & Reviews"],
          summary: "Get user review by ID (Public)",
          description:
            "Returns a single user review by its ID.",
          parameters: [
            {
              name: "reviewId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Review ID",
            },
          ],
          responses: {
            200: {
              description: "Review fetched successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/UserReview" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: "Review not found" },
          },
        },
      },
      // USER REVIEWS — Authenticated User

      "/listings/listing/{listingId}/create-review": {
        post: {
          tags: ["14 — Listings & Reviews"],
          summary: "Create a user review (Authenticated user)",
          description:
            "Creates a new review for a listing. Requires a valid user authentication token.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "listingId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Listing ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreateUserReviewInput",
                },
              },
            },
          },
          responses: {
            201: {
              description: "Review created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/UserReview" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: "Validation error" },
            401: { description: "Unauthorized" },
            404: { description: "Listing not found" },
          },
        },
      },
      "/listings/update-review/{reviewId}": {
        put: {
          tags: ["14 — Listings & Reviews"],
          summary: "Update a user review (Authenticated user)",
          description:
            "Updates an existing review. Only the review owner can update it.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "reviewId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Review ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UpdateUserReviewInput",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Review updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/UserReview" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: "Validation error" },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden - Not the review owner" },
            404: { description: "Review not found" },
          },
        },
      },
      "/listings/delete-review/{reviewId}": {
        delete: {
          tags: ["14 — Listings & Reviews"],
          summary: "Delete a user review (Authenticated user)",
          description:
            "Deletes a review by ID. Only the review owner can delete it.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "reviewId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Review ID",
            },
          ],
          responses: {
            200: {
              description: "Review deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            nullable: true,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden - Not the review owner" },
            404: { description: "Review not found" },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
