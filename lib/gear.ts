export const GEAR_CATEGORIES = [
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
] as const;

export const GEAR_STATUS = ["在用", "在途", "闲置", "损耗"] as const;

export type GearCategory = (typeof GEAR_CATEGORIES)[number];
export type GearStatus = (typeof GEAR_STATUS)[number];
