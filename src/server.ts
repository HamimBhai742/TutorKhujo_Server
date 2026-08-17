import { createServer, Server as HttpServer } from "http";
import app from "./app";
import config from "./config";
import { connectedDB } from "./app/db/connected.db";
import { initSocket } from "./app/lib/socket";
import "./app/lib/firebase";
import "./app/workers/email.worker";

let server: HttpServer;
const port = config.port;

const main = async () => {
  server = createServer(app);

  await initSocket(server);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  connectedDB();

  const exitHandler = () => {
    if (server) {
      server.close(() => {
        console.log("Server closed");
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  };

  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    exitHandler();
  });

  process.on("unhandledRejection", (error) => {
    console.error("Unhandled Rejection:", error);
    exitHandler();
  });
};

main();
