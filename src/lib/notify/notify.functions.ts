import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string | null;
  request_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationPrefs = { in_app: boolean; push: boolean; email: boolean };

export const listNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().int().min(1).max(100).default(30) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("notifications")
      .select("id, kind, title, body, url, request_id, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    const items = (rows ?? []) as NotificationRow[];
    return { items, unread: items.filter((n) => !n.read_at).length };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).max(200).default([]), all: z.boolean().default(false) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (!data.all) {
      if (data.ids.length === 0) return { ok: true };
      query = query.in("id", data.ids);
    }
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid().nullable().default(null) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const query = context.supabase.from("notifications").delete();
    const { error } = data.id
      ? await query.eq("id", data.id)
      : await query.not("read_at", "is", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notification_preferences")
      .select("in_app, push, email")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      in_app: data?.in_app ?? true,
      push: data?.push ?? true,
      email: data?.email ?? true,
    } satisfies NotificationPrefs;
  });

export const saveNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ in_app: z.boolean(), push: z.boolean(), email: z.boolean() })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notification_preferences").upsert(
      {
        user_id: context.userId,
        in_app: data.in_app,
        push: data.push,
        email: data.email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return data satisfies NotificationPrefs;
  });

/** Sends the signed-in person a sample alert on every channel they have on. */
export const sendTestNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ title: z.string().min(1).max(120), body: z.string().max(300).default("") }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { notifyUser } = await import("@/lib/notify/notify.server");
    return notifyUser({
      userId: context.userId,
      kind: "test",
      title: data.title,
      body: data.body,
      url: "/notifications",
    });
  });
