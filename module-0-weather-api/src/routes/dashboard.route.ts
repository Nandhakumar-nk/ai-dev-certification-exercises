import { Router } from "express";
import { getWeatherForCity } from "../services/weather.service";
import { renderDashboard } from "../views/dashboard.view";

const DASHBOARD_CITIES = ["London", "Tokyo", "New York", "Sydney", "Cairo"];

const router = Router();

router.get("/", async (_req, res) => {
  const cities = DASHBOARD_CITIES.map(getWeatherForCity);
  res.send(renderDashboard(cities));
});

export default router;
