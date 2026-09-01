import multer from "multer";
import path from "path";

// In-memory storage for streaming directly to Cloudflare R2 without local disk pollution
const memoryStorage = multer.memoryStorage();

export const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size
  },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp|gif|pdf|doc|docx/;
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    const mimeAllowed = /(image\/(jpeg|png|webp|gif))|(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document))/.test(
      file.mimetype
    );

    if (allowedExtensions.test(ext) || mimeAllowed) {
      cb(null, true);
    } else {
      cb(new Error("Only images (.png, .jpg, .jpeg, .webp, .gif) and documents (.pdf, .doc, .docx) are allowed."));
    }
  },
});
