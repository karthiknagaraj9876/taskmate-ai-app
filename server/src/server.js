import app from "./app.js";
import { env } from "./config/env.js";
import { pool, testDatabaseConnection } from "./config/database.js";

const startServer = async () => {
  try {
    // Check PostgreSQL connection first
    await testDatabaseConnection();

    // Start Express server
    const server = app.listen(env.PORT, () => {
      console.log(
        `TaskMate AI server running at http://localhost:${env.PORT}`
      );
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log("Shutting down server...");

      server.close(async () => {
        await pool.end();
        console.log("PostgreSQL pool closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (error) {
    console.error("Server startup failed:", error.message);

    await pool.end();
    process.exit(1);
  }
};

startServer();