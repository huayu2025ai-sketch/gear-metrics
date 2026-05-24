"use client";

import { useState } from "react";

export function CollapsibleGroup({
  category,
  count,
  children,
}: {
  category: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <tbody className="divide-y divide-white/[0.04] text-[#c9c9c9]">
      <tr className="bg-[#1a1a1a]">
        <td colSpan={8} className="px-4 py-2">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex w-full items-center gap-2 text-left text-xs font-medium text-[#888] uppercase tracking-wider hover:text-[#aaa]"
          >
            <span className="inline-block w-3 text-[10px]">
              {open ? "▼" : "▶"}
            </span>
            <span>
              {category} ({count})
            </span>
          </button>
        </td>
      </tr>
      {open ? children : null}
    </tbody>
  );
}
