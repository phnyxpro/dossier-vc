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

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function currentEmail(userId: string) {
  const db = await admin();
  const { data } = await db.auth.admin.getUserById(userId);
  return (data.user?.email ?? "").toLowerCase();
}

/** Marks the signed-in account as a capital provider and picks up email invitations. */
export const registerProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "provider" }, { onConflict: "user_id,role" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
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
      .select("id, share_id, status, notes, requested_docs, submitted_at, updated_at")
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

    const [{ data: request }, { data: documents }, { data: fields }, { data: sections }, { data: review }, { data: scores }] =
      await Promise.all([
        db.from("capital_requests").select("*, companies(*)").eq("id", share.request_id).single(),
        db
          .from("documents")
          .select("id, doc_type, name, status, notes, created_at, updated_at, request_id, user_id, mime_type, size_bytes, extraction_status, extraction_error, storage_path")
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

    return { ok: true, submitted: data.submit };
  });
