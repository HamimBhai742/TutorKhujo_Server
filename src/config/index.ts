import "dotenv/config";

/**
 * Validates that all required environment variables are present at startup.
 * Throws a descriptive error immediately if any are missing — prevents silent
 * misconfiguration that only fails at runtime in production.
 */
const validateEnv = () => {
  const required: Record<string, string | undefined> = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `[Config] Missing required environment variables: ${missing.join(", ")}\n` +
      `Please check your .env file and ensure all required variables are set.`
    );
  }
};

// Validate env vars on startup (skip in test environments)
if (process.env.NODE_ENV !== "test") {
  validateEnv();
}

export default {
  NODE_ENV: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5001,
  database_url: process.env.DATABASE_URL as string,
  redis_url: (process.env.REDIS_URL || "redis://localhost:6379").replace(/^["']|["']$/g, ""),
  password_salt: Number(process.env.PASSWORD_SALT) || 12,
  jwt: {
    secret: process.env.JWT_SECRET as string,
    expire_in: process.env.JWT_EXPIRES_IN || "15m",
    refresh_secret: process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET as string),
    refresh_expire_in: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },
  admin: {
    email: process.env.ADMIN_EMAIL as string,
    password: process.env.ADMIN_PASSWORD as string,
  },
  google_client_id: process.env.GOOGLE_CLIENT_ID || "",
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucketName: process.env.R2_BUCKET_NAME || "tutor-khujo",
    publicUrl: (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, ""),
  },
};
