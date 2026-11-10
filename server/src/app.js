
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env.js";

import authRoutes from "./routes/auth.routes.js";
import rbacRoutes from "./routes/rbac.routes.js";
import taskRoutes from "./routes/task.routes.js";
import userRoutes from "./routes/user.routes.js";
import projectRoutes from "./routes/project.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// Request body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "TaskMate AI API is running",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/rbac", rbacRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Not found handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error("API Error:", err);

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Internal server error"
        : err.message || "Something went wrong",
  });
});

export default app;
