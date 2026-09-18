import { Request, Response, NextFunction } from "express";

/**
 * Minimal bearer-token auth gate for all /api routes.
 * Fails closed: if API_KEY isn't configured, every request is rejected
 * rather than silently allowing unauthenticated access.
 */
export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "Server misconfiguration: API_KEY not set" });
    return;
  }

  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token || token !== apiKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
