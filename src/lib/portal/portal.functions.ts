import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const shareIdInput = z.object({ shareId: z.string().uuid() });

const reviewInput = z.object({
  shareId: z.string().uuid(),
  status: z.enum(["reviewing", "info_needed", "interested", "declined"]),
  notes: z.string().max(8000).default(""),
  requestedDocs: z.array(z.string()).max(40).default([]),
  scores: z
    .object({
      financials: z.number().int().min(1).max(5).nullable(),
      security: z.number().int().min(1).max(5).nullable(),
      management: z.number().int().min(1).max(5).nullable(),
      documentation: z.number().int().min(1).max(5).nullable(),
      private_comment: z.string().max(4000).default(""),
    })
    .optional(),
  submit: z.boolean().default(false),
});

async function notify() {
  const { notifySafe } = await import("@/lib/notify/notify.server");
  return notifySafe;
}

async function providerLabel(userId: string) {
  const db = await admin();
  const { data } = await db.auth.admin.getUserById(userId);
  return (
    (data.user?.user_metadata?.["full_name"] as string | undefined) ??
    data.user?.email ??
    "A capital provider"
  );
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function currentEmail(userId: string) {
  const db = await admin();
  const { data } = await db.auth.admin.getUserById(userId);
  return (data.user?.email ?? "").toLowerCase();
}

/** Grants the provider role only when the account has a real invitation or claimed share. */
async function grantProviderRole(userId: string) {
  const db = await admin();
  const { data: existing } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "provider")
    .maybeSingle();
  if (existing) return true;

  const email = await currentEmail(userId);
  let invited = false;

  const { data: assigned } = await db
    .from("dossier_shares")
    .select("id")
    .eq("provider_id", userId)
    .is("revoked_at", null)
    .limit(1);
  invited = Boolean(assigned?.length);

  if (!invited && email) {
    const { data: byEmail } = await db
      .from("dossier_shares")
      .select("id")
      .is("revoked_at", null)
      .ilike("invited_email", email)
      .limit(1);
    invited = Boolean(byEmail?.length);
  }

  if (!invited) return false;

  const { error } = await db
    .from("user_roles")
    .upsert({ user_id: userId, role: "provider" }, { onConflict: "user_id,role" });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  return true;
}

/** Marks the signed-in account as a capital provider when they hold a valid invitation. */
export const registerProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const granted = await grantProviderRole(context.userId);
    return { ok: granted, needsInvite: !granted };
  });


export const isProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "provider")
      .maybeSingle();
    return { provider: Boolean(data) };
  });

/** Dossiers shared with this provider, after claiming any invitations sent to their email. */
export const providerQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const email = await currentEmail(context.userId);

    if (email) {
      await db
        .from("dossier_shares")
        .update({ provider_id: context.userId, status: "claimed", claimed_at: new Date().toISOString() })
        .is("provider_id", null)
        .is("revoked_at", null)
        .ilike("invited_email", email);
    }

    const { data: shares, error } = await db
      .from("dossier_shares")
      .select("id, request_id, share_code, status, created_at, claimed_at, revoked_at")
      .eq("provider_id", context.userId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const requestIds = [...new Set((shares ?? []).map((s) => s.request_id))];
    if (!requestIds.length) return { email, items: [] };

    const { data: requests } = await db
      .from("capital_requests")
      .select("id, reference, request_type, amount_sought, currency, purpose, updated_at, companies(name, industry, country)")
      .in("id", requestIds);

    const { data: reviews } = await db
      .from("provider_reviews")
      .select("id, share_id, status, notes, requested_docs, submitted_at, updated_at, closed, closed_at")
      .eq("provider_id", context.userId);

    const reviewIds = (reviews ?? []).map((r) => r.id);
    const { data: scores } = reviewIds.length
      ? await db
          .from("provider_review_scores")
          .select("review_id, financials, security, management, documentation")
          .in("review_id", reviewIds)
      : { data: [] as never[] };

    const byRequest = new Map((requests ?? []).map((r) => [r.id, r]));
    const byShare = new Map((reviews ?? []).map((r) => [r.share_id, r]));
    const scoreByReview = new Map((scores ?? []).map((s) => [s.review_id, s]));

    return {
      email,
      items: (shares ?? []).map((s) => {
        const r = byRequest.get(s.request_id);
        const review = byShare.get(s.id);
        const score = review ? scoreByReview.get(review.id) : undefined;
        return {
          shareId: s.id,
          shareCode: s.share_code,
          sharedAt: s.claimed_at ?? s.created_at,
          reference: r?.reference ?? "",
          companyName: r?.companies?.name ?? "Business",
          industry: r?.companies?.industry ?? null,
          country: r?.companies?.country ?? null,
          requestType: r?.request_type ?? "debt",
          amount: r?.amount_sought ?? null,
          currency: r?.currency ?? "TTD",
          purpose: r?.purpose ?? null,
          reviewStatus: review?.status ?? null,
          reviewNotes: review?.notes ?? "",
          requestedDocs: review?.requested_docs ?? [],
          updatedAt: review?.updated_at ?? null,
          submittedAt: review?.submitted_at ?? null,
          closed: review?.closed ?? false,
          scores: score
            ? {
                financials: score.financials,
                security: score.security,
                management: score.management,
                documentation: score.documentation,
              }
            : null,
        };
      }),
    };
  });

/** Attaches a dossier to this provider's queue using a share code from the business. */
export const claimShareCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string().min(4).max(40) }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const code = data.code.trim().toUpperCase();

    const { data: share } = await db
      .from("dossier_shares")
      .select("id, provider_id, revoked_at")
      .eq("share_code", code)
      .maybeSingle();

    if (!share) throw new Error("That share code was not recognised.");
    if (share.revoked_at) throw new Error("That share code is no longer active.");
    if (share.provider_id && share.provider_id !== context.userId) {
      throw new Error("That share code has already been used by another provider.");
    }
    if (!share.provider_id) {
      const { error } = await db
        .from("dossier_shares")
        .update({ provider_id: context.userId, status: "claimed", claimed_at: new Date().toISOString() })
        .eq("id", share.id);
      if (error) throw new Error(error.message);
      const { data: full } = await db
        .from("dossier_shares")
        .select("owner_id, request_id")
        .eq("id", share.id)
        .maybeSingle();
      if (full) {
        const notifySafe = await notify();
        await notifySafe({
          userId: full.owner_id,
          kind: "share_created",
          title: "A capital provider accepted your share code",
          body: `${await providerLabel(context.userId)} now has access to your dossier.`,
          url: `/requests/${full.request_id}/dossier`,
          requestId: full.request_id,
        });
      }
    }
    return { shareId: share.id };
  });

async function authorizeShare(userId: string, shareId: string) {
  const db = await admin();
  const { data: share } = await db
    .from("dossier_shares")
    .select("id, request_id, owner_id, provider_id, revoked_at, share_code")
    .eq("id", shareId)
    .maybeSingle();
  if (!share || share.provider_id !== userId || share.revoked_at) {
    throw new Error("This dossier is not available to your account.");
  }
  return share;
}

/** The full read-only dossier a provider is allowed to see. */
export const portalDossier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => shareIdInput.parse(data))
  .handler(async ({ data, context }) => {
    const share = await authorizeShare(context.userId, data.shareId);
    const db = await admin();

    const { data: shareRow } = await db
      .from("dossier_shares")
      .select("status")
      .eq("id", share.id)
      .maybeSingle();
    if (shareRow && shareRow.status !== "opened") {
      await db.from("dossier_shares").update({ status: "opened" }).eq("id", share.id);
      const notifySafe = await notify();
      await notifySafe({
        userId: share.owner_id,
        kind: "dossier_opened",
        title: "Your dossier was opened",
        body: `${await providerLabel(context.userId)} opened your financing dossier.`,
        url: `/requests/${share.request_id}/dossier`,
        requestId: share.request_id,
      });
    }

    const [{ data: request }, { data: documents }, { data: fields }, { data: sections }, { data: review }, { data: scores }] =
      await Promise.all([
        db.from("capital_requests").select("*, companies(*)").eq("id", share.request_id).single(),
        db
          .from("documents")
          .select("id, doc_type, name, status, notes, created_at, updated_at, request_id, user_id, mime_type, size_bytes, extraction_status, extraction_error, extracted_text, storage_path")
          .eq("request_id", share.request_id)
          .order("created_at", { ascending: true }),
        db
          .from("extracted_fields")
          .select("*")
          .eq("request_id", share.request_id)
          .eq("status", "confirmed")
          .order("created_at", { ascending: true }),
        db
          .from("dossier_sections")
          .select("*")
          .eq("request_id", share.request_id)
          .order("sort_order", { ascending: true }),
        db.from("provider_reviews").select("*").eq("share_id", share.id).maybeSingle(),
        db
          .from("provider_review_scores")
          .select("*")
          .eq("provider_id", context.userId)
          .maybeSingle(),
      ]);

    return {
      shareCode: share.share_code,
      request,
      documents: documents ?? [],
      fields: fields ?? [],
      sections: sections ?? [],
      review: review ?? null,
      scores: review && scores && scores.review_id === review.id ? scores : null,
    };
  });

/** Saves or submits the provider's review, plus their own private scoring. */
export const saveProviderReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reviewInput.parse(data))
  .handler(async ({ data, context }) => {
    const share = await authorizeShare(context.userId, data.shareId);
    const db = await admin();
    const { data: account } = await db.auth.admin.getUserById(context.userId);
    const providerOrg =
      (account.user?.user_metadata?.["full_name"] as string | undefined) ?? account.user?.email ?? null;

    const { data: saved, error } = await context.supabase
      .from("provider_reviews")
      .upsert(
        {
          share_id: share.id,
          request_id: share.request_id,
          provider_id: context.userId,
          owner_id: share.owner_id,
          provider_org: providerOrg,
          status: data.status,
          notes: data.notes,
          requested_docs: data.requestedDocs,
          submitted_at: data.submit ? new Date().toISOString() : null,
        },
        { onConflict: "share_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.scores) {
      const { error: scoreError } = await context.supabase.from("provider_review_scores").upsert(
        {
          review_id: saved.id,
          provider_id: context.userId,
          financials: data.scores.financials,
          security: data.scores.security,
          management: data.scores.management,
          documentation: data.scores.documentation,
          private_comment: data.scores.private_comment,
        },
        { onConflict: "review_id" },
      );
      if (scoreError) throw new Error(scoreError.message);
    }

    if (data.submit) {
      const notifySafe = await notify();
      const outcome: Record<string, string> = {
        reviewing: "is reviewing your request",
        info_needed: "has asked for more information",
        interested: "is interested in your request",
        declined: "has declined your request",
      };
      await notifySafe({
        userId: share.owner_id,
        kind: "review_submitted",
        title: "A capital provider responded",
        body: `${providerOrg ?? "A capital provider"} ${outcome[data.status] ?? "responded"}.`,
        url: `/requests/${share.request_id}/dossier`,
        requestId: share.request_id,
      });
    }

    return { ok: true, submitted: data.submit };
  });

/** Lets a provider flag (or clear) a document that needs the business to look again. */
export const providerFlagDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        shareId: z.string().uuid(),
        documentId: z.string().uuid(),
        flag: z.boolean(),
        note: z.string().max(2000).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const share = await authorizeShare(context.userId, data.shareId);
    const db = await admin();

    const { data: doc } = await db
      .from("documents")
      .select("id, request_id, status, notes")
      .eq("id", data.documentId)
      .eq("request_id", share.request_id)
      .maybeSingle();
    if (!doc) throw new Error("That document is not part of this dossier.");

    const org = (await currentEmail(context.userId)) || "the capital provider";
    const stamped = data.note.trim() ? `Capital provider (${org}): ${data.note.trim()}` : "";
    const existing = (doc.notes ?? "").replace(/^Capital provider \(.*?\):.*$/gm, "").trim();
    const notes = data.flag ? [existing, stamped].filter(Boolean).join("\n") : existing;

    const { error } = await db
      .from("documents")
      .update({
        status: data.flag ? "needs_review" : doc.status === "needs_review" ? "received" : doc.status,
        notes: notes || null,
      })
      .eq("id", doc.id);
    if (error) throw new Error(error.message);

    if (data.flag) {
      const notifySafe = await notify();
      await notifySafe({
        userId: share.owner_id,
        kind: "document_flagged",
        title: "A document needs another look",
        body: `${org} flagged a document in your dossier.`,
        url: `/requests/${share.request_id}/documents`,
        requestId: share.request_id,
      });
    }
    return { ok: true };
  });

/** Lets a provider key in a figure they read off a document themselves. */
export const providerAddFigure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        shareId: z.string().uuid(),
        documentId: z.string().uuid().nullable().default(null),
        fieldKey: z.string().min(1).max(60),
        fieldLabel: z.string().min(1).max(120),
        valueNumber: z.number().finite().nullable().default(null),
        valueText: z.string().max(500).nullable().default(null),
        period: z.string().max(60).nullable().default(null),
        note: z.string().max(500).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const share = await authorizeShare(context.userId, data.shareId);
    const db = await admin();
    const org = (await currentEmail(context.userId)) || "capital provider";

    const { error } = await db.from("extracted_fields").insert({
      user_id: share.owner_id,
      request_id: share.request_id,
      document_id: data.documentId,
      field_key: data.fieldKey,
      field_label: data.fieldLabel,
      value_number: data.valueNumber,
      value_text: data.valueText,
      period: data.period,
      confidence: null,
      origin: "provider",
      status: "confirmed",
      source_excerpt: data.note.trim() || `Keyed in by ${org}`,
    });
    if (error) throw new Error(error.message);

    const notifySafe = await notify();
    await notifySafe({
      userId: share.owner_id,
      kind: "figure_added",
      title: "A capital provider added a figure",
      body: `${org} added "${data.fieldLabel}" to your dossier.`,
      url: `/requests/${share.request_id}/extraction`,
      requestId: share.request_id,
    });
    return { ok: true };
  });

/** Closes or reopens the provider's file on this request. */
export const setReviewClosed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ shareId: z.string().uuid(), closed: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const share = await authorizeShare(context.userId, data.shareId);
    const db = await admin();
    const { data: account } = await db.auth.admin.getUserById(context.userId);
    const providerOrg =
      (account.user?.user_metadata?.["full_name"] as string | undefined) ?? account.user?.email ?? null;

    const patch = { closed: data.closed, closed_at: data.closed ? new Date().toISOString() : null };
    const { data: existing } = await context.supabase
      .from("provider_reviews")
      .select("id")
      .eq("share_id", share.id)
      .maybeSingle();

    const { error } = existing
      ? await context.supabase.from("provider_reviews").update(patch).eq("id", existing.id)
      : await context.supabase.from("provider_reviews").insert({
          share_id: share.id,
          request_id: share.request_id,
          provider_id: context.userId,
          owner_id: share.owner_id,
          provider_org: providerOrg,
          ...patch,
        });
    if (error) throw new Error(error.message);
    return { ok: true, closed: data.closed };
  });
