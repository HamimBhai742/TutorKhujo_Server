import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import path from "path";
import config from "../../config";

// Initialize Cloudflare R2 S3 Client
export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export interface UploadOptions {
  folder?: "avatars" | "documents" | "verifications" | "tuitions" | "general" | string;
  optimizeImage?: boolean;
  maxWidth?: number;
  quality?: number;
  customFileName?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimetype: string;
  originalName: string;
}

/**
 * Uploads a file (image, PDF, etc.) to Cloudflare R2 with folder structure and auto-optimization
 */
export const uploadToR2 = async (
  file: Express.Multer.File,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const {
    folder = "general",
    optimizeImage = true,
    maxWidth = 1600,
    quality = 85,
    customFileName,
  } = options;

  let buffer: Buffer = file.buffer;
  let mimetype = file.mimetype;
  let extension = path.extname(file.originalname).toLowerCase();
  const baseName = customFileName || path.basename(file.originalname, extension).replace(/[^a-zA-Z0-9_-]/g, "_");
  const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;

  const isRasterImage = /image\/(jpeg|jpg|png|webp)/i.test(mimetype);

  // Auto-optimize image using sharp to webp if requested
  if (isRasterImage && optimizeImage) {
    try {
      buffer = await sharp(file.buffer)
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
      mimetype = "image/webp";
      extension = ".webp";
    } catch (sharpError) {
      console.warn("[R2 Storage] Image optimization fallback to raw buffer:", sharpError);
      buffer = file.buffer;
    }
  }

  // Structure folder: tutor-khujo/<folder>/<filename>
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  const key = `tutor-khujo/${cleanFolder}/${baseName}-${uniqueId}${extension}`;

  const command = new PutObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  });

  await r2Client.send(command);

  // Generate clean public URL
  const publicBaseUrl = config.r2.publicUrl;
  const url = `${publicBaseUrl}/${key}`;

  return {
    url,
    key,
    size: buffer.length,
    mimetype,
    originalName: file.originalname,
  };
};

/**
 * Extracts the R2 Object Key from a full URL or key string
 */
export const extractR2KeyFromUrl = (fileUrlOrKey: string): string | null => {
  if (!fileUrlOrKey) return null;
  if (!fileUrlOrKey.startsWith("http://") && !fileUrlOrKey.startsWith("https://")) {
    return fileUrlOrKey;
  }

  try {
    const parsed = new URL(fileUrlOrKey);
    // Pathname starts with '/', so slice(1) gets "tutor-khujo/avatars/..."
    const key = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
    return decodeURIComponent(key);
  } catch {
    return null;
  }
};

/**
 * Deletes a single file from Cloudflare R2
 */
export const deleteFromR2 = async (fileUrlOrKey: string | null | undefined): Promise<boolean> => {
  if (!fileUrlOrKey) return false;

  const key = extractR2KeyFromUrl(fileUrlOrKey);
  if (!key) return false;

  // If it is not an R2 file (e.g. external oauth avatar or local placeholder), skip
  if (!key.startsWith("tutor-khujo/") && !fileUrlOrKey.includes(config.r2.publicUrl)) {
    return false;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
    });
    await r2Client.send(command);
    console.log(`[R2 Storage] Deleted object successfully: ${key}`);
    return true;
  } catch (error) {
    console.error(`[R2 Storage] Failed to delete object ${key}:`, error);
    return false;
  }
};

/**
 * Deletes multiple files from Cloudflare R2
 */
export const deleteMultipleFromR2 = async (fileUrlsOrKeys: (string | null | undefined)[]): Promise<void> => {
  const keys = fileUrlsOrKeys
    .map((item) => (item ? extractR2KeyFromUrl(item) : null))
    .filter((key): key is string => Boolean(key && (key.startsWith("tutor-khujo/") || key.length > 0)));

  if (keys.length === 0) return;

  try {
    const command = new DeleteObjectsCommand({
      Bucket: config.r2.bucketName,
      Delete: {
        Objects: keys.map((Key) => ({ Key })),
        Quiet: true,
      },
    });
    await r2Client.send(command);
    console.log(`[R2 Storage] Deleted ${keys.length} objects successfully`);
  } catch (error) {
    console.error("[R2 Storage] Failed to batch delete objects:", error);
  }
};
