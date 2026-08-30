import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import punchRoutes from "./routes/punches";
import eventRoutes from "./routes/events";
import departmentRoutes from "./routes/departments";
import userRoutes from "./routes/users";
import dashboardRoutes from "./routes/dashboard";

const app = express();

const defaultOrigin = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (origin === defaultOrigin) return callback(null, true);
      // Allow any localhost / 127.0.0.1 port in development
      if (
        process.env.NODE_ENV !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/punches", punchRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);

export default app;
