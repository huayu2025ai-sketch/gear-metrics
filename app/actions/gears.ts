"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";
import { GEAR_CATEGORIES, GEAR_STATUS, type GearStatus } from "@/lib/gear";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export type GearRecord = {
  id: string;
  name: string;
  brand: string;
  category: (typeof GEAR_CATEGORIES)[number];
  min_temp: number;
  max_temp: number;
  status: GearStatus;
  color: string | null;
  size: string | null;
  fit_type: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  remarks: string | null;
  created_at: string;
};

export type ActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

export type CsvImportRow = {
  name: string;
  brand: string;
  category: string;
  min_temp: string | number;
  max_temp: string | number;
  status?: string;
  color?: string;
  size?: string;
  purchase_price?: string | number;
  purchase_date?: string;
  remarks?: string;
};

export type CsvImportResult = {
  success: boolean;
  importedCount: number;
  failedCount: number;
  errors: Array<{ row: number; reason: string }>;
  message: string;
};

const CATEGORY_ALIAS: Record<string, (typeof GEAR_CATEGORIES)[number]> = {
  "羽绒服": "羽绒服",
  "棉服": "棉服/抓绒",
  "抓绒": "棉服/抓绒",
  "棉服/抓绒": "棉服/抓绒",
  "软壳": "软壳/皮肤衣",
  "皮肤衣": "软壳/皮肤衣",
  "软壳/皮肤衣": "软壳/皮肤衣",
  "长袖": "长袖T恤",
  "长袖t恤": "长袖T恤",
  "长袖T恤": "长袖T恤",
  "短袖": "短袖T恤",
  "短袖t恤": "短袖T恤",
  "短袖T恤": "短袖T恤",
  "t恤": "长袖T恤",
  "T恤": "长袖T恤",
    "裤子": "长裤",
  "长裤": "长裤",
  "短裤": "短裤",
  "裤装": "长裤",
  "鞋子": "鞋履",
  "运动鞋": "鞋履",
  "鞋履": "鞋履",
  "背包": "背包",
  "配饰": "其他",
  "野外装备": "其他",
  "摄影装备": "其他",
  "安全装备": "其他",
  "其他": "其他",
};

const STATUS_ALIAS: Record<string, GearStatus> = {
  "在用": "在用",
  "在途": "在途",
  "闲置": "闲置",
  "损耗": "损耗",
  "使用中": "在用",
  "待收货": "在途",
  "未使用": "闲置",
};

const gearUpsertSchema = z
  .object({
    name: z.string().trim().min(1, "装备名称不能为空").max(80, "装备名称不能超过 80 个字符"),
    brand: z.string().trim().min(1, "品牌不能为空").max(80, "品牌不能超过 80 个字符"),
    category: z.enum(GEAR_CATEGORIES, { error: "分类不合法" }),
    min_temp: z.coerce.number().int().min(-60, "最低温度过低").max(60, "最低温度过高"),
    max_temp: z.coerce.number().int().min(-60, "最高温度过低").max(60, "最高温度过高"),
    status: z.enum(GEAR_STATUS, { error: "状态不合法" }).default("在用"),
    color: z.string().trim().max(30, "颜色不能超过 30 个字符").optional(),
    size: z.string().trim().max(30, "尺码不能超过 30 个字符").optional(),
    purchase_price: z
      .union([z.literal(""), z.coerce.number().min(0, "购入价格不能为负数").max(1000000, "购入价格过大")])
      .optional(),
    purchase_date: z
      .union([z.literal(""), z.string().date("购入日期格式错误，需为 YYYY-MM-DD")])
      .optional(),
    remarks: z.string().trim().max(500, "备注不能超过 500 个字符").optional(),
  })
  .refine((val) => val.min_temp <= val.max_temp, {
    message: "最低温度不能高于最高温度",
    path: ["min_temp"],
  });

const gearFilterSchema = z.object({
  category: z.union([z.literal("全部"), z.enum(GEAR_CATEGORIES)]).default("全部"),
  status: z.union([z.literal("全部"), z.enum(GEAR_STATUS)]).default("全部"),
  brand: z.string().trim().optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional(),
  price_min: z.preprocess((val) => (val === "" || val === undefined || val === null ? undefined : Number(val)), z.number().min(0).optional()),
  price_max: z.preprocess((val) => (val === "" || val === undefined || val === null ? undefined : Number(val)), z.number().min(0).optional()),
});

function normalizeOptionalText(input: string | undefined): string | null {
  if (!input) return null;
  const normalized = input.trim();
  return normalized.length === 0 ? null : normalized;
}

function normalizePrice(input: string | number | undefined): number | null {
  if (input === undefined || input === "") return null;
  return typeof input === "number" ? input : Number(input);
}

function normalizeCategory(input: string | undefined) {
  const raw = (input ?? "").trim();
  if (!raw) return "";
  return CATEGORY_ALIAS[raw] ?? raw;
}

function normalizeStatus(input: string | undefined): GearStatus | string {
  const raw = (input ?? "").trim();
  if (!raw) return "在用";
  return STATUS_ALIAS[raw] ?? raw;
}

function normalizeCurrency(input: string | number | undefined) {
  if (input === undefined) return "";
  if (typeof input === "number") return input;
  const trimmed = input.trim();
  if (!trimmed) return "";
  const normalized = trimmed.replace(/[￥¥,\s]/g, "");
  return normalized;
}

function normalizeDate(input: string | undefined) {
  const raw = (input ?? "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const matched = raw.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (!matched) return raw;
  const year = matched[1];
  const month = matched[2].padStart(2, "0");
  const day = matched[3].padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function humanizeZodIssue(issue: z.ZodIssue): string {
  const field = issue.path[0];
  if (typeof field === "string") {
    if (field === "category") return "分类不合法，请使用系统支持的分类（如：长袖T恤、短袖T恤、棉服/抓绒、羽绒服、软壳/皮肤衣、长裤、短裤、鞋履、背包、其他）";
    if (field === "status") return "状态不合法，请使用：在用 / 在途 / 闲置 / 损耗";
    if (field === "min_temp" || field === "max_temp") return "温标格式错误，请填写数字（可留空使用默认值）";
    if (field === "purchase_date") return "购入日期格式错误，需为 YYYY-MM-DD";
    if (field === "name") return "装备名称不能为空";
    if (field === "brand") return "品牌不能为空";
  }
  return issue.message || "数据不合法";
}

function humanizeDbError(error: PostgrestError) {
  if (error.code === "23514" && error.message.includes("outdoor_gears_category_check")) {
    return "数据库分类约束与当前应用分类不一致。请在 Supabase 执行最新 SQL 迁移（更新 outdoor_gears_category_check）。";
  }
  return error.message;
}

async function requireUserId() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, userId: null as string | null, error: "请先登录后再操作" };
  }
  return { supabase, userId: user.id, error: null as string | null };
}

export async function fetchGears(filters?: {
  category?: string;
  status?: string;
  brand?: string;
  date_from?: string;
  date_to?: string;
  price_min?: string | number;
  price_max?: string | number;
}) {
  const parsedFilters = gearFilterSchema.safeParse({
    category: filters?.category ?? "全部",
    status: filters?.status ?? "全部",
    brand: filters?.brand,
    date_from: filters?.date_from,
    date_to: filters?.date_to,
    price_min: filters?.price_min,
    price_max: filters?.price_max,
  });

  if (!parsedFilters.success) {
    return {
      success: false,
      error: parsedFilters.error.issues[0]?.message ?? "筛选参数不合法",
      data: [] as GearRecord[],
    };
  }

  const { supabase, error: authError } = await requireUserId();
  if (authError) {
    return { success: false, error: authError, data: [] as GearRecord[] };
  }
  let query = supabase.from("outdoor_gears").select("*").order("created_at", { ascending: false });

  if (parsedFilters.data.category !== "全部") {
    query = query.eq("category", parsedFilters.data.category);
  }
  if (parsedFilters.data.status !== "全部") {
    query = query.eq("status", parsedFilters.data.status);
  }
  if (parsedFilters.data.brand) {
    const brands = parsedFilters.data.brand
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);
    if (brands.length > 0) {
      query = query.in("brand", brands);
    }
  }
  if (parsedFilters.data.date_from) {
    query = query.gte("purchase_date", parsedFilters.data.date_from);
  }
  if (parsedFilters.data.date_to) {
    query = query.lte("purchase_date", parsedFilters.data.date_to);
  }
  if (parsedFilters.data.price_min !== undefined) {
    query = query.gte("purchase_price", parsedFilters.data.price_min);
  }
  if (parsedFilters.data.price_max !== undefined) {
    query = query.lte("purchase_price", parsedFilters.data.price_max);
  }

  const { data, error } = await query;
  if (error) {
    return { success: false, error: humanizeDbError(error), data: [] as GearRecord[] };
  }

  return { success: true, data: (data ?? []) as GearRecord[] };
}

export async function fetchBrands() {
  const { supabase, error: authError } = await requireUserId();
  if (authError) {
    return { success: false as const, error: authError, data: [] as string[] };
  }
  const { data, error } = await supabase
    .from("outdoor_gears")
    .select("brand")
    .order("brand", { ascending: true });

  if (error) {
    return { success: false as const, error: error.message, data: [] as string[] };
  }

  const brands = [
    ...new Set((data ?? []).map((d) => d.brand).filter((b): b is string => Boolean(b))),
  ];
  return { success: true as const, data: brands };
}

export async function createGear(formData: FormData): Promise<ActionResult> {
  const parsed = gearUpsertSchema.safeParse({
    name: formData.get("name"),
    brand: formData.get("brand"),
    category: formData.get("category"),
    min_temp: formData.get("min_temp"),
    max_temp: formData.get("max_temp"),
    status: formData.get("status"),
    color: formData.get("color"),
    size: formData.get("size"),
    purchase_price: formData.get("purchase_price"),
    purchase_date: formData.get("purchase_date"),
    remarks: formData.get("remarks"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "输入参数不合法" };
  }

  const { supabase, userId, error: authError } = await requireUserId();
  if (authError || !userId) {
    return { success: false, error: authError ?? "请先登录后再操作" };
  }
  const payload = {
    ...parsed.data,
    user_id: userId,
    color: normalizeOptionalText(parsed.data.color),
    size: normalizeOptionalText(parsed.data.size),
    purchase_price: normalizePrice(parsed.data.purchase_price),
    purchase_date: parsed.data.purchase_date || null,
    remarks: normalizeOptionalText(parsed.data.remarks),
  };

  const { error } = await supabase.from("outdoor_gears").insert([payload]);
  if (error) {
    return { success: false, error: humanizeDbError(error) };
  }

  revalidatePath("/");
  revalidatePath("/input");
  revalidatePath("/query");
  return { success: true, message: "装备已创建" };
}

export async function updateGear(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { success: false, error: "缺少装备 ID" };
  }

  const parsed = gearUpsertSchema.safeParse({
    name: formData.get("name"),
    brand: formData.get("brand"),
    category: formData.get("category"),
    min_temp: formData.get("min_temp"),
    max_temp: formData.get("max_temp"),
    status: formData.get("status"),
    color: formData.get("color"),
    size: formData.get("size"),
    purchase_price: formData.get("purchase_price"),
    purchase_date: formData.get("purchase_date"),
    remarks: formData.get("remarks"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "输入参数不合法" };
  }

  const { supabase, error: authError } = await requireUserId();
  if (authError) {
    return { success: false, error: authError };
  }
  const payload = {
    ...parsed.data,
    color: normalizeOptionalText(parsed.data.color),
    size: normalizeOptionalText(parsed.data.size),
    purchase_price: normalizePrice(parsed.data.purchase_price),
    purchase_date: parsed.data.purchase_date || null,
    remarks: normalizeOptionalText(parsed.data.remarks),
  };

  const { error } = await supabase.from("outdoor_gears").update(payload).eq("id", id);
  if (error) {
    return { success: false, error: humanizeDbError(error) };
  }

  revalidatePath("/");
  revalidatePath("/input");
  revalidatePath("/query");
  return { success: true, message: "装备已更新" };
}

export async function deleteGear(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { success: false, error: "缺少装备 ID" };
  }

  const { supabase, error: authError } = await requireUserId();
  if (authError) {
    return { success: false, error: authError };
  }
  const { error } = await supabase.from("outdoor_gears").delete().eq("id", id);
  if (error) {
    return { success: false, error: humanizeDbError(error) };
  }

  revalidatePath("/");
  revalidatePath("/input");
  revalidatePath("/query");
  return { success: true, message: "装备已删除" };
}

export async function toggleGearStatus(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const currentStatus = String(formData.get("status") ?? "");
  if (!id) {
    return { success: false, error: "缺少装备 ID" };
  }

  const parsedStatus = z.enum(GEAR_STATUS).safeParse(currentStatus);
  if (!parsedStatus.success) {
    return { success: false, error: "当前状态不合法" };
  }

  const idx = GEAR_STATUS.indexOf(parsedStatus.data);
  const nextStatus = GEAR_STATUS[(idx + 1) % GEAR_STATUS.length];

  const { supabase, error: authError } = await requireUserId();
  if (authError) {
    return { success: false, error: authError };
  }
  const { error } = await supabase.from("outdoor_gears").update({ status: nextStatus }).eq("id", id);
  if (error) {
    return { success: false, error: humanizeDbError(error) };
  }

  revalidatePath("/");
  revalidatePath("/input");
  revalidatePath("/query");
  return { success: true, message: `状态已更新为 ${nextStatus}` };
}

export async function importGearsFromCsv(rows: CsvImportRow[]): Promise<CsvImportResult> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      success: false,
      importedCount: 0,
      failedCount: 0,
      errors: [],
      message: "未检测到可导入的数据",
    };
  }

  const { supabase, userId, error: authError } = await requireUserId();
  if (authError || !userId) {
    return {
      success: false,
      importedCount: 0,
      failedCount: rows.length,
      errors: [{ row: 0, reason: authError ?? "请先登录后再操作" }],
      message: "导入失败，未登录",
    };
  }
  const validPayloads: Array<Record<string, unknown>> = [];
  const errors: Array<{ row: number; reason: string }> = [];

  rows.forEach((row, index) => {
    const normalizedCategory = normalizeCategory(row.category);
    const normalizedStatus = normalizeStatus(row.status);
    const parsed = gearUpsertSchema.safeParse({
      name: row.name,
      brand: row.brand,
      category: normalizedCategory,
      min_temp: row.min_temp,
      max_temp: row.max_temp,
      status: normalizedStatus,
      color: row.color ?? "",
      size: row.size ?? "",
      purchase_price: normalizeCurrency(row.purchase_price),
      purchase_date: normalizeDate(row.purchase_date),
      remarks: row.remarks ?? "",
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      errors.push({
        row: index + 2,
        reason: firstIssue ? humanizeZodIssue(firstIssue) : "数据不合法",
      });
      return;
    }

    validPayloads.push({
      ...parsed.data,
      user_id: userId,
      color: normalizeOptionalText(parsed.data.color),
      size: normalizeOptionalText(parsed.data.size),
      purchase_price: normalizePrice(parsed.data.purchase_price),
      purchase_date: parsed.data.purchase_date || null,
      remarks: normalizeOptionalText(parsed.data.remarks),
    });
  });

  if (validPayloads.length > 0) {
    const { error } = await supabase.from("outdoor_gears").insert(validPayloads);
    if (error) {
      return {
        success: false,
        importedCount: 0,
        failedCount: rows.length,
        errors: [{ row: 0, reason: humanizeDbError(error) }],
        message: "导入失败，数据库写入错误",
      };
    }
  }

  revalidatePath("/");
  revalidatePath("/input");
  revalidatePath("/query");

  const importedCount = validPayloads.length;
  const failedCount = errors.length;
  return {
    success: failedCount === 0,
    importedCount,
    failedCount,
    errors,
    message: `导入完成：成功 ${importedCount} 条，失败 ${failedCount} 条`,
  };
}
