import { fetchGears } from "@/app/actions/gears";
import Link from "next/link";

export default async function DashboardPage() {
  const result = await fetchGears();
  const gears = result.success ? result.data : [];

  const total = gears.length;
  const inUse = gears.filter((g) => g.status === "在用").length;
  const inTransit = gears.filter((g) => g.status === "在途").length;
  const idle = gears.filter((g) => g.status === "闲置").length;
  const worn = gears.filter((g) => g.status === "损耗").length;
  const totalValue = gears.reduce((sum, g) => sum + (g.purchase_price ?? 0), 0);

  const categoryCounts = gears.reduce<Record<string, number>>((acc, g) => {
    acc[g.category] = (acc[g.category] ?? 0) + 1;
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1]
  );

  const tempRanges = [
    { label: "≤ -10℃", min: -100, max: -10 },
    { label: "-10℃ ~ 0℃", min: -10, max: 0 },
    { label: "0℃ ~ 10℃", min: 0, max: 10 },
    { label: "10℃ ~ 20℃", min: 10, max: 20 },
    { label: "> 20℃", min: 20, max: 100 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">首页</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="装备总数" value={String(total)} />
        <StatCard label="在用装备" value={String(inUse)} />
        <StatCard label="闲置装备" value={String(idle)} />
        <StatCard label="资产总值" value={`¥${totalValue.toFixed(0)}`} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <section className="rounded-xl border border-white/[0.06] bg-[#202020] p-4">
          <h2 className="mb-3 text-sm font-medium text-[#888] uppercase tracking-wider">
            分类分布
          </h2>
          <div className="space-y-2">
            {sortedCategories.map(([cat, count]) => (
              <div
                key={cat}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-[#aaa]">{cat}</span>
                <span className="font-mono text-[#666]">{count}</span>
              </div>
            ))}
            {sortedCategories.length === 0 && (
              <p className="text-sm text-[#555]">暂无数据</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.06] bg-[#202020] p-4">
          <h2 className="mb-3 text-sm font-medium text-[#888] uppercase tracking-wider">
            状态分布
          </h2>
          <div className="space-y-2">
            <StatusRow label="在用" count={inUse} total={total} color="bg-emerald-400" />
            <StatusRow label="在途" count={inTransit} total={total} color="bg-amber-400" />
            <StatusRow label="闲置" count={idle} total={total} color="bg-slate-400" />
            <StatusRow label="损耗" count={worn} total={total} color="bg-red-400" />
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.06] bg-[#202020] p-4">
          <h2 className="mb-3 text-sm font-medium text-[#888] uppercase tracking-wider">
            温标分布（按最低温）
          </h2>
          <div className="space-y-2">
            {tempRanges.map((range) => {
              const count = gears.filter(
                (g) => g.min_temp >= range.min && g.min_temp < range.max
              ).length;
              return (
                <div key={range.label} className="flex items-center gap-3 text-sm">
                  <span className="w-20 text-[#aaa]">{range.label}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                    <div
                      className="h-1.5 rounded-full bg-[#2dd4bf]"
                      style={{
                        width: `${total > 0 ? Math.round((count / total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-xs text-[#666]">
                    {count}
                  </span>
                </div>
              );
            })}
            {total === 0 && <p className="text-sm text-[#555]">暂无数据</p>}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-white/[0.06] bg-[#202020] p-4">
        <h2 className="mb-4 text-sm font-medium text-[#888] uppercase tracking-wider">
          快速入口
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/input"
            className="rounded-lg bg-[#2dd4bf] px-5 py-2.5 text-sm font-medium text-black hover:bg-[#2dd4bf]/90"
          >
            + 录入新装备
          </Link>
          <Link
            href="/query"
            className="rounded-lg border border-white/[0.08] px-5 py-2.5 text-sm text-[#aaa] hover:border-white/20 hover:text-[#ccc]"
          >
            查询装备库
          </Link>
          <Link
            href="/recommend"
            className="rounded-lg border border-white/[0.08] px-5 py-2.5 text-sm text-[#aaa] hover:border-white/20 hover:text-[#ccc]"
          >
            AI 推荐
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#202020] p-4">
      <div className="mb-1 text-xs text-[#666]">{label}</div>
      <div className="text-xl font-semibold font-mono text-[#e6e7ea]">
        {value}
      </div>
    </div>
  );
}

function StatusRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-10 text-[#aaa]">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-white/[0.04]">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right font-mono text-xs text-[#666]">{count}</span>
    </div>
  );
}
