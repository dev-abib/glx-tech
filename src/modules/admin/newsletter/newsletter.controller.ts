import { RequestHandler } from "express";
import { asyncHandler } from "../../../utils/async-handler.js";
import { ApiResponse } from "../../../utils/api-response.js";
import { NewsLetterService } from "./newsletter.service.js";
import type { SubscribeInput, CreateCampaignInput } from "./campaign.validation.js";

const newsLetterService = new NewsLetterService();

// ── Public: Subscribe to newsletter ───────────────────────────────────────

export const subscribe: RequestHandler<
  {},
  ApiResponse<{ message: string }>,
  SubscribeInput
> = asyncHandler(async (req, res) => {
  const result = await newsLetterService.subscribe(req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, result.message));
});

// ── Public: Unsubscribe from newsletter ───────────────────────────────────

export const unsubscribe: RequestHandler<
  {},
  ApiResponse<{ message: string }>
> = asyncHandler(async (req, res) => {
  const token = req.query.token as string;

  if (!token) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Unsubscribe token is required."));
  }

  const result = await newsLetterService.unsubscribe(token);

  return res
    .status(200)
    .json(new ApiResponse(200, result.message));
});

// ── Public: Simple HTML unsubscribe confirmation ──────────────────────────

export const unsubscribePage: RequestHandler = asyncHandler(async (req, res) => {
  const token = req.query.token as string;

  if (!token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Unsubscribe</title></head>
        <body style="font-family:Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0f2f5;">
          <div style="text-align:center;background:white;padding:48px;border-radius:16px;max-width:400px;">
            <h1 style="color:#111827;font-size:24px;">Invalid Link</h1>
            <p style="color:#6b7280;">This unsubscribe link is invalid or has expired.</p>
          </div>
        </body>
      </html>
    `);
  }

  try {
    await newsLetterService.unsubscribe(token);
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Unsubscribed</title></head>
        <body style="font-family:Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0f2f5;">
          <div style="text-align:center;background:white;padding:48px;border-radius:16px;max-width:400px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
            <div style="width:48px;height:48px;background:#4f46e5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              <span style="color:white;font-size:24px;">✓</span>
            </div>
            <h1 style="color:#111827;font-size:24px;margin:0 0 8px;">Unsubscribed</h1>
            <p style="color:#6b7280;margin:0;">You have been successfully unsubscribed. You will no longer receive emails from us.</p>
          </div>
        </body>
      </html>
    `);
  } catch {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Unsubscribe</title></head>
        <body style="font-family:Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0f2f5;">
          <div style="text-align:center;background:white;padding:48px;border-radius:16px;max-width:400px;">
            <h1 style="color:#111827;font-size:24px;">Invalid Link</h1>
            <p style="color:#6b7280;">This unsubscribe link is invalid or has expired.</p>
          </div>
        </body>
      </html>
    `);
  }
});

// ── Admin: Create Campaign ────────────────────────────────────────────────

export const createCampaign: RequestHandler<
  {},
  ApiResponse<unknown>,
  CreateCampaignInput
> = asyncHandler(async (req, res) => {
  const campaign = await newsLetterService.createCampaign(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, "Campaign created successfully", campaign));
});

// ── Admin: List Campaigns ─────────────────────────────────────────────────

export const listCampaigns: RequestHandler = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

  const result = await newsLetterService.listCampaigns(page, limit);

  return res
    .status(200)
    .json(new ApiResponse(200, "Campaigns fetched successfully", result));
});

// ── Admin: Send Campaign ──────────────────────────────────────────────────

export const sendCampaign: RequestHandler<
  { id: string },
  ApiResponse<{ message: string }>
> = asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  await newsLetterService.sendCampaign(id);

  return res
    .status(200)
    .json(new ApiResponse(200, "Campaign sent successfully"));
});

// ── Admin: Get Subscriber Count ───────────────────────────────────────────

export const getSubscriberCount: RequestHandler = asyncHandler(async (_req, res) => {
  const count = await newsLetterService.getSubscriberCount();

  return res
    .status(200)
    .json(new ApiResponse(200, "Subscriber count fetched", { count }));
});
