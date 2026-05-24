"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  deleteGear,
  updateGear,
  type GearRecord,
} from "@/app/actions/gears";
import { GEAR_CATEGORIES, GEAR_STATUS } from "@/lib/gear";

function SelectOptions({
  options,
  value,
}: {
  options: readonly string[];
  value?: string;
}) {
  return (
    <>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
      {value && !options.includes(value) ? (
        <option value={value}>{value}</option>
      ) : null}
    </>
  );
}

const CATEGORY_TINT: Record<string, string> = {
  长袖T恤: "bg-sky-400/10 text-sky-300 border-sky-400/20",
  短袖T恤: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20",
  "棉服/抓绒": "bg-orange-400/10 text-orange-300 border-orange-400/20",
  羽绒服: "bg-stone-400/10 text-stone-300 border-stone-400/20",
  "软壳/皮肤衣": "bg-amber-400/10 text-amber-300 border-amber-400/20",
  长裤: "bg-slate-400/10 text-slate-300 border-slate-400/20",
  短裤: "bg-zinc-400/10 text-zinc-300 border-zinc-400/20",
  鞋履: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  背包: "bg-teal-400/10 text-teal-300 border-teal-400/20",
  其他: "bg-neutral-400/10 text-neutral-300 border-neutral-400/20",
};

const STATUS_TINT: Record<string, string> = {
  在用: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  在途: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  闲置: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  损耗: "bg-red-500/10 text-red-400 border-red-500/20",
};

function Tag({ label, tint }: { label: string; tint: string }) {
  return (
    <span
      className={`inline-block rounded border text-[11px] font-medium tracking-tight px-1.5 py-0.5 ${tint}`}
    >
      {label}
    </span>
  );
}

function ColorTag({ color }: { color: string }) {
  const tint = getColorTint(color);
  return (
    <span
      className={`inline-block rounded border text-[11px] font-medium tracking-tight px-1.5 py-0.5 ${tint}`}
    >
      {color}
    </span>
  );
}

function getColorTint(color: string): string {
  const map: Record<string, string> = {
    黑: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
    白: "bg-slate-300/10 text-slate-300 border-slate-300/20",
    红: "bg-red-500/10 text-red-400 border-red-500/20",
    橙: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    黄: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    绿: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    蓝: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    紫: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    粉: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    灰: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    棕: "bg-amber-700/10 text-amber-600 border-amber-700/20",
    驼: "bg-amber-700/10 text-amber-600 border-amber-700/20",
    卡其: "bg-yellow-700/10 text-yellow-600 border-yellow-700/20",
    藏: "bg-indigo-700/10 text-indigo-400 border-indigo-700/20",
    军绿: "bg-emerald-700/10 text-emerald-500 border-emerald-700/20",
    墨绿: "bg-emerald-700/10 text-emerald-500 border-emerald-700/20",
  };

  for (const [key, tint] of Object.entries(map)) {
    if (color.includes(key)) return tint;
  }

  return "bg-white/[0.03] text-[#999] border-white/[0.06]";
}

export function GearRowClient({ gear }: { gear: GearRecord }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      <tr className="group transition-colors hover:bg-white/[0.03]">
        <td className="py-2 pl-4 pr-3 font-medium text-[#e6e7ea]">
          {gear.name}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-[#a0a0a0]">{gear.brand}</td>
        <td className="whitespace-nowrap px-3 py-2">
          <Tag
            label={gear.category}
            tint={CATEGORY_TINT[gear.category] ?? "bg-white/[0.03] text-[#999] border-white/[0.06]"}
          />
        </td>
        <td className="whitespace-nowrap px-3 py-2">
          {gear.color ? (
            <ColorTag color={gear.color} />
          ) : (
            <span className="text-[#555]">—</span>
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-[#aaa]">{gear.size || "—"}</td>
        <td className="whitespace-nowrap px-3 py-2">
          <Tag
            label={gear.status}
            tint={STATUS_TINT[gear.status] ?? "bg-white/[0.03] text-[#999] border-white/[0.06]"}
          />
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-[#aaa]">
          {gear.purchase_price != null ? `¥${gear.purchase_price}` : "—"}
        </td>
        <td className="px-3 py-2">
          <span
            className="block max-w-[140px] truncate text-xs text-[#666]"
            title={gear.remarks ?? ""}
          >
            {gear.remarks || "—"}
          </span>
        </td>
        <td className="py-2 pr-4 pl-3 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded p-1.5 text-[#888] hover:bg-white/[0.06] hover:text-[#ccc]"
              title="编辑"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="rounded p-1.5 text-[#888] hover:bg-red-500/10 hover:text-red-400"
              title="删除"
            >
              ✕
            </button>
          </div>
        </td>
      </tr>
      {mounted && showDelete &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDelete(false)}
            />
            <div className="relative z-10 w-full max-w-sm rounded-xl border border-white/[0.08] bg-[#202020] p-6 shadow-2xl">
              <h3 className="mb-2 text-base font-medium text-red-400">
                确认删除
              </h3>
              <p className="mb-6 text-sm text-[#aaa]">
                确定要删除「{gear.name}」吗？此操作不可撤销。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDelete(false)}
                  className="rounded-md border border-white/[0.08] px-4 py-2 text-sm text-[#888] hover:border-white/20 hover:text-[#ccc]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const formData = new FormData();
                    formData.append("id", gear.id);
                    const result = await deleteGear(formData);
                    const query = new URLSearchParams({
                      msg: result.success ? result.message ?? "删除成功" : result.error,
                      type: result.success ? "success" : "error",
                    });
                    setShowDelete(false);
                    router.push(`/query?${query.toString()}`);
                  }}
                  className="rounded-md bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      {editing && (
        <tr className="border-b border-white/[0.04]">
          <td colSpan={9} className="p-0">
            <div className="px-4 pb-4 pt-2">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const result = await updateGear(formData);
                  const query = new URLSearchParams({
                    msg: result.success ? result.message ?? "更新成功" : result.error,
                    type: result.success ? "success" : "error",
                  });
                  setEditing(false);
                  router.push(`/query?${query.toString()}`);
                }}
                className="grid grid-cols-1 gap-2 md:grid-cols-4"
              >
                <input type="hidden" name="id" value={gear.id} />
                <input
                  name="name"
                  defaultValue={gear.name}
                  required
                  className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] focus:border-[#2dd4bf]/50 focus:outline-none"
                />
                <input
                  name="brand"
                  defaultValue={gear.brand}
                  required
                  className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] focus:border-[#2dd4bf]/50 focus:outline-none"
                />
                <select
                  name="category"
                  defaultValue={gear.category}
                  className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
                >
                  <SelectOptions
                    options={GEAR_CATEGORIES}
                    value={gear.category}
                  />
                </select>
                <select
                  name="status"
                  defaultValue={gear.status}
                  className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
                >
                  <SelectOptions options={GEAR_STATUS} value={gear.status} />
                </select>

                <div className="flex items-center gap-2 md:col-span-2">
                  <span className="text-xs text-[#666]">温标</span>
                  <input
                    name="min_temp"
                    type="number"
                    defaultValue={gear.min_temp}
                    className="w-20 rounded-md border border-white/[0.08] bg-[#191919] px-2 py-2 text-right text-sm font-mono text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
                  />
                  <span className="text-[#444]">~</span>
                  <input
                    name="max_temp"
                    type="number"
                    defaultValue={gear.max_temp}
                    className="w-20 rounded-md border border-white/[0.08] bg-[#191919] px-2 py-2 text-right text-sm font-mono text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
                  />
                  <span className="text-xs text-[#555]">℃</span>
                </div>

                <input
                  name="purchase_price"
                  type="number"
                  step="0.01"
                  defaultValue={gear.purchase_price ?? ""}
                  placeholder="价格"
                  className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] focus:border-[#2dd4bf]/50 focus:outline-none"
                />

                <input
                  name="color"
                  defaultValue={gear.color ?? ""}
                  placeholder="颜色"
                  className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] focus:border-[#2dd4bf]/50 focus:outline-none"
                />
                <input
                  name="size"
                  defaultValue={gear.size ?? ""}
                  placeholder="尺码"
                  className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] focus:border-[#2dd4bf]/50 focus:outline-none"
                />
                <select
                  name="fit_type"
                  defaultValue={gear.fit_type ?? "标准"}
                  className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
                >
                  <option value="紧身">紧身</option>
                  <option value="标准">标准</option>
                  <option value="宽松">宽松</option>
                </select>
                <input
                  name="purchase_date"
                  type="date"
                  defaultValue={gear.purchase_date ?? ""}
                  className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
                />

                <input
                  name="remarks"
                  defaultValue={gear.remarks ?? ""}
                  placeholder="备注"
                  className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] focus:border-[#2dd4bf]/50 focus:outline-none md:col-span-3"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="rounded-md bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-black hover:bg-[#2dd4bf]/90"
                  >
                    保存修改
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-md border border-white/[0.08] px-4 py-2 text-sm text-[#888] hover:border-white/20 hover:text-[#ccc]"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
