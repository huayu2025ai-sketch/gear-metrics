import {
  fetchBrands,
  fetchGears,
  type GearRecord,
} from "@/app/actions/gears";
import { BrandFilter } from "./brand-filter";
import { CollapsibleGroup } from "./collapsible-group";
import { FilterPanel } from "./filter-panel";
import { GearRowClient } from "./gear-row";
import { GEAR_CATEGORIES, GEAR_STATUS } from "@/lib/gear";
import Link from "next/link";

type SearchParams = Promise<{
  category?: string;
  status?: string;
  brand?: string;
  date_from?: string;
  date_to?: string;
  price_min?: string;
  price_max?: string;
  msg?: string;
  type?: "success" | "error";
}>;

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

const CATEGORY_ORDER = [
  "长袖T恤",
  "短袖T恤",
  "棉服/抓绒",
  "羽绒服",
  "软壳/皮肤衣",
  "长裤",
  "短裤",
  "鞋履",
  "背包",
  "其他",
];

export default async function QueryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedCategory = params.category ?? "全部";
  const selectedStatus = params.status ?? "全部";
  const selectedBrand = params.brand ?? "";
  const selectedDateFrom = params.date_from ?? "";
  const selectedDateTo = params.date_to ?? "";
  const selectedPriceMin = params.price_min ?? "";
  const selectedPriceMax = params.price_max ?? "";
  const flashMessage = params.msg;
  const flashType = params.type ?? "success";

  const [result, brandsResult] = await Promise.all([
    fetchGears({
      category: selectedCategory,
      status: selectedStatus,
      brand: selectedBrand,
      date_from: selectedDateFrom,
      date_to: selectedDateTo,
      price_min: selectedPriceMin,
      price_max: selectedPriceMax,
    }),
    fetchBrands(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">查询</h1>

      {flashMessage ? (
        <div
          className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
            flashType === "error"
              ? "border-red-400/30 bg-red-500/10 text-red-300"
              : "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {flashMessage}
        </div>
      ) : null}

      {/* 筛选 */}
      <section className="mb-6 rounded-xl border border-white/[0.06] bg-[#202020] p-4">
        <FilterPanel>
          <form method="get" className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-[#666]">分类</span>
              <select
                name="category"
                defaultValue={selectedCategory}
                className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
              >
                <option value="全部">全部</option>
                <SelectOptions options={GEAR_CATEGORIES} />
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[#666]">状态</span>
              <select
                name="status"
                defaultValue={selectedStatus}
                className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
              >
                <option value="全部">全部</option>
                <SelectOptions options={GEAR_STATUS} />
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[#666]">购入日期</span>
              <div className="flex items-center gap-1.5">
                <input
                  name="date_from"
                  type="date"
                  defaultValue={selectedDateFrom}
                  className="rounded-md border border-white/[0.08] bg-[#191919] px-2 py-2 text-sm text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
                />
                <span className="text-[#444]">~</span>
                <input
                  name="date_to"
                  type="date"
                  defaultValue={selectedDateTo}
                  className="rounded-md border border-white/[0.08] bg-[#191919] px-2 py-2 text-sm text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
                />
              </div>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[#666]">价格范围</span>
              <div className="flex items-center gap-1.5">
                <input
                  name="price_min"
                  type="number"
                  step="0.01"
                  defaultValue={selectedPriceMin}
                  placeholder="最低"
                  className="w-24 rounded-md border border-white/[0.08] bg-[#191919] px-2 py-2 text-right text-sm font-mono text-[#ccc] placeholder:text-[#555] focus:border-[#2dd4bf]/50 focus:outline-none"
                />
                <span className="text-[#444]">~</span>
                <input
                  name="price_max"
                  type="number"
                  step="0.01"
                  defaultValue={selectedPriceMax}
                  placeholder="最高"
                  className="w-24 rounded-md border border-white/[0.08] bg-[#191919] px-2 py-2 text-right text-sm font-mono text-[#ccc] placeholder:text-[#555] focus:border-[#2dd4bf]/50 focus:outline-none"
                />
              </div>
            </label>
            <button
              type="submit"
              className="rounded-md border border-white/[0.08] px-4 py-2 text-sm text-[#aaa] hover:border-white/20 hover:text-[#ccc]"
            >
              应用筛选
            </button>
            {(selectedCategory !== "全部" || selectedStatus !== "全部" || selectedBrand || selectedDateFrom || selectedDateTo || selectedPriceMin || selectedPriceMax) && (
              <Link
                href="/query"
                className="rounded-md border border-white/[0.08] px-4 py-2 text-sm text-[#666] hover:border-white/20 hover:text-[#aaa]"
              >
                清除
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-[#666]">品牌</span>
              <BrandFilter
                brands={brandsResult.success ? brandsResult.data : []}
                defaultValue={selectedBrand}
              />
            </label>
          </div>
        </form>
        </FilterPanel>
      </section>

      {/* 装备列表 */}
      <section className="mb-8 rounded-xl border border-white/[0.06] bg-[#202020] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#888] uppercase tracking-wider">
            装备列表
          </h2>
          <span className="text-xs text-[#555]">
            {result.success ? result.data.length : 0} 件装备
          </span>
        </div>

        {!result.success ? (
          <p className="rounded-md border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">
            数据读取失败：{result.error}
          </p>
        ) : result.data.length === 0 ? (
          <p className="text-sm text-[#555]">
            暂无数据，请先
            <Link href="/input" className="text-[#2dd4bf] hover:underline">
              录入装备
            </Link>
            。
          </p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#252525] text-xs font-medium text-[#888] uppercase tracking-wider">
                <tr className="border-b border-white/[0.06]">
                  <th className="py-2.5 pl-4 pr-3">名称</th>
                  <th className="whitespace-nowrap px-3 py-2.5">品牌</th>
                  <th className="whitespace-nowrap px-3 py-2.5">分类</th>
                  <th className="whitespace-nowrap px-3 py-2.5">颜色</th>
                  <th className="whitespace-nowrap px-3 py-2.5">尺码</th>
                  <th className="whitespace-nowrap px-3 py-2.5">状态</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right">价格</th>
                  <th className="px-3 py-2.5">备注</th>
                  <th className="whitespace-nowrap py-2.5 pr-4 pl-3 text-right">操作</th>
                </tr>
              </thead>
              {(() => {
                const grouped = result.data.reduce<Record<string, GearRecord[]>>((acc, gear) => {
                  acc[gear.category] = acc[gear.category] ?? [];
                  acc[gear.category].push(gear);
                  return acc;
                }, {});
                return CATEGORY_ORDER.map((category) => {
                  const items = grouped[category];
                  if (!items || items.length === 0) return null;
                  return (
                    <CollapsibleGroup key={category} category={category} count={items.length}>
                      {items.map((gear) => (
                        <GearRowClient key={gear.id} gear={gear} />
                      ))}
                    </CollapsibleGroup>
                  );
                });
              })()}
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
