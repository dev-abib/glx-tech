import app from "./app.js";
import {
  connectDatabase,
  registerShutdownHandlers,
} from "./config/database.js";
import { env } from "./config/env.js";

const bootstrap = async (): Promise<void> => {
  await connectDatabase();

  registerShutdownHandlers();

  app.listen(env.PORT, () => {
    console.log(`[Server] Running on http://localhost:${env.PORT}`);
    console.log(`[Server] Environment: ${env.NODE_ENV}`);
  });
};

bootstrap().catch((err) => {
  console.error("[Server] Failed to start:", err.message);
  process.exit(1);
});
