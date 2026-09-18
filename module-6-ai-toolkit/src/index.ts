import express from "express";
import taskRoutes from "./routes/tasks";
import userRoutes from "./routes/users";
import { requireApiKey } from "./middleware/auth";

const app = express();
const PORT = 3458;

// Middleware
app.use(express.json());

// Routes
app.use("/api/tasks", requireApiKey, taskRoutes);
app.use("/api/users", requireApiKey, userRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Start server (only when run directly, not during tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
