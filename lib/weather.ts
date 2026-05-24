export type WeatherInfo = {
  location: string;
  date: string;
  minTemp: number;
  maxTemp: number;
  condition: string;
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
  // 1. Geocoding
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      destination
    )}&count=1&language=zh`,
    { next: { revalidate: 3600 } }
  );
  if (!geoRes.ok) {
    throw new Error("地理位置查询失败");
  }
  const geoData = (await geoRes.json()) as {
    results?: Array<{
      name: string;
      latitude: number;
      longitude: number;
    }>;
  };
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`无法找到目的地：${destination}`);
  }
  const loc = geoData.results[0];

  // 2. Compute end date
  const end = new Date(startDate);
  end.setDate(end.getDate() + days - 1);
  const endDate = end.toISOString().split("T")[0];

  // 3. Forecast
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&start_date=${startDate}&end_date=${endDate}`,
    { next: { revalidate: 3600 } }
  );
  if (!weatherRes.ok) {
    throw new Error("天气预报查询失败");
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
    weatherData.daily.time.length === 0
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
