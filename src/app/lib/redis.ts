import net from "net";
import { createClient } from "redis";
import config from "../../config";

export let isRedisAvailable = false;
export let redisClient: any = null;

let host = "127.0.0.1";
let port = 6379;
let password: string | undefined = undefined;

if (config.redis_url) {
  try {
    const url = new URL(config.redis_url);
    host = url.hostname || "127.0.0.1";
    port = Number(url.port) || 6379;
    password = url.password ? decodeURIComponent(url.password) : undefined;
  } catch (e) {
    // Ignore
  }
}

export const getRedisConnectionConfig = () => {
  return {
    host,
    port,
    password,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  };
};

const checkRedisPort = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000); // 1s timeout
    
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
};

export const connectRedis = async () => {
  console.log("Checking Redis availability...");
  const isAlive = await checkRedisPort();
  
  if (!isAlive) {
    console.warn("ℹ️ Redis is offline. Queue and caching will run in fallback/direct mode (no connection errors will be printed).");
    isRedisAvailable = false;
    return;
  }

  isRedisAvailable = true;
  try {
    redisClient = createClient({
      url: config.redis_url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) return false;
          return Math.min(retries * 500, 2000);
        }
      }
    });

    redisClient.on("error", (err: any) => {
      console.error("❌ Redis Client Error:", err.message || err);
    });

    await redisClient.connect();
    console.log("Redis Client Connected and Ready!");
  } catch (error: any) {
    console.error("❌ Redis Connection Error:", error.message || error);
    isRedisAvailable = false;
  }
};
