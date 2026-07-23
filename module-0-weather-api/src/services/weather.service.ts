const CONDITIONS = [
  "Sunny",
  "Partly Cloudy",
  "Cloudy",
  "Rainy",
  "Stormy",
  "Snowy",
  "Windy",
  "Foggy",
];

const CONDITION_EMOJI: Record<string, string> = {
  Sunny: "☀️",
  "Partly Cloudy": "⛅",
  Cloudy: "☁️",
  Rainy: "🌧️",
  Stormy: "⛈️",
  Snowy: "❄️",
  Windy: "🌬️",
  Foggy: "🌫️",
};

export const getConditionEmoji = (condition: string): string =>
  CONDITION_EMOJI[condition] ?? "🌡️";

const hashString = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number) => {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const randomInRange = (random: () => number, min: number, max: number): number =>
  Math.round(min + random() * (max - min));

export type Weather = {
  city: string;
  temp: number;
  condition: string;
  humidity: number;
};

export type ForecastDay = Weather & {
  day: string;
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const generateWeather = (seed: string): Omit<Weather, "city"> => {
  const random = mulberry32(hashString(seed));
  return {
    temp: randomInRange(random, 5, 35),
    condition: CONDITIONS[randomInRange(random, 0, CONDITIONS.length - 1)],
    humidity: randomInRange(random, 30, 90),
  };
};

export const getWeatherForCity = (city: string): Weather => ({
  city,
  ...generateWeather(city.toLowerCase()),
});

export const getForecastForCity = (city: string): ForecastDay[] => {
  const today = new Date().getDay();
  return Array.from({ length: 5 }, (_, i) => {
    const dayName = DAY_NAMES[(today + i) % 7];
    return {
      city,
      day: dayName,
      ...generateWeather(`${city.toLowerCase()}-${i}`),
    };
  });
};
