import "dotenv/config";

export default {
  NODE_ENV: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  database_url: process.env.DATABASE_URL as string,
  redis_url: process.env.REDIS_URL || "redis://localhost:6379",
  password_salt: Number(process.env.PASSWORD_SALT) || 10,
  jwt: {
    secret: process.env.JWT_SECRET || "secret",
    expire_in: process.env.JWT_EXPIRES_IN || "1d",
  },
  admin: {
    email: process.env.ADMIN_EMAIL || "admintutorkhujo@gmail.com",
    password: process.env.ADMIN_PASSWORD || "Hamim@742",
  },
};

