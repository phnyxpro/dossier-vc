import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Plus } from "@/lib/icons";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, Card, EmptyState, Progress, SectionTitle, Spinner, Stat } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useRequests } from "@/lib/dossier/queries";
import { formatDate, formatMoney } from "@/lib/dossier/format";
import { useLabels } from "@/lib/dossier/labels";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Capital Dashboard — Dossier by Ventureble" },
      {
        name: "description",
        content:
          "Track every financing request, readiness status and amount sought in one capital-readiness dashboard built for Caribbean MSMEs.",
      },
      { property: "og:title", content: "Capital Dashboard — Dossier by Ventureble" },
      {
        property: "og:description",
        content: "Financing requests, readiness status and lender-ready dossiers in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const STATUS_TONE: Record<string, "muted" | "primary" | "accent" | "success"> = {
  draft: "muted",
  in_review: "primary",
  ready: "success",
  submitted: "accent",
};

const READINESS_TONE: Record<string, "muted" | "warning" | "success"> = {
  not_started: "muted",
  in_progress: "warning",
  ready: "success",
};

function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const labels = useLabels();
  const { data: requests, isLoading } = useRequests(user?.id);

  const totalSought = (requests ?? []).reduce((sum, r) => sum + Number(r.amount_sought ?? 0), 0);
  const active = (requests ?? []).filter((r) => r.status !== "submitted").length;
  const readyCount = (requests ?? []).filter((r) => r.readiness_status === "ready").length;

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">{t("dash.eyebrow")}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">{t("dash.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
{t("dash.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate({ to: "/requests/new" })}>
            <Plus className="size-4" />
            {t("dash.newRequest")}
          </Button>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("dash.openRequests")} value={active} sub={t("dash.openRequestsSub")} />
        <Stat
          label={t("dash.totalSought")}
          value={formatMoney(totalSought, requests?.[0]?.currency ?? "TTD")}
          tone="accent"
          sub={t("dash.totalSoughtSub")}
        />
        <Stat label={t("dash.readyPacks")} value={readyCount} tone="success" sub={t("dash.readyPacksSub")} />
        <Stat label={t("dash.onFile")} value={requests?.length ?? 0} sub={t("dash.onFileSub")} />
      </div>

      <SectionTitle>{t("dash.allRequests")}</SectionTitle>

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Spinner />
        </div>
      ) : !requests?.length ? (
        <EmptyState
          title={t("dash.emptyTitle")}
          description={t("dash.emptyBody")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => navigate({ to: "/requests/new" })}>
                <Plus className="size-4" /> {t("dash.newRequest")}
              </Button>
              <Button variant="outline" onClick={handleDemo} disabled={busy}>
                <Sparkles className="size-4" /> {t("dash.loadSample")}
              </Button>
            </div>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {[t("dash.colBusiness"), t("dash.colPurpose"), t("dash.colAmount"), t("dash.colStatus"), t("dash.colReadiness"), t("dash.colUpdated"), ""].map((h, i) => (
                    <th key={i} className="label-caps px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-4">
                      <div className="font-medium">{r.companies?.name ?? t("dash.unnamed")}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{r.reference ?? "—"}</span>
                        <span>·</span>
                        <span>{labels.requestType(r.request_type)}</span>
                        {r.is_demo ? <Badge tone="accent">{t("dash.sample")}</Badge> : null}
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-4 text-muted-foreground">
                      <span className="line-clamp-2">{r.purpose || t("dash.noPurpose")}</span>
                    </td>
                    <td className="px-4 py-4 font-medium tabular-nums">
                      {formatMoney(Number(r.amount_sought ?? 0), r.currency)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={STATUS_TONE[r.status] ?? "muted"}>{labels.status(r.status)}</Badge>
                    </td>
                    <td className="w-40 px-4 py-4">
                      <Badge tone={READINESS_TONE[r.readiness_status] ?? "muted"}>
                        {labels.readiness(r.readiness_status)}
                      </Badge>
                      <div className="mt-2">
                        <Progress
                          value={
                            r.readiness_status === "ready" ? 100 : r.readiness_status === "in_progress" ? 55 : 8
                          }
                          tone={r.readiness_status === "ready" ? "success" : "primary"}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{formatDate(r.updated_at)}</td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        to="/requests/$id"
                        params={{ id: r.id }}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        {t("dash.open")} <ArrowRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
