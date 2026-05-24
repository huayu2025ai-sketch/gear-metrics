"use server";

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { deepseek } from "@ai-sdk/deepseek";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const purchaseAuditInputSchema = z.object({
  description: z.string().trim().min(10, "描述不能为空").max(3000, "描述过长，请精简后重试"),
});

const purchaseAuditSchema = z.object({
  extractedName: z.string().describe("从描述中提取的装备名称"),
  extractedBrand: z.string().describe("从描述中提取的品牌"),
  extractedCategory: z.string().describe("从描述中提取的分类"),
  extractedPrice: z.number().describe("从描述中提取的价格，若无法提取则填0"),
  extractedFeatures: z.string().describe("从描述中提取的功能/规格摘要"),
  fitAssessment: z.object({
    suitable: z.boolean().describe("是否适合用户身材"),
    reason: z.string().describe("适合或不适合的具体原因"),
  }),
  purchaseIndex: z.number().int().min(1).max(10),
  conclusion: z.enum(["建议购买", "谨慎购买", "暂不购买"]),
  overlapScore: z.number().int().min(0).max(100),
  budgetPremiumRate: z.number(),
  complementarityScore: z.number().int().min(0).max(100),
  productReview: z.object({
    rating: z.number().int().min(1).max(10).describe("商品本身综合品质评分，与购买指数独立"),
    quality: z.string().describe("做工、面料、技术配置等品质评价"),
    pros: z.array(z.string()).describe("商品本身的优点"),
    cons: z.array(z.string()).describe("商品本身的缺点或不足"),
    valueComment: z.string().describe("性价比及同价位竞品对比评价"),
  }),
  summary: z.string(),
  reasons: z.array(z.string()),
  neutralAdvice: z.array(z.string()),
});

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

async function requireSupabaseWithUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "请先登录后再使用 AI 功能" as string | null };
  return { supabase, error: null as string | null };
}

export async function generatePurchaseAudit(formData: FormData) {
  const parsed = purchaseAuditInputSchema.safeParse({
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "输入参数不合法" };
  }

  const { supabase, error: authError } = await requireSupabaseWithUser();
  if (authError) {
    return { success: false as const, error: authError };
  }

  const { data, error } = await supabase
    .from("outdoor_gears")
    .select("name,brand,category,purchase_price,status,remarks")
    .in("status", ["在用", "在途", "闲置"])
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) {
    return { success: false as const, error: error.message };
  }

  const assets = data ?? [];

  const model = pickModel();
  if (!model) {
    return { success: false as const, error: "未配置 AI Key（DEEPSEEK_API_KEY / GEMINI_API_KEY / ANTHROPIC_API_KEY）" };
  }

  try {
    const auditPrompt = `你是理性消费审计助手。请基于用户画像、拟购装备描述和现有资产，给出中立建议。

用户画像（审计必须考虑）：
- 身高：170cm
- 体重：75kg
- 年龄：48岁

拟购装备描述（用户直接粘贴，请从中提取名称、品牌、分类、价格、功能规格）：
${parsed.data.description}

用户现有资产（用于查重和互补分析）：
${JSON.stringify(assets, null, 2)}

审计维度与要求：
0) 商品本身评测（独立于用户适合性）：基于品牌口碑、型号定位、面料/技术配置、做工水准，给出客观的商品品质评价。包括优点、缺点、同价位竞争力。
1) 适合性审查：该装备的尺码、版型、功能定位是否适合身高170cm、体重75kg、年龄48岁的用户？如过于年轻化、尺码范围不包含、版型不适合该体型，必须明确指出。
2) 重复投资审查：与已有资产的功能重叠度。如果已有同类装备且功能覆盖，应标记为高重叠，降低购买指数。
3) 互补搭配审查：该装备是否能与已有装备形成搭配（如新买的裤子能搭已有外套），而不是替代关系。搭配利用已有装备越多，互补分越高。
4) 预算审查：从描述中提取拟购价格，与同分类历史均价对比。若无法提取价格，budgetPremiumRate 设为0并在 reasons 中说明。
5) 结论必须中立，避免"强烈建议/严厉否定"等措辞。
6) purchaseIndex 为 1-10（综合购买建议，越低越不值得买）；productReview.rating 为 1-10（商品本身品质，与购买指数独立）。
7) reasons 和 neutralAdvice 均使用中文短句，且每条都要有实际依据。`
    console.log("[AI Audit] Prompt:\n", auditPrompt);

    const { object } = await generateObject({
      model,
      schema: purchaseAuditSchema,
      prompt: auditPrompt,
    });

    console.log("[AI Audit] Response:\n", JSON.stringify(object, null, 2));

    return {
      success: true as const,
      data: {
        ...object,
        budgetPremiumRate: object.budgetPremiumRate,
      },
      context: {
        inventoryCount: assets.length,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "审计生成失败";
    return { success: false as const, error: message };
  }
}
