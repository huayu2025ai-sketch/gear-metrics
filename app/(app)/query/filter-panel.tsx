"use client";

import { useState } from "react";

export function FilterPanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mb-3 flex items-center gap-2 text-sm font-medium text-[#888] uppercase tracking-wider hover:text-[#aaa]"
      >
        <span className="inline-block w-3 text-[10px]">{open ? "▼" : "▶"}</span>
        <span>筛选</span>
      </button>
      {open ? <div className="space-y-3">{children}</div> : null}
    </div>
  );
}
