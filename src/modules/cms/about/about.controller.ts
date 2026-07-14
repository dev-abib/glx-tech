import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/async-handler.js";
import { ApiResponse } from "../../../utils/api-response.js";
import { AboutService } from "./about.service.js";
import type {
  CreateAboutInput,
  UpdateAboutInput,
} from "./about.validation.js";

const aboutService = new AboutService();

// ═══════════════════════════════════════════════════════════════════════════
// ABOUT US
// ═══════════════════════════════════════════════════════════════════════════

export const getAbout: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const about = await aboutService.getAbout();
  if (!about) {
    return res.status(200).json(new ApiResponse(200, "No About Us section found", null));
  }
  return res.status(200).json(new ApiResponse(200, "About Us section fetched successfully", about));
});

/**
 * Extract files from upload.any() — returns an array of files
 */
function extractFiles(req: Request) {
  const allFiles = (req.files as Express.Multer.File[] | undefined) ?? [];
  return {
    image1Buffer: allFiles.find((f) => f.fieldname === "image1")?.buffer,
    image2Buffer: allFiles.find((f) => f.fieldname === "image2")?.buffer,
    serviceIconFiles: allFiles
      .filter((f) => f.fieldname.startsWith("serviceIcon_"))
      .sort((a, b) => {
        const idxA = parseInt(a.fieldname.replace("serviceIcon_", ""), 10);
        const idxB = parseInt(b.fieldname.replace("serviceIcon_", ""), 10);
        return idxA - idxB;
      }),
  };
}

export const createAbout: RequestHandler<
  {},
  ApiResponse<unknown>,
  CreateAboutInput
> = asyncHandler(async (req: Request, res: Response) => {
  const { image1Buffer, image2Buffer, serviceIconFiles } = extractFiles(req);
  const about = await aboutService.createAbout(req.body, image1Buffer, image2Buffer, serviceIconFiles);
  return res.status(201).json(new ApiResponse(201, "About Us section created successfully", about));
});

export const updateAbout: RequestHandler<
  { id: string },
  ApiResponse<unknown>,
  UpdateAboutInput
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { image1Buffer, image2Buffer, serviceIconFiles } = extractFiles(req);
  const about = await aboutService.updateAbout(id, req.body, image1Buffer, image2Buffer, serviceIconFiles);
  return res.status(200).json(new ApiResponse(200, "About Us section updated successfully", about));
});

export const deleteAboutImage: RequestHandler<
  { id: string },
  ApiResponse<unknown>
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const imageField = req.query.image as "image1" | "image2";
  const about = await aboutService.deleteAboutImage(id, imageField);
  return res.status(200).json(new ApiResponse(200, "Image deleted successfully", about));
});
