import { Request, Response } from "express";

export const notFoundMiddleware = (_req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
};
