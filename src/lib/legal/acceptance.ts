import { supabase } from "@/integrations/supabase/client";
import { CONSENT_VERSION } from "@/lib/legal/content";

const QUEUE_KEY = "dossier_pending_consent";

export const CONSENT_KEYS = ["terms", "privacy", "ai-notice", "upload-authority"] as const;

/** Remember what the person ticked at sign-up until a session exists to record it against. */
export function queueAcceptance() {
  try {
    window.localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify({ version: CONSENT_VERSION, keys: CONSENT_KEYS, at: new Date().toISOString() }),
    );
  } catch {
    /* storage unavailable — consent is still enforced by the form */
  }
}

/** Write any queued consent rows for the signed-in user, then clear the queue. */
export async function flushAcceptances(userId: string) {
  let queued: { version: string; keys: readonly string[] } | null = null;
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    queued = JSON.parse(raw) as { version: string; keys: readonly string[] };
  } catch {
    return;
  }
  if (!queued?.keys?.length) return;

  const rows = queued.keys.map((key) => ({
    user_id: userId,
    document_key: key,
    version: queued.version ?? CONSENT_VERSION,
  }));

  const { error } = await supabase
    .from("legal_acceptances")
    .upsert(rows, { onConflict: "user_id,document_key,version", ignoreDuplicates: true });

  if (!error) {
    try {
      window.localStorage.removeItem(QUEUE_KEY);
    } catch {
      /* ignore */
    }
  }
}
