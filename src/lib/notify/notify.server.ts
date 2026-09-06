/**
 * Server-only notification delivery.
 *
 * One call fans a single event out to every channel the person has switched on:
 * the in-app notification centre, a web push message on their devices, and
 * (once a sending domain is configured) an email.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const NOTIFY_KINDS = [
  "dossier_opened",
  "review_submitted",
  "document_flagged",
  "figure_added",
  "extraction_done",
  "extraction_failed",
  "dossier_ready",
  "share_created",
  "test",
] as const;

export type NotifyKind = (typeof NOTIFY_KINDS)[number];

const VAPID_PUBLIC_KEY =
  "BO63qb4Hvhsog3bCKpeYCBzn2WeA8FpyB-o9GMyDDzTkMoU2x32gLKbOYSAbqYJ6wV_OW6cRj2T9161tc9Pg3T0";

export type NotifyInput = {
  userId: string;
  kind: NotifyKind;
  title: string;
  body?: string;
  url?: string;
  requestId?: string | null;
};

type Prefs = { in_app: boolean; push: boolean; email: boolean };

async function preferences(userId: string): Promise<Prefs> {
  const { data } = await supabaseAdmin
    .from("notification_preferences")
    .select("in_app, push, email")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    in_app: data?.in_app ?? true,
    push: data?.push ?? true,
    email: data?.email ?? true,
  };
}

/** Sends a push message to every device the person has registered. */
export async function pushToUser(
  userId: string,
  payload: { title: string; body: string; url: string },
): Promise<number> {
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!privateKey) return 0;

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs || subs.length === 0) return 0;

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails("mailto:hello@ventureble.com", VAPID_PUBLIC_KEY, privateKey);
  const json = JSON.stringify(payload);

  let sent = 0;
  const stale: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          json,
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) stale.push(sub.endpoint);
      }
    }),
  );

  if (stale.length > 0) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .in("endpoint", stale);
  }
  return sent;
}

/**
 * Email delivery is switched on once the project has a verified sending domain.
 * Until then this is a no-op so the other channels still work.
 */
async function emailToUser(
  _userId: string,
  _payload: { title: string; body: string; url: string },
): Promise<boolean> {
  return false;
}

export async function notifyUser(input: NotifyInput): Promise<{ inApp: boolean; push: number; email: boolean }> {
  const prefs = await preferences(input.userId);
  const body = input.body ?? "";
  const url = input.url ?? "/notifications";
  const result = { inApp: false, push: 0, email: false };

  if (prefs.in_app) {
    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: input.userId,
      kind: input.kind,
      title: input.title,
      body,
      url,
      request_id: input.requestId ?? null,
    });
    if (error) console.error("notification insert failed", error.message);
    else result.inApp = true;
  }

  if (prefs.push) {
    try {
      result.push = await pushToUser(input.userId, { title: input.title, body, url });
    } catch (err) {
      console.error("push delivery failed", err instanceof Error ? err.message : err);
    }
  }

  if (prefs.email) {
    try {
      result.email = await emailToUser(input.userId, { title: input.title, body, url });
    } catch (err) {
      console.error("email delivery failed", err instanceof Error ? err.message : err);
    }
  }

  return result;
}

/** Never let a notification failure break the action that triggered it. */
export async function notifySafe(input: NotifyInput): Promise<void> {
  try {
    await notifyUser(input);
  } catch (err) {
    console.error("notifyUser failed", err instanceof Error ? err.message : err);
  }
}
