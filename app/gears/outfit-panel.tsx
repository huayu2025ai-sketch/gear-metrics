"use client";

import { useState, useTransition } from "react";
import { generateOutfitRecommendation } from "@/app/actions/outfit";

type OutfitResult =
  | { success: false; error: string }
  | {
      success: true;
      prefilteredCount: number;
      luggage?: "normal" | "business";
      data: {
        feasible: boolean;
        missingLayers: string[];
        weather: Array<{
          date: string;
          minTemp: number;
          maxTemp: number;
          condition: string;
        }>;
        summary: string;
        outfits: Array<{
          day: number;
          topLayers: string[];
          bottomLayer: string;
          footwear: string;
          accessories: string[];
          notes: string;
        }>;
        notes: string[];
      };
    };

export function OutfitPanel() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<OutfitResult | null>(null);

  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-panel p-5">
      <h2 className="mb-4 text-lg font-medium">AI 穿衣推荐</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = (await generateOutfitRecommendation(formData)) as OutfitResult;
            setResult(res);
          });
        }}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            name="destination"
            placeholder="目的地（如：成都）"
            required
            className="rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
          />
          <input
            name="travel_date"
            type="date"
            required
            className="rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
          />
          <input
            name="days"
            type="number"
            min={1}
            max={14}
            defaultValue={3}
            placeholder="天数"
            className="rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
          />
          <input
            name="purpose"
            placeholder="出行目的（如：旅游、商务出差）"
            required
            className="rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm md:col-span-2"
          />
          <select
            name="luggage"
            defaultValue="normal"
            className="rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
          >
            <option value="normal">自由搭配</option>
            <option value="business">精简出差（3套以内）</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {isPending ? "生成中..." : "生成推荐"}
        </button>
      </form>

      {result ? (
        <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-4 text-sm">
          {!result.success ? (
            <p className="text-red-300">推荐失败：{result.error}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 text-xs text-muted">
                <span>预筛选装备：{result.prefilteredCount} 件</span>
                {result.data.weather.map((w) => (
                  <span key={w.date}>
                    {w.date} {w.condition} {w.minTemp}℃~{w.maxTemp}℃
                  </span>
                ))}
              </div>

              <p className={result.data.feasible ? "text-emerald-300" : "text-yellow-300"}>
                {result.data.summary}
              </p>

              {result.data.outfits.map((outfit) => (
                <div key={outfit.day} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="mb-2 font-medium text-[#ccc]">
                    {result.luggage === "business" ? `方案 ${outfit.day}` : `第 ${outfit.day} 天`}
                  </p>
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[#888]">上装：</span>
                      <span>{outfit.topLayers.join(" → ")}</span>
                    </div>
                    <div>
                      <span className="text-[#888]">下装：</span>
                      <span>{outfit.bottomLayer}</span>
                    </div>
                    <div>
                      <span className="text-[#888]">鞋履：</span>
                      <span>{outfit.footwear}</span>
                    </div>
                    {outfit.accessories.length > 0 && (
                      <div>
                        <span className="text-[#888]">配件：</span>
                        <span>{outfit.accessories.join("、")}</span>
                      </div>
                    )}
                    {outfit.notes && (
                      <p className="text-xs text-[#666]">{outfit.notes}</p>
                    )}
                  </div>
                </div>
              ))}

              {result.data.notes.length > 0 ? (
                <ul className="list-disc pl-5 text-muted">
                  {result.data.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
