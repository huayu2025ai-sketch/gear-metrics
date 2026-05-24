import { createGear } from "@/app/actions/gears";
import { CsvImportPanel } from "@/app/gears/csv-import-panel";
import { GEAR_CATEGORIES, GEAR_STATUS } from "@/lib/gear";
import { redirect } from "next/navigation";

type SearchParams = Promise<{
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

export default async function InputPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  async function createGearAction(formData: FormData) {
    "use server";
    const result = await createGear(formData);
    const query = new URLSearchParams({
      msg: result.success ? result.message ?? "保存成功" : result.error,
      type: result.success ? "success" : "error",
    });
    redirect(`/input?${query.toString()}`);
  }

  const params = await searchParams;
  const flashMessage = params.msg;
  const flashType = params.type ?? "success";

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">录入</h1>

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

      <section className="mb-8 rounded-xl border border-white/[0.06] bg-[#202020] p-5">
        <h2 className="mb-4 text-sm font-medium text-[#888] uppercase tracking-wider">
          快速录入
        </h2>
        <form
          action={createGearAction}
          className="grid grid-cols-1 gap-3 md:grid-cols-4"
        >
          <input
            name="name"
            placeholder="装备名称 *"
            required
            className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] placeholder:text-[#555] focus:border-[#2dd4bf]/50 focus:outline-none"
          />
          <input
            name="brand"
            placeholder="品牌 *"
            required
            className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] placeholder:text-[#555] focus:border-[#2dd4bf]/50 focus:outline-none"
          />
          <select
            name="category"
            defaultValue="其他"
            className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
          >
            <SelectOptions options={GEAR_CATEGORIES} />
          </select>
          <select
            name="status"
            defaultValue="在用"
            className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
          >
            <SelectOptions options={GEAR_STATUS} />
          </select>

          <div className="flex items-center gap-2 md:col-span-2">
            <span className="text-xs text-[#666]">温标</span>
            <input
              name="min_temp"
              type="number"
              defaultValue={15}
              className="w-20 rounded-md border border-white/[0.08] bg-[#191919] px-2 py-2 text-right text-sm font-mono text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
            />
            <span className="text-[#444]">~</span>
            <input
              name="max_temp"
              type="number"
              defaultValue={25}
              className="w-20 rounded-md border border-white/[0.08] bg-[#191919] px-2 py-2 text-right text-sm font-mono text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
            />
            <span className="text-xs text-[#555]">℃</span>
          </div>

          <input
            name="purchase_price"
            type="number"
            step="0.01"
            placeholder="价格"
            className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] placeholder:text-[#555] focus:border-[#2dd4bf]/50 focus:outline-none"
          />

          <input
            name="color"
            placeholder="颜色"
            className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] placeholder:text-[#555] focus:border-[#2dd4bf]/50 focus:outline-none"
          />
          <input
            name="size"
            placeholder="尺码"
            className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] placeholder:text-[#555] focus:border-[#2dd4bf]/50 focus:outline-none"
          />
          <select
            name="fit_type"
            defaultValue="标准"
            className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
          >
            <option value="紧身">紧身</option>
            <option value="标准">标准</option>
            <option value="宽松">宽松</option>
          </select>
          <input
            name="purchase_date"
            type="date"
            className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#ccc] focus:border-[#2dd4bf]/50 focus:outline-none"
          />

          <input
            name="remarks"
            placeholder="备注"
            className="rounded-md border border-white/[0.08] bg-[#191919] px-3 py-2 text-sm text-[#e6e7ea] placeholder:text-[#555] focus:border-[#2dd4bf]/50 focus:outline-none md:col-span-3"
          />

          <button
            type="submit"
            className="rounded-md bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-black hover:bg-[#2dd4bf]/90"
          >
            保存装备
          </button>
        </form>
      </section>

      <CsvImportPanel />
    </div>
  );
}
