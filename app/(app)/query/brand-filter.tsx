"use client";

import { useState } from "react";

export function BrandFilter({
  brands,
  defaultValue,
}: {
  brands: string[];
  defaultValue: string;
}) {
  const [selected, setSelected] = useState<string[]>(
    defaultValue ? defaultValue.split(",").filter(Boolean) : []
  );

  function toggle(brand: string) {
    setSelected((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  }

  if (brands.length === 0) {
    return <p className="text-xs text-[#555]">暂无品牌数据</p>;
  }

  return (
    <div>
      <input type="hidden" name="brand" value={selected.join(",")} />
      <div className="flex max-w-md flex-wrap gap-1.5">
        {brands.map((brand) => {
          const active = selected.includes(brand);
          return (
            <button
              key={brand}
              type="button"
              onClick={() => toggle(brand)}
              className={`rounded border px-2 py-1 text-xs transition-colors ${
                active
                  ? "border-[#2dd4bf]/40 bg-[#2dd4bf]/10 text-[#2dd4bf]"
                  : "border-white/[0.06] bg-white/[0.02] text-[#666] hover:border-white/10 hover:text-[#999]"
              }`}
            >
              {brand}
            </button>
          );
        })}
      </div>
    </div>
  );
}
