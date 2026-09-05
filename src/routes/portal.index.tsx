import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  SectionTitle,
  Spinner,
} from "@/components/ui/primitives";
import { claimShareCode, providerQueue } from "@/lib/portal/portal.functions";
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "@/lib/portal/constants";
import { REQUEST_TYPE_LABEL } from "@/lib/dossier/constants";
import { formatDate, formatMoney } from "@/lib/dossier/format";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [
      { title: "Capital Provider Portal — Dossier by Ventureble" },
      {
        name: "description",
        content:
          "Lender sign-in for Dossier by Ventureble. Open the financing dossiers Caribbean businesses have shared with your institution and send back a review.",
      },
      { property: "og:title", content: "Capital Provider Portal — Dossier by Ventureble" },
      {
        property: "og:description",
        content: "Open shared financing dossiers and submit a lender review.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PortalShell>
      <PortalQueue />
    </PortalShell>
  ),
});

function PortalQueue() {
  const qc = useQueryClient();
  const loadQueue = useServerFn(providerQueue);
  const claim = useServerFn(claimShareCode);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["provider-queue"],
    queryFn: () => loadQueue(),
  });

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await claim({ data: { code } });
      setCode("");
      setNotice("Dossier added to your queue.");
      await qc.invalidateQueries({ queryKey: ["provider-queue"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code could not be used.");
    } finally {
      setBusy(false);
    }
  }

  const items = data?.items ?? [];

  return (
    <>
      <div className="mb-6">
        <p className="label-caps text-accent">Capital provider portal</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Dossiers shared with you</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Anything a business invites {data?.email ? <span className="text-foreground">{data.email}</span> : "your email"} to
          review appears here automatically. You can also add a dossier with a share code.
        </p>
      </div>

      <Card className="mb-8 p-6">
        <SectionTitle>Add a dossier with a share code</SectionTitle>
        <form onSubmit={handleClaim} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Field label="Share code" htmlFor="share-code">
              <Input
                id="share-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VNT-4KQ9TX"
                autoCapitalize="characters"
                required
              />
            </Field>
          </div>
          <Button type="submit" disabled={busy || !code.trim()}>
            {busy ? <Spinner /> : <KeyRound className="size-4" />} Add dossier
          </Button>
        </form>
        {error ? (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}
        {notice ? (
          <p className="mt-3 rounded-md bg-success/10 px-3 py-2 text-sm text-success">{notice}</p>
        ) : null}
      </Card>

      <SectionTitle>Your review queue</SectionTitle>

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No dossiers yet"
          description="When a business invites your email address or gives you a share code, the financing dossier will appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.shareId} className="flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold">{item.companyName}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[item.industry, item.country].filter(Boolean).join(" · ") || "Caribbean business"}
                  </p>
                </div>
                {item.reviewStatus ? (
                  <Badge tone={REVIEW_STATUS_TONE[item.reviewStatus] ?? "muted"}>
                    {REVIEW_STATUS_LABEL[item.reviewStatus] ?? item.reviewStatus}
                  </Badge>
                ) : (
                  <Badge tone="accent">New</Badge>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="label-caps">Amount</p>
                  <p className="mt-1 font-display text-lg font-semibold tabular-nums text-accent">
                    {formatMoney(Number(item.amount ?? 0), item.currency)}
                  </p>
                </div>
                <div>
                  <p className="label-caps">Type</p>
                  <p className="mt-1 text-muted-foreground">
                    {REQUEST_TYPE_LABEL[item.requestType] ?? item.requestType}
                  </p>
                </div>
              </div>

              {item.purpose ? (
                <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{item.purpose}</p>
              ) : null}

              <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="size-3.5" /> Shared {formatDate(item.sharedAt)}
                </span>
                <Link to="/portal/$shareId" params={{ shareId: item.shareId }}>
                  <Button size="sm">
                    {item.submittedAt ? "View review" : "Review dossier"} <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
