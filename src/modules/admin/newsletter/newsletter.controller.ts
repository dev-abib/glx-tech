import { RequestHandler } from "express";
import { asyncHandler } from "../../../utils/async-handler.js";
import { ApiResponse } from "../../../utils/api-response.js";
import { NewsLetterInput } from "./newsletter.validation.js";
import { NewsLetterService } from "./newsletter.service.js";

const newsLetterService = new NewsLetterService();

// subscribe news letter controller
export const subscribeUnsubscribeNewsletter: RequestHandler<
  {},
  ApiResponse<{ message: string }>,
  NewsLetterInput
> = asyncHandler(async (req, res) => {
  const result = await newsLetterService.subscribeUnsubscribeNewsLetter(
    req.body
  );

  return res.status(200).json({
    message: result.message,
  });
});
