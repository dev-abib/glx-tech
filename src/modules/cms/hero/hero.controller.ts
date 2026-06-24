import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/async-handler.js";
import { ApiResponse } from "../../../utils/api-response.js";
import { HeroService } from "./hero.service.js";
import type {
  CreateHeroInput,
  UpdateHeroInput,
  CreateServiceInput,
  UpdateServiceInput,
} from "./hero.validation.js";

const heroService = new HeroService();

// ═══════════════════════════════════════════════════════════════════════════
// HERO SECTION
// ═══════════════════════════════════════════════════════════════════════════

export const getHero: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const hero = await heroService.getHero();

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
  ApiResponse<unknown>,
  CreateHeroInput
> = asyncHandler(async (req: Request, res: Response) => {
  const hero = await heroService.createHero(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, "Home hero section created successfully", hero));
});

export const updateHero: RequestHandler<
  { id: string },
  ApiResponse<unknown>,
  UpdateHeroInput
> = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const hero = await heroService.updateHero(id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, "Home hero section updated successfully", hero));
});

// ═══════════════════════════════════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════════════════════════════════

export const createService: RequestHandler<
  { heroId: string },
  ApiResponse<unknown>,
  CreateServiceInput
> = asyncHandler(async (req: Request, res: Response) => {
  const heroId = req.params.heroId as string;
  const file = req.file;
  const iconBuffer = file ? file.buffer : undefined;
  const service = await heroService.createService(heroId, req.body, iconBuffer);
  return res
    .status(201)
    .json(new ApiResponse(201, "Service created successfully", service));
});

export const updateService: RequestHandler<
  { serviceId: string },
  ApiResponse<unknown>,
  UpdateServiceInput
> = asyncHandler(async (req: Request, res: Response) => {
  const serviceId = req.params.serviceId as string;
  const file = req.file;
  const iconBuffer = file ? file.buffer : undefined;
  const service = await heroService.updateService(serviceId, req.body, iconBuffer);
  return res
    .status(200)
    .json(new ApiResponse(200, "Service updated successfully", service));
});

export const deleteService: RequestHandler<
  { serviceId: string },
  ApiResponse<null>
> = asyncHandler(async (req: Request, res: Response) => {
  const serviceId = req.params.serviceId as string;
  const result = await heroService.deleteService(serviceId);
  return res
    .status(200)
    .json(new ApiResponse(200, result.message));
});

export const getServices: RequestHandler<
  { heroId: string },
  ApiResponse<unknown>
> = asyncHandler(async (req: Request, res: Response) => {
  const heroId = req.params.heroId as string;
  const services = await heroService.getServices(heroId);
  return res
    .status(200)
    .json(new ApiResponse(200, "Services fetched successfully", services));
});
