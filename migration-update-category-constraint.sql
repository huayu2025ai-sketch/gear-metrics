-- 1. 把旧分类数据迁移到功能最接近的分类（软壳/皮肤衣）
UPDATE public.outdoor_gears
SET category = '软壳/皮肤衣'
WHERE category = '硬壳/雨衣';

-- 2. 删除旧的 CHECK 约束
ALTER TABLE public.outdoor_gears
DROP CONSTRAINT IF EXISTS outdoor_gears_category_check;

-- 3. 添加新的 CHECK 约束（与代码中的 GEAR_CATEGORIES 一致）
ALTER TABLE public.outdoor_gears
ADD CONSTRAINT outdoor_gears_category_check
CHECK (category IN (
  '长袖T恤',
  '短袖T恤',
  '棉服/抓绒',
  '羽绒服',
  '短款',
  '软壳/皮肤衣',
  '裤装',
  '鞋履',
  '背包',
  '安全装备',
  '其他'
));
