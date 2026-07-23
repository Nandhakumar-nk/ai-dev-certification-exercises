import { Router } from "express";
import { getWeatherForCity } from "../services/weather.service";

const router = Router();

router.get("/:city", async (req, res) => {
  const { city } = req.params;
  res.json(getWeatherForCity(city));
});

export default router;
