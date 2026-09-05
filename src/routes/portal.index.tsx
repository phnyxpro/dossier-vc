import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Clock, FileCheck2, FolderOpen, History, KeyRound, Mail } from "lucide-react";
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
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE, SCORE_CRITERIA } from "@/lib/portal/constants";
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
      <PortalDashboard />
    </PortalShell>
  ),
});

type QueueItem = NonNullable<Awaited<ReturnType<typeof providerQueue>>>["items"][number];

function PortalDashboard() {
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
  const active = items.filter((i) => !i.submittedAt);
  const history = items.filter((i) => i.submittedAt);
  const awaitingReview = items.filter((i) => !i.reviewStatus);
  const totalAmount = active.reduce((sum, i) => sum + Number(i.amount ?? 0), 0);
  const activeCurrency = active[0]?.currency ?? "TTD";

  return (
    <>
      <div className="mb-6">
        <p className="label-caps text-accent">Capital provider portal</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Your lender dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every dossier shared with {data?.email ? <span className="text-foreground">{data.email}</span> : "you"} — what
          needs your attention and the reviews you have already sent back.
        </p>
      </div>

      {/* Dashboard stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FolderOpen className="size-4" />}
          label="Active dossiers"
          value={isLoading ? "—" : String(active.length)}
          hint="shared with you"
        />
        <StatCard
          icon={<Clock className="size-4" />}
          label="Awaiting your review"
          value={isLoading ? "—" : String(awaitingReview.length)}
          hint="not yet started"
        />
        <StatCard
          icon={<FileCheck2 className="size-4" />}
          label="Reviews submitted"
          value={isLoading ? "—" : String(history.length)}
          hint="sent back to businesses"
        />
        <StatCard
          icon={<Mail className="size-4" />}
          label="Active deal value"
          value={isLoading ? "—" : formatMoney(totalAmount, activeCurrency)}
          hint="across open dossiers"
        />
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

      <SectionTitle>Active dossiers</SectionTitle>

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No dossiers yet"
          description="When a business invites your email address or gives you a share code, the financing dossier will appear here."
        />
      ) : active.length === 0 ? (
        <EmptyState
          title="Nothing waiting on you"
          description="Every dossier shared with you has a submitted review. New invitations will appear here automatically."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {active.map((item) => (
            <DossierCard key={item.shareId} item={item} />
          ))}
        </div>
      )}

      {!isLoading && history.length > 0 ? (
        <>
          <div className="mt-12 flex items-center gap-2">
            <History className="size-4 text-accent" />
            <SectionTitle>Review history</SectionTitle>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {history.map((item) => (
              <DossierCard key={item.shareId} item={item} historical />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-accent">
        {icon}
        <p className="label-caps">{label}</p>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}

function DossierCard({ item, historical = false }: { item: QueueItem; historical?: boolean }) {
  return (
    <Card className="flex flex-col p-6">
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

      {historical ? (
        <div className="mt-4 space-y-2 rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
          <p className="text-muted-foreground">
            Submitted {formatDate(item.submittedAt)}
            {item.reviewNotes ? ` — “${item.reviewNotes.slice(0, 120)}${item.reviewNotes.length > 120 ? "…" : ""}”` : ""}
          </p>
          {item.scores ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              {SCORE_CRITERIA.map((c) => {
                const v = item.scores?.[c.key];
                return v ? (
                  <span key={c.key} className="tabular-nums">
                    {c.label}: <span className="text-foreground">{v}/5</span>
                  </span>
                ) : null;
              })}
            </div>
          ) : null}
          {item.requestedDocs.length ? (
            <p className="text-muted-foreground">
              Documents requested: {item.requestedDocs.length}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mail className="size-3.5" /> Shared {formatDate(item.sharedAt)}
        </span>
        <Link to="/portal/$shareId" params={{ shareId: item.shareId }}>
          <Button size="sm" variant={historical ? "outline" : "default"}>
            {item.submittedAt ? "View review" : "Review dossier"} <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
