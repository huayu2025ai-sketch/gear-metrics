"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const profileSchema = z.object({
  height_cm: z.coerce.number().min(100, "身高范围不合法").max(230, "身高范围不合法"),
  weight_kg: z.coerce.number().min(30, "体重范围不合法").max(250, "体重范围不合法"),
  age: z.coerce.number().int().min(1, "年龄范围不合法").max(120, "年龄范围不合法"),
});

export type UserProfile = {
  height_cm: number;
  weight_kg: number;
  age: number;
};

export async function fetchUserProfile() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false as const, error: "请先登录后再操作", data: null };
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("height_cm,weight_kg,age")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { success: false as const, error: error.message, data: null };
  }

  return { success: true as const, data: (data as UserProfile | null) ?? null };
}

export async function upsertUserProfile(formData: FormData) {
  const parsed = profileSchema.safeParse({
    height_cm: formData.get("height_cm"),
    weight_kg: formData.get("weight_kg"),
    age: formData.get("age"),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "输入参数不合法" };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false as const, error: "请先登录后再操作" };
  }

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      ...parsed.data,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { success: false as const, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true as const, message: "用户画像已保存" };
}
