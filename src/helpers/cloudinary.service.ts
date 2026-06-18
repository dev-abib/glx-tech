import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from "cloudinary";
import { Readable } from "stream";
import { env } from "../config/env.js";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export class CloudinaryService {
  private readonly baseFolder: string;

  constructor() {
    this.baseFolder = env.CLOUDINARY_BASE_FOLDER;

    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadFile(
    buffer: Buffer,
    folder: string = "avatars"
  ): Promise<CloudinaryUploadResult> {
    const fullFolder = `${this.baseFolder}/${folder}`;

    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: fullFolder, resource_type: "auto" },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined
        ) => {
          if (error) {
            reject(new Error(error.message));
            return;
          }
          if (!result) {
            reject(new Error("Upload failed: no result returned"));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
