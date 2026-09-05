import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, Card, Progress, Spinner } from "@/components/ui/primitives";
import { WIZARD_STEPS } from "@/lib/dossier/constants";
import { useDocuments, useFields, useRequest } from "@/lib/dossier/queries";
import { readinessLabel, readinessScore } from "@/lib/dossier/readiness";
import { formatMoney } from "@/lib/dossier/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/requests/$id")({
  component: RequestLayout,
});

function RequestLayout() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: request, isLoading, isError } = useRequest(id);
  const { data: documents } = useDocuments(id);
  const { data: fields } = useFields(id);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center py-24 text-muted-foreground">
          <Spinner />
        </div>
      </AppShell>
    );
  }

  if (isError || !request) {
    return (
      <AppShell>
        <EmptyState
          title="This financing request isn't available"
          description="It may have been deleted, or it belongs to another account. Head back to your dashboard to pick up an existing request or start a new one."
          action={
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Back to dashboard
            </Link>
          }
        />
      </AppShell>
    );
  }

  const score = readinessScore(documents ?? [], fields ?? [], request);
  const label = readinessLabel(score);

  const base = `/requests/${id}`;
  const currentIndex = WIZARD_STEPS.findIndex((s) =>
    s.slug === "" ? pathname === base : pathname === `${base}/${s.slug}`,
  );

  return (
    <AppShell>
      <Card className="mb-6 p-6 no-print">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="label-caps">
              <span className="font-mono">{request.reference ?? "—"}</span> · Financing request
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold">
              {request.companies?.name ?? "Unnamed business"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {request.companies?.industry ?? "Industry not set"} · {request.companies?.country}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="label-caps">Amount sought</p>
              <p className="mt-1 font-display text-xl font-semibold text-accent tabular-nums">
                {formatMoney(Number(request.amount_sought ?? 0), request.currency)}
              </p>
            </div>
            <div className="min-w-[160px]">
              <div className="flex items-center justify-between gap-3">
                <p className="label-caps">Readiness</p>
                <Badge tone={label.tone}>{label.label}</Badge>
              </div>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums">{score}%</p>
              <div className="mt-2">
                <Progress value={score} tone={score >= 85 ? "success" : "primary"} />
              </div>
            </div>
            <Link
              to="/provider/$id"
              params={{ id }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Capital provider view <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </div>
      </Card>

      <nav className="mb-8 overflow-x-auto no-print">
        <ol className="flex min-w-max items-center gap-1">
          {WIZARD_STEPS.map((step, index) => {
            const to = step.slug ? `${base}/${step.slug}` : base;
            const active = index === currentIndex;
            const done = currentIndex > -1 && index < currentIndex;
            return (
              <li key={step.label} className="flex items-center">
                <Link
                  to={to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/15 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[0.65rem] font-semibold",
                      active
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "bg-success/20 text-success"
                          : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  {step.label}
                </Link>
                {index < WIZARD_STEPS.length - 1 ? (
                  <span className="mx-1 h-px w-4 bg-border" aria-hidden />
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>

      <Outlet />
    </AppShell>
  );
}
