import { createClient } from "redis";
import config from "../../config";

export const redisClient = createClient({
  url: config.redis_url,
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Client Error:", err);
});

redisClient.on("connect", () => {
  console.log("Redis Client Connecting...");
});

redisClient.on("ready", () => {
  console.log("Redis Client Connected and Ready!");
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error("❌ Redis Connection Error:", error);
  }
};
