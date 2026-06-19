import multer, { type FileFilterCallback } from "multer";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";
import type { Request } from "express";

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const allowedTypes = ["image/jpg", "image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Only jpg, png and webp images are allowed"));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter,
});

export const uploadSingle = (fieldName: string) => {
  return upload.single(fieldName);
};

export const uploadMultiple = (fieldName: string, max: number) => {
  return upload.array(fieldName, max);
};

export const uploadFields = (fieldConfigs: { name: string; maxCount: number }[]) => {
  return upload.fields(fieldConfigs);
};
