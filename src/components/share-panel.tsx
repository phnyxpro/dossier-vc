import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, Mail, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Card, Field, Input, SectionTitle, Spinner } from "@/components/ui/primitives";
import { makeShareCode, REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "@/lib/portal/constants";
import { DOC_TYPE_LABEL } from "@/lib/dossier/constants";
import { formatDate } from "@/lib/dossier/format";
import type { Database } from "@/integrations/supabase/types";

type ShareRow = Database["public"]["Tables"]["dossier_shares"]["Row"] & {
  provider_reviews: Database["public"]["Tables"]["provider_reviews"]["Row"][];
};

export function useShares(requestId: string) {
  return useQuery({
    queryKey: ["shares", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossier_shares")
        .select("*, provider_reviews(*)")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ShareRow[];
    },
  });
}

export function SharePanel({ requestId }: { requestId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: shares, isLoading } = useShares(requestId);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createShare = useMutation({
    mutationFn: async (invitedEmail: string | null) => {
      if (!user) throw new Error("Sign in first.");
      const { error: insertError } = await supabase.from("dossier_shares").insert({
        request_id: requestId,
        owner_id: user.id,
        share_code: makeShareCode(),
        invited_email: invitedEmail,
        status: invitedEmail ? "invited" : "code",
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      setEmail("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["shares", requestId] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not create the share."),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error: updateError } = await supabase
        .from("dossier_shares")
        .update({ revoked_at: new Date().toISOString(), status: "revoked" })
        .eq("id", id);
      if (updateError) throw updateError;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shares", requestId] }),
  });

  const active = (shares ?? []).filter((s) => !s.revoked_at);

  return (
    <Card className="p-6 no-print">
      <SectionTitle>Share with a capital provider</SectionTitle>
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        Invite a lender by email, or hand them a share code. They sign in to the provider portal and
        see this dossier read-only — nothing else in your workspace.
      </p>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          createShare.mutate(email.trim().toLowerCase());
        }}
      >
        <div className="min-w-[240px] flex-1">
          <Field label="Lender email" htmlFor="lender-email">
            <Input
              id="lender-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="credit.officer@bank.tt"
              required
            />
          </Field>
        </div>
        <Button type="submit" disabled={createShare.isPending}>
          {createShare.isPending ? <Spinner /> : <Send className="size-4" />} Invite
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => createShare.mutate(null)}
          disabled={createShare.isPending}
        >
          <Link2 className="size-4" /> Generate a code
        </Button>
      </form>

      {error ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-8 text-muted-foreground">
          <Spinner />
        </div>
      ) : active.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Not shared with anyone yet.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {active.map((share) => {
            const review = share.provider_reviews?.[0];
            return (
              <li key={share.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="size-3.5 text-muted-foreground" />
                      {share.invited_email ?? "Anyone with the code"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Shared {formatDate(share.created_at)}
                      {share.claimed_at ? ` · opened ${formatDate(share.claimed_at)}` : " · not opened yet"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {review?.submitted_at ? (
                      <Badge tone={REVIEW_STATUS_TONE[review.status] ?? "primary"}>
                        {REVIEW_STATUS_LABEL[review.status] ?? review.status}
                      </Badge>
                    ) : (
                      <Badge tone={share.claimed_at ? "primary" : "muted"}>
                        {share.claimed_at ? "With the provider" : "Invitation sent"}
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(share.share_code);
                        setCopied(share.id);
                        setTimeout(() => setCopied(null), 1500);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 font-mono text-xs hover:bg-secondary"
                    >
                      {copied === share.id ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                      {share.share_code}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Withdraw access"
                      onClick={() => revoke.mutate(share.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {review?.submitted_at ? (
                  <div className="mt-4 rounded-md bg-secondary/60 p-4">
                    <p className="label-caps">Review received {formatDate(review.submitted_at)}</p>
                    {review.notes ? (
                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{review.notes}</p>
                    ) : null}
                    {review.requested_docs?.length ? (
                      <div className="mt-3">
                        <p className="label-caps">Documents requested</p>
                        <ul className="mt-1.5 flex flex-wrap gap-1.5">
                          {review.requested_docs.map((key) => (
                            <li key={key}>
                              <Badge tone="warning">{DOC_TYPE_LABEL[key] ?? key}</Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
