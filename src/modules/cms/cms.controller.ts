import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { ApiResponse } from "../../utils/api-response.js";
import { CmsService } from "./cms.service.js";
import type {
  CreateHeroInput,
  UpdateHeroInput,
  CreateServiceInput,
  UpdateServiceInput,
  CreateContactInput,
  ReplyContactInput,
  CreateAboutInput,
  UpdateAboutInput,
} from "./cms.validation.js";

const cmsService = new CmsService();

// ═══════════════════════════════════════════════════════════════════════════
// HERO SECTION
// ═══════════════════════════════════════════════════════════════════════════

export const getHero: RequestHandler<
  {},
  ApiResponse<{
    id: string;
    title: string | null;
    sub_title: string | null;
    highlighted_txt: string | null;
    services: Array<{
      id: string;
      name: string | null;
      description: string | null;
      icon: string | null;
      iconPublicId: string;
      heroId: string | null;
    }>;
  } | null>
> = asyncHandler(async (_req: Request, res: Response) => {
  const hero = await cmsService.getHero();

  if (!hero) {
    return res
      .status(200)
      .json(new ApiResponse(200, "No home hero section found", null));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Home hero section fetched successfully", hero));
});

export const createHero: RequestHandler<
  {},
  ApiResponse<{
    id: string;
    title: string | null;
    sub_title: string | null;
    highlighted_txt: string | null;
    services: Array<{
      id: string;
      name: string | null;
      description: string | null;
      icon: string | null;
      iconPublicId: string;
      heroId: string | null;
    }>;
  }>,
  CreateHeroInput
> = asyncHandler(async (req: Request, res: Response) => {
  const hero = await cmsService.createHero(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, "Home hero section created successfully", hero));
});

export const updateHero: RequestHandler<
  { id: string },
  ApiResponse<{
    id: string;
    title: string | null;
    sub_title: string | null;
    highlighted_txt: string | null;
    services: Array<{
      id: string;
      name: string | null;
      description: string | null;
      icon: string | null;
      iconPublicId: string;
      heroId: string | null;
    }>;
  }>,
  UpdateHeroInput
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const hero = await cmsService.updateHero(id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, "Home hero section updated successfully", hero));
});

// ═══════════════════════════════════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════════════════════════════════

export const createService: RequestHandler<
  { heroId: string },
  ApiResponse<{
    id: string;
    name: string | null;
    description: string | null;
    icon: string | null;
    iconPublicId: string;
    heroId: string | null;
  }>,
  CreateServiceInput
> = asyncHandler(async (req: Request, res: Response) => {
  const heroId = req.params.heroId as string;
  const file = req.file;
  const iconBuffer = file ? file.buffer : undefined;
  const service = await cmsService.createService(heroId, req.body, iconBuffer);
  return res
    .status(201)
    .json(new ApiResponse(201, "Service created successfully", service));
});

export const updateService: RequestHandler<
  { serviceId: string },
  ApiResponse<{
    id: string;
    name: string | null;
    description: string | null;
    icon: string | null;
    iconPublicId: string;
    heroId: string | null;
  }>,
  UpdateServiceInput
> = asyncHandler(async (req: Request, res: Response) => {
  const serviceId = req.params.serviceId as string;
  const file = req.file;
  const iconBuffer = file ? file.buffer : undefined;
  const service = await cmsService.updateService(serviceId, req.body, iconBuffer);
  return res
    .status(200)
    .json(new ApiResponse(200, "Service updated successfully", service));
});

export const deleteService: RequestHandler<
  { serviceId: string },
  ApiResponse<null>
> = asyncHandler(async (req: Request, res: Response) => {
  const serviceId = req.params.serviceId as string;
  const result = await cmsService.deleteService(serviceId);
  return res
    .status(200)
    .json(new ApiResponse(200, result.message));
});

export const getServices: RequestHandler<
  { heroId: string },
  ApiResponse<
    Array<{
      id: string;
      name: string | null;
      description: string | null;
      icon: string | null;
      iconPublicId: string;
      heroId: string | null;
    }>
  >
> = asyncHandler(async (req: Request, res: Response) => {
  const heroId = req.params.heroId as string;
  const services = await cmsService.getServices(heroId);
  return res
    .status(200)
    .json(new ApiResponse(200, "Services fetched successfully", services));
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT INQUIRIES
// ═══════════════════════════════════════════════════════════════════════════

export const submitInquiry: RequestHandler<
  {},
  ApiResponse<{ id: string; message: string }>,
  CreateContactInput
> = asyncHandler(async (req: Request, res: Response) => {
  const result = await cmsService.createInquiry(req.body);
  return res.status(201).json(new ApiResponse(201, result.message, result));
});

export const getAllInquiries: RequestHandler<
  {},
  ApiResponse<{
    inquiries: Array<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      subject: string | null;
      message: string;
      isRead: boolean;
      isReplied: boolean;
      replyMessage: string | null;
      repliedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>
> = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const sortBy = (req.query.sortBy as string) || "createdAt";
  const sortOrder = (req.query.sortOrder as "asc" | "desc") === "asc" ? "asc" : "desc";
  const search = req.query.search as string | undefined;
  const rawStatus = (req.query.status as string) || "all";
  const validStatuses = ["all", "unread", "replied"] as const;
  const safeStatus: "all" | "unread" | "replied" = validStatuses.includes(rawStatus as any)
    ? (rawStatus as "all" | "unread" | "replied")
    : "all";

  const result = await cmsService.getInquiries({ page, limit, sortBy, sortOrder, search, status: safeStatus });
  return res.status(200).json(new ApiResponse(200, "Inquiries fetched successfully", result));
});

export const getInquiry: RequestHandler<
  { id: string },
  ApiResponse<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    subject: string | null;
    message: string;
    isRead: boolean;
    isReplied: boolean;
    replyMessage: string | null;
    repliedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const inquiry = await cmsService.getInquiryById(id);
  return res.status(200).json(new ApiResponse(200, "Inquiry fetched successfully", inquiry));
});

export const markInquiryAsRead: RequestHandler<
  { id: string },
  ApiResponse<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    subject: string | null;
    message: string;
    isRead: boolean;
    isReplied: boolean;
    replyMessage: string | null;
    repliedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const inquiry = await cmsService.markInquiryAsRead(id);
  return res.status(200).json(new ApiResponse(200, "Inquiry marked as read", inquiry));
});

export const replyToInquiry: RequestHandler<
  { id: string },
  ApiResponse<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    subject: string | null;
    message: string;
    isRead: boolean;
    isReplied: boolean;
    replyMessage: string | null;
    repliedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
  ReplyContactInput
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const inquiry = await cmsService.replyToInquiry(id, req.body);
  return res.status(200).json(new ApiResponse(200, "Reply sent successfully", inquiry));
});

export const deleteInquiry: RequestHandler<
  { id: string },
  ApiResponse<null>
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await cmsService.deleteInquiry(id);
  return res.status(200).json(new ApiResponse(200, result.message));
});

export const getInquiryStats: RequestHandler<
  {},
  ApiResponse<{
    total: number;
    unread: number;
    replied: number;
  }>
> = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await cmsService.getInquiryStats();
  return res.status(200).json(new ApiResponse(200, "Inquiry stats fetched successfully", stats));
});

// ═══════════════════════════════════════════════════════════════════════════
// ABOUT US
// ═══════════════════════════════════════════════════════════════════════════

export const getAbout: RequestHandler<
  {},
  ApiResponse<{
    id: string;
    title: string;
    description: string;
    image1: string | null;
    image1PublicId: string | null;
    image2: string | null;
    image2PublicId: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>
> = asyncHandler(async (_req: Request, res: Response) => {
  const about = await cmsService.getAbout();
  if (!about) {
    return res.status(200).json(new ApiResponse(200, "No About Us section found", null));
  }
  return res.status(200).json(new ApiResponse(200, "About Us section fetched successfully", about));
});

export const createAbout: RequestHandler<
  {},
  ApiResponse<{
    id: string;
    title: string;
    description: string;
    image1: string | null;
    image1PublicId: string | null;
    image2: string | null;
    image2PublicId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
  CreateAboutInput
> = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const image1Buffer = files?.image1?.[0]?.buffer;
  const image2Buffer = files?.image2?.[0]?.buffer;
  const about = await cmsService.createAbout(req.body, image1Buffer, image2Buffer);
  return res.status(201).json(new ApiResponse(201, "About Us section created successfully", about));
});

export const updateAbout: RequestHandler<
  { id: string },
  ApiResponse<{
    id: string;
    title: string;
    description: string;
    image1: string | null;
    image1PublicId: string | null;
    image2: string | null;
    image2PublicId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
  UpdateAboutInput
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const image1Buffer = files?.image1?.[0]?.buffer;
  const image2Buffer = files?.image2?.[0]?.buffer;
  const about = await cmsService.updateAbout(id, req.body, image1Buffer, image2Buffer);
  return res.status(200).json(new ApiResponse(200, "About Us section updated successfully", about));
});

export const deleteAboutImage: RequestHandler<
  { id: string },
  ApiResponse<{
    id: string;
    title: string;
    description: string;
    image1: string | null;
    image1PublicId: string | null;
    image2: string | null;
    image2PublicId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const imageField = req.query.image as "image1" | "image2";
  const about = await cmsService.deleteAboutImage(id, imageField);
  return res.status(200).json(new ApiResponse(200, "Image deleted successfully", about));
});
