export type WeatherInfo = {
  location: string;
  date: string;
  minTemp: number;
  maxTemp: number;
  condition: string;
};

type GeoLocation = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  admin2?: string;
};

const DESTINATION_ALIASES: Record<string, GeoLocation> = {
  长白山: {
    name: "长白山",
    latitude: 42.006,
    longitude: 128.055,
    country: "中国",
    admin1: "吉林省",
  },
  长白山天池: {
    name: "长白山天池",
    latitude: 42.006,
    longitude: 128.055,
    country: "中国",
    admin1: "吉林省",
  },
};

export async function queryWeather(
  destination: string,
  date: string
): Promise<WeatherInfo> {
  const list = await queryWeatherRange(destination, date, 1);
  return list[0];
}

export async function queryWeatherRange(
  destination: string,
  startDate: string,
  days: number
): Promise<WeatherInfo[]> {
  const trimmedDestination = destination.trim();
  const endDate = computeEndDate(startDate, days);

  // 1. Geocoding
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmedDestination
    )}&count=10&language=zh`,
    { headers: { "User-Agent": "gear-metrics/0.1" }, next: { revalidate: 3600 } }
  );
  if (!geoRes.ok) {
    const geoErr = await safeReadErrorText(geoRes);
    throw new Error(
      `地理位置查询失败${geoRes.status ? ` (${geoRes.status})` : ""}${geoErr ? `：${geoErr}` : ""}`
    );
  }
  const geoData = (await geoRes.json()) as { results?: GeoLocation[] };
  const loc = pickLocation(trimmedDestination, geoData.results);

  // 2. Forecast
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&start_date=${startDate}&end_date=${endDate}`,
    { headers: { "User-Agent": "gear-metrics/0.1" }, next: { revalidate: 3600 } }
  );
  if (!weatherRes.ok) {
    throw new Error(await buildWeatherError(weatherRes));
  }
  const weatherData = (await weatherRes.json()) as {
    daily?: {
      time: string[];
      temperature_2m_min: number[];
      temperature_2m_max: number[];
      weather_code: number[];
    };
  };
  if (
    !weatherData.daily ||
    !weatherData.daily.time ||
    weatherData.daily.time.length === 0 ||
    !weatherData.daily.temperature_2m_min ||
    !weatherData.daily.temperature_2m_max ||
    !weatherData.daily.weather_code
  ) {
    throw new Error("无法获取该日期的天气预报");
  }

  return weatherData.daily.time.map((date, idx) => ({
    location: loc.name,
    date,
    minTemp: Math.round(weatherData.daily!.temperature_2m_min[idx]),
    maxTemp: Math.round(weatherData.daily!.temperature_2m_max[idx]),
    condition: weatherCodeToText(weatherData.daily!.weather_code[idx]),
  }));
}

function computeEndDate(startDate: string, days: number): string {
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) {
    throw new Error("出行日期格式错误，需为 YYYY-MM-DD");
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days - 1);
  return end.toISOString().split("T")[0];
}

function pickLocation(destination: string, results?: GeoLocation[]): GeoLocation {
  const alias = DESTINATION_ALIASES[destination];
  const candidates = results ?? [];

  if (candidates.length === 0) {
    if (alias) return alias;
    throw new Error(`无法找到目的地：${destination}`);
  }

  const exactChinaMatch = candidates.find(
    (item) => item.name === destination && item.country === "中国"
  );
  if (exactChinaMatch) return exactChinaMatch;

  const chinaMatch = candidates.find((item) => item.country === "中国");
  if (chinaMatch) return chinaMatch;

  return alias ?? candidates[0];
}

async function safeReadErrorText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 200);
  } catch {
    return "";
  }
}

async function buildWeatherError(response: Response): Promise<string> {
  const statusPrefix = response.status ? ` (${response.status})` : "";
  let reason = "";
  let rawText = "";

  try {
    rawText = await response.text();
    const data = JSON.parse(rawText) as { reason?: string };
    reason = data.reason ?? "";
  } catch {
    // Ignore non-JSON error bodies from upstream.
  }

  if (/past|historical|archive/i.test(reason)) {
    return "天气预报暂不支持过去日期，请选择今天或未来日期";
  }
  if (/forecast days|date range|invalid date|start_date|end_date/i.test(reason)) {
    return "天气预报仅支持近期日期，请把出行日期调整到未来约 16 天内";
  }
  if (/timezone/i.test(reason)) {
    return `天气预报查询失败${statusPrefix}：目的地时区解析异常，请换用更具体的城市或景区名称`;
  }

  if (reason) return `天气预报查询失败${statusPrefix}：${reason}`;
  if (rawText) return `天气预报查询失败${statusPrefix}：${rawText.slice(0, 200)}`;
  return `天气预报查询失败${statusPrefix}`;
}

function weatherCodeToText(code: number): string {
  const map: Record<number, string> = {
    0: "晴",
    1: "大部晴朗",
    2: "多云",
    3: "阴",
    45: "雾",
    48: "雾凇",
    51: "毛毛雨",
    53: "毛毛雨",
    55: "毛毛雨",
    56: "冻雨",
    57: "冻雨",
    61: "小雨",
    63: "中雨",
    65: "大雨",
    66: "冻雨",
    67: "冻雨",
    71: "小雪",
    73: "中雪",
    75: "大雪",
    77: "雪粒",
    80: "阵雨",
    81: "阵雨",
    82: "强降雨",
    85: "阵雪",
    86: "阵雪",
    95: "雷雨",
    96: "雷雨伴冰雹",
    99: "雷雨伴冰雹",
  };
  return map[code] ?? "未知";
}
