import { Router } from "express";

const router = Router();

router.get("/", async (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

export default router;
