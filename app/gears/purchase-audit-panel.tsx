"use client";

import { useState, useTransition } from "react";
import { generatePurchaseAudit } from "@/app/actions/audit";

type AuditResult =
  | { success: false; error: string }
  | {
      success: true;
      data: {
        extractedName: string;
        extractedBrand: string;
        extractedCategory: string;
        extractedPrice: number;
        extractedFeatures: string;
        fitAssessment: {
          suitable: boolean;
          reason: string;
        };
        purchaseIndex: number;
        conclusion: "建议购买" | "谨慎购买" | "暂不购买";
        overlapScore: number;
        budgetPremiumRate: number;
        complementarityScore: number;
        productReview: {
          rating: number;
          quality: string;
          pros: string[];
          cons: string[];
          valueComment: string;
        };
        summary: string;
        reasons: string[];
        neutralAdvice: string[];
      };
      context: {
        inventoryCount: number;
        profileConfigured: boolean;
        profile: {
          height_cm: number;
          weight_kg: number;
          age: number;
        } | null;
      };
    };

export function PurchaseAuditPanel() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AuditResult | null>(null);

  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-panel p-5">
      <h2 className="mb-4 text-lg font-medium">AI 新购审计（中立建议）</h2>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = (await generatePurchaseAudit(formData)) as AuditResult;
            setResult(res);
          });
        }}
      >
        <textarea
          name="description"
          placeholder={`请粘贴完整的产品描述，例如：
始祖鸟 Beta LT 硬壳冲锋衣，Gore-Tex 面料，L码，黑色，价格3200元。轻量约395g，头盔兼容StormHood帽，腋下拉链透气。适合徒步、登山、日常通勤。`}
          required
          className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
          rows={6}
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {isPending ? "审计中..." : "生成审计"}
        </button>
      </form>

      {result ? (
        <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-4 text-sm">
          {!result.success ? (
            <p className="text-red-300">审计失败：{result.error}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span>参与审计资产：{result.context.inventoryCount} 件</span>
                <span>
                  用户画像：{result.context.profileConfigured ? "已配置" : "未配置（适合性结论会降级）"}
                </span>
                {result.context.profile ? (
                  <span>
                    画像快照：{result.context.profile.height_cm}cm / {result.context.profile.weight_kg}kg / {result.context.profile.age}岁
                  </span>
                ) : null}
                <span>
                  识别：{result.data.extractedBrand} {result.data.extractedName}
                </span>
                <span>分类：{result.data.extractedCategory}</span>
                <span>提取价格：{result.data.extractedPrice > 0 ? `¥${result.data.extractedPrice}` : "未提取到"}</span>
              </div>

              {!result.context.profileConfigured ? (
                <div className="rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  未配置用户画像，适合性审查会降级。请先到{" "}
                  <a href="/settings" className="underline">
                    系统设置
                  </a>{" "}
                  维护身高、体重、年龄。
                </div>
              ) : null}

              <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="mb-1 text-xs text-[#888]">适合性评估</p>
                <p className={result.data.fitAssessment.suitable ? "text-emerald-300" : "text-yellow-300"}>
                  {result.data.fitAssessment.suitable ? "适合" : "不适合"}：
                  {result.data.fitAssessment.reason}
                </p>
              </div>

              <p className="text-emerald-300">
                购买指数：{result.data.purchaseIndex}/10 | 结论：{result.data.conclusion}
              </p>
              <p>功能重叠分：{result.data.overlapScore}/100（越高表示重叠越高）</p>
              <p>预算溢价率：{(result.data.budgetPremiumRate * 100).toFixed(2)}%</p>
              <p>系统互补分：{result.data.complementarityScore}/100（越高表示互补越好）</p>

              <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs text-[#888]">商品本身评测</span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-medium">
                    {result.data.productReview.rating}/10
                  </span>
                </div>
                <p className="mb-2 text-[#ccc]">{result.data.productReview.quality}</p>
                {result.data.productReview.pros.length > 0 && (
                  <div className="mb-1.5">
                    <span className="text-xs text-emerald-400">优点</span>
                    <ul className="list-disc pl-5 text-muted">
                      {result.data.productReview.pros.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.data.productReview.cons.length > 0 && (
                  <div className="mb-1.5">
                    <span className="text-xs text-red-400">缺点</span>
                    <ul className="list-disc pl-5 text-muted">
                      {result.data.productReview.cons.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-[#888]">{result.data.productReview.valueComment}</p>
              </div>

              <p className="font-medium text-[#ccc]">{result.data.summary}</p>

              <ul className="list-disc pl-5 text-muted">
                {result.data.reasons.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className="pt-1">
                <p className="mb-1 text-foreground">中立建议：</p>
                <ul className="list-disc pl-5 text-muted">
                  {result.data.neutralAdvice.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
