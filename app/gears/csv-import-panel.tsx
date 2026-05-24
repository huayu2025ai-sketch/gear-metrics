"use client";

import { useMemo, useState, useTransition } from "react";
import { importGearsFromCsv, type CsvImportResult, type CsvImportRow } from "@/app/actions/gears";

type RawRow = Record<string, string>;

const REQUIRED_FIELDS = ["name", "brand", "category"] as const;

const FIELD_ALIASES: Record<string, string[]> = {
  name: ["name", "名称", "装备名称", "title"],
  brand: ["brand", "品牌"],
  category: ["category", "分类", "类别"],
  min_temp: ["min_temp", "最低温度", "最低适用温度", "t_min"],
  max_temp: ["max_temp", "最高温度", "最高适用温度", "t_max"],
  status: ["status", "状态", "使用状态"],
  color: ["color", "颜色"],
  size: ["size", "尺码"],
  purchase_price: ["purchase_price", "价格", "购入价格", "purchase price"],
  purchase_date: ["purchase_date", "购入日期", "购买日期", "购入时间", "purchase date"],
  remarks: ["remarks", "备注", "说明"],
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells.map((c) => c.replace(/\r/g, ""));
}

function parseCsvText(text: string): RawRow[] {
  const lines = text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: RawRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const row: RawRow = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function pickValue(row: RawRow, key: keyof typeof FIELD_ALIASES) {
  const aliases = FIELD_ALIASES[key];
  for (const alias of aliases) {
    const normalized = alias.toLowerCase();
    if (normalized in row) return row[normalized] ?? "";
  }
  return "";
}

function mapRow(raw: RawRow): CsvImportRow {
  const minTempValue = pickValue(raw, "min_temp");
  const maxTempValue = pickValue(raw, "max_temp");
  return {
    name: pickValue(raw, "name"),
    brand: pickValue(raw, "brand"),
    category: pickValue(raw, "category"),
    min_temp: minTempValue === "" ? "15" : minTempValue,
    max_temp: maxTempValue === "" ? "25" : maxTempValue,
    status: pickValue(raw, "status") || "在用",
    color: pickValue(raw, "color"),
    size: pickValue(raw, "size"),
    purchase_price: pickValue(raw, "purchase_price"),
    purchase_date: pickValue(raw, "purchase_date"),
    remarks: pickValue(raw, "remarks"),
  };
}

function validateRequired(rows: CsvImportRow[]) {
  const missing: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    const hasAny = rows.some((row) => String(row[field] ?? "").trim().length > 0);
    if (!hasAny) missing.push(field);
  }
  return missing;
}

export function CsvImportPanel() {
  const [rows, setRows] = useState<CsvImportRow[]>([]);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const requiredMissing = useMemo(() => validateRequired(rows), [rows]);

  async function onFileSelected(file: File) {
    try {
      const text = await file.text();
      const parsed = parseCsvText(text);
      const mapped = parsed.map(mapRow);
      setRows(mapped);
      setResult(null);
      setParseError(mapped.length === 0 ? "CSV 内容为空或缺少数据行" : null);
    } catch {
      setParseError("CSV 解析失败，请检查文件编码和格式");
      setRows([]);
    }
  }

  function onImport() {
    startTransition(async () => {
      const res = await importGearsFromCsv(rows);
      setResult(res);
    });
  }

  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-panel p-5">
      <h2 className="mb-4 text-lg font-medium">CSV 导入（Notion 映射）</h2>
      <p className="mb-3 text-sm text-muted">
        支持字段别名：`name/名称/装备名称`、`brand/品牌`、`category/分类`、`min_temp`、`max_temp` 等。
      </p>
      <p className="mb-3 text-xs text-muted">温标列可省略；缺失时系统默认 `min_temp=15`、`max_temp=25`。</p>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFileSelected(file);
        }}
        className="mb-3 block w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
      />

      {parseError ? <p className="mb-3 text-sm text-red-300">{parseError}</p> : null}

      {rows.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">导入预览：共 {rows.length} 行（显示前 5 行）</p>
          {requiredMissing.length > 0 ? (
            <p className="text-sm text-red-300">
              缺少必填字段映射：{requiredMissing.join(", ")}。请检查 CSV 表头。
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-md border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-black/20 text-left">
                <tr>
                  <th className="px-3 py-2">名称</th>
                  <th className="px-3 py-2">品牌</th>
                  <th className="px-3 py-2">分类</th>
                  <th className="px-3 py-2">温标</th>
                  <th className="px-3 py-2">状态</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, idx) => (
                  <tr key={`${row.name}-${idx}`} className="border-t border-white/10">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.brand}</td>
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2">
                      {row.min_temp}℃ ~ {row.max_temp}℃
                    </td>
                    <td className="px-3 py-2">{row.status || "在用"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={onImport}
            disabled={isPending || requiredMissing.length > 0}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "导入中..." : "确认导入"}
          </button>
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-2 rounded-md border border-white/10 bg-black/20 p-3">
          <p className={`text-sm ${result.success ? "text-emerald-300" : "text-yellow-300"}`}>{result.message}</p>
          {result.errors.length > 0 ? (
            <ul className="space-y-1 text-xs text-red-300">
              {result.errors.slice(0, 20).map((err) => (
                <li key={`${err.row}-${err.reason}`}>
                  第 {err.row} 行：{err.reason}
                </li>
              ))}
              {result.errors.length > 20 ? <li>... 其余 {result.errors.length - 20} 条已省略</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
