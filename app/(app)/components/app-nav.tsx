"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";

const NAV = [
  { href: "/", label: "首页", icon: "⌂" },
  { href: "/input", label: "录入", icon: "+" },
  { href: "/query", label: "查询", icon: "☰" },
  { href: "/recommend", label: "AI推荐", icon: "◈" },
];

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-white/[0.06] font-medium text-[#2dd4bf]"
          : "text-[#888] hover:bg-white/[0.04] hover:text-[#ccc]"
      }`}
    >
      <span className="flex h-5 w-5 items-center justify-center text-base leading-none">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

export function AppNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-52 flex-col border-r border-white/[0.06] bg-[#1a1a1a]">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="h-6 w-6 rounded bg-[#2dd4bf]" />
        <span className="text-sm font-semibold tracking-tight">LayerLint</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href}
          />
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <div className="mb-2 truncate text-xs text-[#666]">{userEmail}</div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-md border border-white/[0.08] px-3 py-1.5 text-xs text-[#888] hover:border-white/20 hover:text-[#ccc]"
          >
            退出登录
          </button>
        </form>
      </div>
    </aside>
  );
}
