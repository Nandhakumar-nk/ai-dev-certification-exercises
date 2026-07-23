import { Router } from "express";
import { getForecastForCity } from "../services/weather.service";

const router = Router();

router.get("/:city", async (req, res) => {
  const { city } = req.params;
  res.json(getForecastForCity(city));
});

export default router;
