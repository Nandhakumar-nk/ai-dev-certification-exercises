import express from "express";
import dashboardRoute from "./routes/dashboard.route";
import forecastRoute from "./routes/forecast.route";
import healthRoute from "./routes/health.route";
import weatherRoute from "./routes/weather.route";

const app = express();

app.use("/", dashboardRoute);
app.use("/health", healthRoute);
app.use("/weather", weatherRoute);
app.use("/forecast", forecastRoute);

export default app;
