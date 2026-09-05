import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VAPID_PUBLIC_KEY =
  "BO63qb4Hvhsog3bCKpeYCBzn2WeA8FpyB-o9GMyDDzTkMoU2x32gLKbOYSAbqYJ6wV_OW6cRj2T9161tc9Pg3T0";

export const sendPushNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        title: z.string().min(1).max(120),
        body: z.string().max(300).optional(),
        url: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as {
      supabase: any;
      userId: string;
    };
    const privateKey = process.env["VAPID_PRIVATE_KEY"];
    if (!privateKey) throw new Error("Push notifications are not configured");

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (error) throw error;
    if (!subs || subs.length === 0) return { sent: 0 };

    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails("mailto:hello@ventureble.com", VAPID_PUBLIC_KEY, privateKey);

    const payload = JSON.stringify({
      title: data.title,
      body: data.body ?? "",
      url: data.url ?? "/",
    });

    let sent = 0;
    const stale: string[] = [];
    await Promise.all(
      subs.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
          sent += 1;
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) stale.push(sub.endpoint);
        }
      }),
    );

    if (stale.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .in("endpoint", stale);
    }
    return { sent };
  });
