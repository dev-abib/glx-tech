import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import app from "./app.js";
import {
  connectDatabase,
  registerShutdownHandlers,
} from "./config/database.js";

const PORT = process.env.PORT ?? 5000;

const bootstrap = async (): Promise<void> => {
  await connectDatabase();

  registerShutdownHandlers();

  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
  });
};

bootstrap().catch((err) => {
  console.error("[Server] Failed to start:", err.message);
  process.exit(1);
});
