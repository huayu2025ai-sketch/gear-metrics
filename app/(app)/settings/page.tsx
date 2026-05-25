import { fetchUserProfile, upsertUserProfile } from "@/app/actions/profile";
import { redirect } from "next/navigation";

type SearchParams = Promise<{
  msg?: string;
  type?: "success" | "error";
}>;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  async function upsertUserProfileAction(formData: FormData) {
    "use server";
    const result = await upsertUserProfile(formData);
    const next = String(formData.get("next") ?? "settings");
    if (result.success && next === "recommend") {
      redirect("/recommend?msg=" + encodeURIComponent("用户画像已保存，可继续审计"));
    }
    const query = new URLSearchParams({
      msg: result.success ? result.message : result.error,
      type: result.success ? "success" : "error",
    });
    redirect(`/settings?${query.toString()}`);
  }

  const [profileResult, params] = await Promise.all([fetchUserProfile(), searchParams]);
  const profile = profileResult.success ? profileResult.data : null;
  const flashMessage = params.msg;
  const flashType = params.type ?? "success";

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">系统设置</h1>

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

      <section className="rounded-xl border border-white/[0.06] bg-[#202020] p-5">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-[#888]">用户画像</h2>
        <p className="mb-4 text-sm text-[#888]">用于 AI 新购审计的“适合性审查”维度。</p>

        <form action={upsertUserProfileAction} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-[#666]">身高（cm）</span>
            <input
              name="height_cm"
              type="number"
              step="1"
              required
              defaultValue={profile?.height_cm ?? ""}
              className="w-full rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] focus:border-[#2dd4bf]/50 focus:outline-none"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[#666]">体重（kg）</span>
            <input
              name="weight_kg"
              type="number"
              step="0.1"
              required
              defaultValue={profile?.weight_kg ?? ""}
              className="w-full rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] focus:border-[#2dd4bf]/50 focus:outline-none"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[#666]">年龄</span>
            <input
              name="age"
              type="number"
              step="1"
              required
              defaultValue={profile?.age ?? ""}
              className="w-full rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] focus:border-[#2dd4bf]/50 focus:outline-none"
            />
          </label>

          <div className="flex flex-wrap gap-2 md:col-span-3">
            <button
              type="submit"
              name="next"
              value="settings"
              className="rounded-md bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-black hover:bg-[#2dd4bf]/90"
            >
              保存画像
            </button>
            <button
              type="submit"
              name="next"
              value="recommend"
              className="rounded-md border border-white/[0.12] px-4 py-2 text-sm text-[#ccc] hover:border-white/30"
            >
              保存并去 AI 推荐
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
