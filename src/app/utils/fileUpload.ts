import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp|gif|pdf/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (.png, .jpg, .jpeg, .webp, .gif) and PDFs are allowed"));
    }
  },
});
