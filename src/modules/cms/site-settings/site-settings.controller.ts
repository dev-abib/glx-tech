import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/async-handler.js";
import { ApiResponse } from "../../../utils/api-response.js";
import { SiteSettingsService } from "./site-settings.service.js";
import type {
  CreateSiteSettingsInput,
  UpdateSiteSettingsInput,
  CreateSocialInput,
  UpdateSocialInput,
} from "./site-settings.validation.js";

const siteSettingsService = new SiteSettingsService();

// ═══════════════════════════════════════════════════════════════════════════
// SITE SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export const getSiteSettings: RequestHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const settings = await siteSettingsService.getSiteSettings();

    if (!settings) {
      return res
        .status(200)
        .json(new ApiResponse(200, "No site settings found", null));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Site settings fetched successfully", settings)
      );
  }
);

export const createSiteSettings: RequestHandler<
  {},
  ApiResponse<unknown>,
  CreateSiteSettingsInput
> = asyncHandler(async (req: Request, res: Response) => {
  const settings = await siteSettingsService.createSiteSettings(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, "Site settings created successfully", settings));
});

export const updateSiteSettings: RequestHandler<
  { id: string },
  ApiResponse<unknown>,
  UpdateSiteSettingsInput
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const settings = await siteSettingsService.updateSiteSettings(id, req.body);
  return res
    .status(200)
    .json(
      new ApiResponse(200, "Site settings updated successfully", settings)
    );
});

// ═══════════════════════════════════════════════════════════════════════════
// SOCIAL LINKS
// ═══════════════════════════════════════════════════════════════════════════

export const getSocials: RequestHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const socials = await siteSettingsService.getSocials();
    return res
      .status(200)
      .json(new ApiResponse(200, "Social links fetched successfully", socials));
  }
);

export const createSocial: RequestHandler<
  {},
  ApiResponse<unknown>,
  CreateSocialInput
> = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  const iconBuffer = file ? file.buffer : undefined;
  const social = await siteSettingsService.createSocial(req.body, iconBuffer);
  return res
    .status(201)
    .json(new ApiResponse(201, "Social link created successfully", social));
});

export const updateSocial: RequestHandler<
  { socialId: string },
  ApiResponse<unknown>,
  UpdateSocialInput
> = asyncHandler(async (req: Request, res: Response) => {
  const socialId = req.params.socialId as string;
  const file = req.file;
  const iconBuffer = file ? file.buffer : undefined;
  const social = await siteSettingsService.updateSocial(
    socialId,
    req.body,
    iconBuffer
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Social link updated successfully", social));
});

export const deleteSocial: RequestHandler<
  { socialId: string },
  ApiResponse<null>
> = asyncHandler(async (req: Request, res: Response) => {
  const socialId = req.params.socialId as string;
  const result = await siteSettingsService.deleteSocial(socialId);
  return res.status(200).json(new ApiResponse(200, result.message));
});
