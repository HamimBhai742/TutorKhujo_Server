import cluster from "cluster";
import os from "os";
import { createServer, Server as HttpServer } from "http";
import app from "./app";
import config from "./config";
import { connectedDB } from "./app/db/connected.db";
import { initSocket } from "./app/lib/socket";
import "./app/lib/firebase";
import "./app/workers/email.worker";

let server: HttpServer;
const port = config.port;

const startServer = async () => {
  server = createServer(app);

  await initSocket(server);

  server.listen(Number(port), "0.0.0.0", 2048, () => {
    console.log(
      `[Worker ${process.pid}] Server running on http://localhost:${port}`
    );
  });

  connectedDB();

  const exitHandler = () => {
    if (server) {
      server.close(() => {
        console.log(`[Worker ${process.pid}] Server closed`);
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  };

  process.on("uncaughtException", (error) => {
    console.error(`[Worker ${process.pid}] Uncaught Exception:`, error);
    exitHandler();
  });

  process.on("unhandledRejection", (error) => {
    console.error(`[Worker ${process.pid}] Unhandled Rejection:`, error);
    exitHandler();
  });
};

const main = () => {
  const isClusterEnabled = process.env.ENABLE_CLUSTER === "true";
  const isPrimary = (cluster as any).isPrimary ?? (cluster as any).isMaster;

  if (isClusterEnabled && isPrimary) {
    const numCPUs = process.env.WORKERS
      ? parseInt(process.env.WORKERS, 10)
      : Math.min(os.cpus().length, 8);

    console.log(
      `🚀 [Cluster Master ${process.pid}] Forking ${numCPUs} worker processes for load balancing...`
    );

    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
      console.warn(
        `⚠️ [Cluster Master] Worker ${worker.process.pid} died (${
          signal || code
        }). Spawning replacement...`
      );
      cluster.fork();
    });
  } else {
    startServer();
  }
};

main();

