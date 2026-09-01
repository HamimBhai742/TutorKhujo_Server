import fs from "fs";
import { uploadToR2 } from "../app/utils/r2Storage";
import { prisma } from "../app/lib/prisma";

async function main() {
  console.log("🚀 Starting Cloudflare R2 Upload & Profile Test...");

  const imagePath = "C:\\Users\\Hamim\\.gemini\\antigravity-ide\\brain\\0305398f-eb54-4a4a-98a1-bbba81da0007\\tutor_test_avatar_1788241778305.jpg";

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found at: ${imagePath}`);
  }

  const fileBuffer = fs.readFileSync(imagePath);
  console.log(`📸 Loaded local image: ${fileBuffer.length} bytes`);

  const mockMulterFile: Express.Multer.File = {
    fieldname: "file",
    originalname: "tutor_avatar_sample.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: fileBuffer.length,
    buffer: fileBuffer,
    destination: "",
    filename: "tutor_avatar_sample.jpg",
    path: "",
    stream: null as any,
  };

  console.log("☁️ Uploading to Cloudflare R2 (folder: 'avatars', with Sharp WebP optimization)...");
  const uploadResult = await uploadToR2(mockMulterFile, {
    folder: "avatars",
    optimizeImage: true,
    maxWidth: 800,
    quality: 85,
  });

  console.log("✅ Cloudflare R2 Upload Successful!");
  console.log("------------------------------------------");
  console.log("📍 Public URL:", uploadResult.url);
  console.log("🔑 R2 Key:", uploadResult.key);
  console.log("📦 Optimized Size:", `${(uploadResult.size / 1024).toFixed(2)} KB (original: ${(fileBuffer.length / 1024).toFixed(2)} KB)`);
  console.log("🎨 MimeType:", uploadResult.mimetype);
  console.log("------------------------------------------");

  // Find a user or tutor to update in database
  const user = await prisma.user.findFirst({
    where: { deletedAt: null },
  });

  if (user) {
    console.log(`👤 Found user: ${user.name} (${user.email}, ID: ${user.id})`);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { profilePic: uploadResult.url },
      select: { id: true, name: true, email: true, profilePic: true },
    });
    console.log("🎉 User Profile updated in Database with R2 URL!");
    console.log("Database record:", updatedUser);
  } else {
    console.log("ℹ️ No user record found in DB yet to update, but R2 upload is fully functional.");
  }
}

main()
  .then(() => {
    console.log("✨ Test finished successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Test failed with error:", err);
    process.exit(1);
  });
