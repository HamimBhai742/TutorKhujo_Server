import { Server } from "http";
import app from "./app";
import config from "./config";
import { connectedDB } from "./app/db/connected.db";

let server: Server;
const port = config.port;

const main = () => {
  server = app.listen(port, () => {
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
