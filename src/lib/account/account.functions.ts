import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AccountProfile = {
  email: string;
  fullName: string;
  createdAt: string | null;
  providers: string[];
};

export type BusinessProfile = {
  id: string | null;
  name: string;
  country: string;
  industry: string;
  years_in_operation: number | null;
  annual_revenue: number | null;
  currency: string;
};

export const getAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: company }, { data: acceptances }, { data: devices }] =
      await Promise.all([
        context.supabase.from("profiles").select("email, full_name, created_at").eq("id", context.userId).maybeSingle(),
        context.supabase
          .from("companies")
          .select("id, name, country, industry, years_in_operation, annual_revenue, currency")
          .eq("user_id", context.userId)
          .eq("is_demo", false)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        context.supabase
          .from("legal_acceptances")
          .select("document_key, version, accepted_at")
          .order("accepted_at", { ascending: false }),
        context.supabase
          .from("push_subscriptions")
          .select("id, device_label, created_at")
          .order("created_at", { ascending: false }),
      ]);

    const claims = context.claims as Record<string, unknown>;
    const amr = Array.isArray(claims?.["amr"]) ? (claims["amr"] as { method?: string }[]) : [];

    return {
      profile: {
        email: (profile?.email as string) ?? "",
        fullName: (profile?.full_name as string) ?? "",
        createdAt: (profile?.created_at as string) ?? null,
        providers: amr.map((a) => a.method ?? "").filter(Boolean),
      } satisfies AccountProfile,
      company: (company ?? null) as BusinessProfile | null,
      acceptances: acceptances ?? [],
      devices: devices ?? [],
    };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ fullName: z.string().max(120).default("") }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.fullName.trim() || null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveBusinessProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable().default(null),
        name: z.string().min(1).max(160),
        country: z.string().max(80).default("Trinidad and Tobago"),
        industry: z.string().max(120).default(""),
        years_in_operation: z.number().finite().nonnegative().nullable().default(null),
        annual_revenue: z.number().finite().nonnegative().nullable().default(null),
        currency: z.string().min(3).max(4).default("TTD"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const row = {
      user_id: context.userId,
      name: data.name.trim(),
      country: data.country.trim() || "Trinidad and Tobago",
      industry: data.industry.trim() || null,
      years_in_operation: data.years_in_operation,
      annual_revenue: data.annual_revenue,
      currency: data.currency.toUpperCase(),
      is_demo: false,
    };

    if (data.id) {
      const { error } = await context.supabase.from("companies").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await context.supabase
      .from("companies")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const removeDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Permanently removes the account and everything attached to it. */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ confirm: z.literal("DELETE") }).parse(data),
  )
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: docs } = await supabaseAdmin
      .from("documents")
      .select("storage_path")
      .eq("user_id", context.userId);
    const paths = (docs ?? []).map((d) => d.storage_path).filter(Boolean) as string[];
    if (paths.length) await supabaseAdmin.storage.from("documents").remove(paths);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
