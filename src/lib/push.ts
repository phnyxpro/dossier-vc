import { supabase } from "@/integrations/supabase/client";

// Publishable VAPID public key — safe to ship in the client bundle.
export const VAPID_PUBLIC_KEY =
  "BO63qb4Hvhsog3bCKpeYCBzn2WeA8FpyB-o9GMyDDzTkMoU2x32gLKbOYSAbqYJ6wV_OW6cRj2T9161tc9Pg3T0";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getPushRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/push-sw.js");
  if (existing) return existing;
  return navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
}

export async function getPushState(): Promise<"on" | "off" | "unsupported" | "denied"> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub ? "on" : "off";
}

export async function subscribeToPush(): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted");
  const reg = await getPushRegistration();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });
  const json = sub.toJSON();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to enable notifications");
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: json.keys?.["p256dh"] ?? "",
      auth: json.keys?.["auth"] ?? "",
      device_label: navigator.userAgent.slice(0, 120),
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) throw error;
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
}
