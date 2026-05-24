"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = getSupabaseBrowserClient();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage("注册成功，请使用同账号登录。");
        setMode("login");
      }
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.replace("/gears");
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-2xl border border-white/10 bg-panel p-6">
      <h1 className="text-2xl font-semibold">{mode === "login" ? "登录" : "注册"}</h1>
      <p className="mt-1 text-sm text-muted">登录后可保存并管理个人装备数据</p>

      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱"
          className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码（至少 6 位）"
          className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
        </button>
      </form>

      {message ? <p className="mt-3 text-sm text-yellow-300">{message}</p> : null}

      <button
        type="button"
        className="mt-4 text-sm text-muted underline"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setMessage(null);
        }}
      >
        {mode === "login" ? "没有账号？去注册" : "已有账号？去登录"}
      </button>
    </div>
  );
}
