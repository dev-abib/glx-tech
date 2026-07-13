import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { ApiResponse } from "../../utils/api-response.js";
import { PlansService } from "./plans.service.js";
import type {
  CreatePlanInput,
  UpdatePlanInput,
  BulkSetPlanFeaturesInput,
  CreateFeatureDefinitionInput,
  UpdateFeatureDefinitionInput,
} from "./plans.validation.js";

const plansService = new PlansService();

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN PLAN ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

export const adminCreatePlan: RequestHandler<{}, ApiResponse<unknown>, CreatePlanInput> = asyncHandler(
  async (req: Request, res: Response) => {
    const plan = await plansService.createPlan(req.body);
    return res.status(201).json(new ApiResponse(201, "Plan created successfully", plan));
  }
);

export const adminGetAllPlans: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const result = await plansService.getAllPlans({ page, limit });
    return res.status(200).json(new ApiResponse(200, "Plans fetched successfully", result));
  }
);

export const adminGetPlanById: RequestHandler<{ id: string }> = asyncHandler(
  async (req: Request, res: Response) => {
    const plan = await plansService.getPlanById(req.params.id as string);
    return res.status(200).json(new ApiResponse(200, "Plan fetched successfully", plan));
  }
);

export const adminUpdatePlan: RequestHandler<{ id: string }, ApiResponse<unknown>, UpdatePlanInput> = asyncHandler(
  async (req: Request, res: Response) => {
    const plan = await plansService.updatePlan(req.params.id as string, req.body);
    return res.status(200).json(new ApiResponse(200, "Plan updated successfully", plan));
  }
);

export const adminDeletePlan: RequestHandler<{ id: string }> = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await plansService.deletePlan(req.params.id as string);
    return res.status(200).json(new ApiResponse(200, "Plan deleted successfully", result));
  }
);

export const adminSetPlanFeatures: RequestHandler<{ id: string }, ApiResponse<unknown>, BulkSetPlanFeaturesInput> = asyncHandler(
  async (req: Request, res: Response) => {
    const plan = await plansService.setPlanFeatures(req.params.id as string, req.body);
    return res.status(200).json(new ApiResponse(200, "Plan features updated", plan));
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE DEFINITIONS (Admin)
// ═══════════════════════════════════════════════════════════════════════════

export const adminGetAllFeatureDefinitions: RequestHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const features = await plansService.getAllFeatureDefinitions();
    return res.status(200).json(new ApiResponse(200, "Feature definitions fetched successfully", features));
  }
);

export const adminCreateFeatureDefinition: RequestHandler<{}, ApiResponse<unknown>, CreateFeatureDefinitionInput> = asyncHandler(
  async (req: Request, res: Response) => {
    const feature = await plansService.createFeatureDefinition(req.body);
    return res.status(201).json(new ApiResponse(201, "Feature definition created", feature));
  }
);

export const adminUpdateFeatureDefinition: RequestHandler<{ id: string }, ApiResponse<unknown>, UpdateFeatureDefinitionInput> = asyncHandler(
  async (req: Request, res: Response) => {
    const feature = await plansService.updateFeatureDefinition(Number(req.params.id), req.body);
    return res.status(200).json(new ApiResponse(200, "Feature definition updated", feature));
  }
);

export const adminDeleteFeatureDefinition: RequestHandler<{ id: string }> = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await plansService.deleteFeatureDefinition(Number(req.params.id));
    return res.status(200).json(new ApiResponse(200, "Feature definition deleted", result));
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

export const getPublicPlans: RequestHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await plansService.getPublicPlans();
    return res.status(200).json(new ApiResponse(200, "Plans fetched successfully", result));
  }
);
