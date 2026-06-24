import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/async-handler.js";
import { ApiResponse } from "../../../utils/api-response.js";
import { ContactService } from "./contact.service.js";
import type {
  CreateContactInput,
  ReplyContactInput,
} from "./contact.validation.js";

const contactService = new ContactService();

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT INQUIRIES
// ═══════════════════════════════════════════════════════════════════════════

export const submitInquiry: RequestHandler<
  {},
  ApiResponse<{ id: string; message: string }>,
  CreateContactInput
> = asyncHandler(async (req: Request, res: Response) => {
  const result = await contactService.createInquiry(req.body);
  return res.status(201).json(new ApiResponse(201, result.message, result));
});

export const getAllInquiries: RequestHandler<
  {},
  ApiResponse<{
    inquiries: Array<Record<string, unknown>>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
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

  const result = await contactService.getInquiries({ page, limit, sortBy, sortOrder, search, status: safeStatus });
  return res.status(200).json(new ApiResponse(200, "Inquiries fetched successfully", result));
});

export const getInquiry: RequestHandler<
  { id: string },
  ApiResponse<unknown>
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const inquiry = await contactService.getInquiryById(id);
  return res.status(200).json(new ApiResponse(200, "Inquiry fetched successfully", inquiry));
});

export const markInquiryAsRead: RequestHandler<
  { id: string },
  ApiResponse<unknown>
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const inquiry = await contactService.markInquiryAsRead(id);
  return res.status(200).json(new ApiResponse(200, "Inquiry marked as read", inquiry));
});

export const replyToInquiry: RequestHandler<
  { id: string },
  ApiResponse<unknown>,
  ReplyContactInput
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const inquiry = await contactService.replyToInquiry(id, req.body);
  return res.status(200).json(new ApiResponse(200, "Reply sent successfully", inquiry));
});

export const deleteInquiry: RequestHandler<
  { id: string },
  ApiResponse<null>
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await contactService.deleteInquiry(id);
  return res.status(200).json(new ApiResponse(200, result.message));
});

export const getInquiryStats: RequestHandler<
  {},
  ApiResponse<{ total: number; unread: number; replied: number }>
> = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await contactService.getInquiryStats();
  return res.status(200).json(new ApiResponse(200, "Inquiry stats fetched successfully", stats));
});
