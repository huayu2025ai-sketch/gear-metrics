"use server";

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { deepseek } from "@ai-sdk/deepseek";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { queryWeatherRange } from "@/lib/weather";

const outfitInputSchema = z.object({
  destination: z.string().trim().min(1, "目的地不能为空").max(60, "目的地过长"),
  travel_date: z.string().date("出行日期格式错误，需为 YYYY-MM-DD"),
  purpose: z.string().trim().min(1, "出行目的不能为空").max(60, "出行目的过长"),
  days: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? 3 : Number(val)),
    z.number().int().min(1, "天数至少为 1").max(14, "天数最多 14").default(3)
  ),
  luggage: z.enum(["normal", "business"]).default("normal"),
});

function buildOutfitSchema(maxOutfits: number) {
  return z.object({
    feasible: z.boolean(),
    missingLayers: z.array(z.enum(["排汗层", "保暖层", "防风防雨层"])),
    weather: z.array(
      z.object({
        date: z.string(),
        minTemp: z.number(),
        maxTemp: z.number(),
        condition: z.string(),
      })
    ),
    summary: z.string(),
    outfits: z
      .array(
        z.object({
          day: z.number().describe("方案编号（1,2,3...），不是行程天数"),
          topLayers: z.array(z.string()),
          bottomLayer: z.string(),
          footwear: z.string(),
          accessories: z.array(z.string()),
          notes: z.string(),
        })
      )
      .max(maxOutfits)
      .describe(`轮换穿搭方案列表，必须控制在 ${maxOutfits} 套以内`),
    notes: z.array(z.string()),
  });
}

type GearLite = {
  id: string;
  name: string;
  brand: string;
  category: string;
  color: string | null;
  min_temp: number;
  max_temp: number;
  status: string;
  remarks: string | null;
};

type GearForPrompt = {
  id: string;
  name: string;
  brand: string;
  category: string;
  color: string | null;
  status: string;
  remarks: string | null;
};

function pickModel() {
  if (process.env.DEEPSEEK_API_KEY) {
    return deepseek("deepseek-chat");
  }
  if (process.env.GEMINI_API_KEY) {
    return google("gemini-2.5-pro");
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic("claude-3-5-sonnet-latest");
  }
  return null;
}

function detectMissingLayers(gears: GearLite[]) {
  const categories = new Set(gears.map((g) => g.category));
  const hasBase = categories.has("长袖T恤") || categories.has("短袖T恤");
  const hasMid = categories.has("棉服/抓绒") || categories.has("羽绒服");
  const hasShell = categories.has("软壳/皮肤衣");

  const missingLayers: Array<"排汗层" | "保暖层" | "防风防雨层"> = [];
  if (!hasBase) missingLayers.push("排汗层");
  if (!hasMid) missingLayers.push("保暖层");
  if (!hasShell) missingLayers.push("防风防雨层");
  return missingLayers;
}

async function requireSupabaseWithUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "请先登录后再使用 AI 功能" as string | null };
  return { supabase, error: null as string | null };
}

export async function generateOutfitRecommendation(formData: FormData) {
  const rawDays = formData.get("days");

  const parsed = outfitInputSchema.safeParse({
    destination: formData.get("destination"),
    travel_date: formData.get("travel_date"),
    purpose: formData.get("purpose"),
    days: rawDays,
    luggage: formData.get("luggage"),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "输入参数不合法" };
  }

  const days = parsed.data.days;
  let weatherList = null;
  let minTemp: number;
  let maxTemp: number;

  try {
    weatherList = await queryWeatherRange(parsed.data.destination, parsed.data.travel_date, days);
    minTemp = Math.min(...weatherList.map((w) => w.minTemp));
    maxTemp = Math.max(...weatherList.map((w) => w.maxTemp));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "天气查询失败";
    return { success: false as const, error: msg };
  }

  const { supabase, error: authError } = await requireSupabaseWithUser();
  if (authError) {
    return { success: false as const, error: authError };
  }

  const relatedCategories = [
    "长袖T恤",
    "短袖T恤",
    "棉服/抓绒",
    "羽绒服",
    "软壳/皮肤衣",
    "长裤",
    "短裤",
    "鞋履",
  ];

  const { data, error } = await supabase
    .from("outdoor_gears")
    .select("id,name,brand,category,color,min_temp,max_temp,status,remarks")
    .eq("status", "在用")
    .in("category", relatedCategories)
    .lte("min_temp", maxTemp + 10)
    .gte("max_temp", minTemp - 10)
    .order("min_temp", { ascending: true });

  if (error) {
    return { success: false as const, error: error.message };
  }

  const gears = (data ?? []) as GearLite[];

  // Strip temperature fields before sending to LLM so it judges by category
  const gearsForPrompt: GearForPrompt[] = gears.map((g) => ({
    id: g.id,
    name: g.name,
    brand: g.brand,
    category: g.category,
    color: g.color,
    status: g.status,
    remarks: g.remarks,
  }));

  const missingLayers = detectMissingLayers(gears);
  if (missingLayers.length > 0) {
    return {
      success: true as const,
      data: {
        feasible: false,
        missingLayers,
        weather:
          weatherList ?? [
            {
              date: parsed.data.travel_date,
              minTemp,
              maxTemp,
              condition: "未知",
            },
          ],
        summary: `当前装备库无法覆盖该温标，缺少${missingLayers.join("、")}。`,
        outfits: [
          {
            day: 1,
            topLayers: ["缺失"],
            bottomLayer: "请先补齐基础下装",
            footwear: "请先确认适配鞋履",
            accessories: [],
            notes: "请优先补齐缺失层后再生成穿搭建议。",
          },
        ],
        notes: ["请优先补齐缺失层后再生成穿搭建议。"],
      },
      prefilteredCount: gears.length,
    };
  }

  const model = pickModel();
  if (!model) {
    return { success: false as const, error: "未配置 AI Key（DEEPSEEK_API_KEY / GEMINI_API_KEY / ANTHROPIC_API_KEY）" };
  }

  const luggageMode = parsed.data.luggage;
  const isBusiness = luggageMode === "business";
  const outfitCount = isBusiness ? Math.min(days, 3) : days;

  const hasOutdoor = /登山|徒步|越野|攀岩|户外/.test(parsed.data.purpose);

  const luggageHint = isBusiness
    ? `行李策略：精简出差（严格控制总量，共 ${outfitCount} 套轮换方案）
- 总衣物控制在3套轮换以内，优先快干面料，当晚洗次日干。
- 上衣不超过4件（以T恤/速干衬衫为主，可含1件长袖防晒/空调房备用）。
- 下装不超过3条（2条轻薄长裤+1条短裤，或根据场景调整）。
- 外套1件（夏季轻薄皮肤衣/防风夹克，兼顾防晒和早晚温差）。
- 鞋子策略（重要）：
  • 默认只带1双主力鞋，从已有装备中选最适合本次行程的1双即可。
  • 仅当出行目的明确涉及登山、徒步、越野跑、攀岩等户外运动时才额外带1双专用鞋（登山鞋/越野鞋）。
  • 本次出行目的为「${parsed.data.purpose}」${hasOutdoor ? "，包含户外运动，可带2双鞋" : "，属常规出差，只带1双鞋，绝不要推荐第二双"}。
- 所有推荐必须基于用户已有装备，不得虚构。`
    : "行李策略：自由搭配（可根据天气和天数灵活推荐）";

  try {
    const outfitPrompt = `你是户外穿搭顾问。${isBusiness ? `请为用户 ${days} 天的出差行程生成 ${outfitCount} 套轮换穿搭方案。这些方案在全部行程中循环使用，不必每天不同。` : `请根据目的地多日天气和出行目的，从用户已有装备中挑选 ${days} 套穿搭方案。`}

输入信息：
- 目的地：${parsed.data.destination}
- 出行日期：${parsed.data.travel_date}
- 出行天数：${days} 天
- 出行目的：${parsed.data.purpose}
- 每日天气预报：
${(weatherList ?? []).map((w) => `  ${w.date}：${w.condition}，${w.minTemp}℃ ~ ${w.maxTemp}℃`).join("\n")}

${luggageHint}

可用装备（已按状态/品类预筛选，温标信息已隐藏，请根据装备品类和名称自行判断适合温度）：
${JSON.stringify(gearsForPrompt, null, 2)}

要求：
1) 根据出行目的调整穿搭风格（旅游偏功能舒适、商务出差偏简洁正式、日常通勤偏实用）。
2) outfits 数组长度**必须**为 ${outfitCount}${isBusiness ? "（绝对不能等于 ${days}），每套是一个独立轮换方案，day 字段为方案编号（1-${outfitCount}），不是行程天数。比如 5 天出差只返回 3 套方案，用户自行循环穿。" : "，每天一套，day 从 1 开始递增"}。
3) 每套穿搭的 topLayers 按从内到外的顺序排列。
4) 优先复用装备（如基础层可重复），但外套尽量错开，保持新鲜感。
5) 考虑颜色搭配协调性，避免同套内颜色冲突。
6) 仅可使用输入装备，不得虚构。
7) ${isBusiness ? "在 summary 中明确写出这 ${outfitCount} 套方案如何在 ${days} 天中轮换。若某方案存在不足在 notes 说明。" : "若某天库存不足在 notes 说明。"}
8) 输出中文，简洁可执行。`;
    console.log("[AI Outfit] Prompt:\n", outfitPrompt);

    const { object } = await generateObject({
      model,
      schema: buildOutfitSchema(outfitCount),
      prompt: outfitPrompt,
    });

    console.log("[AI Outfit] Response:\n", JSON.stringify(object, null, 2));

    return {
      success: true as const,
      data: object,
      prefilteredCount: gears.length,
      luggage: luggageMode,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "推荐生成失败";
    return { success: false as const, error: message };
  }
}
