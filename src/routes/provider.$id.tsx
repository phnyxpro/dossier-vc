import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle, FileWarning, HelpCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, Card, SectionTitle, Spinner, Stat } from "@/components/ui/primitives";
import { useDocuments, useDossierSections, useFields, useRequest } from "@/lib/dossier/queries";
import {
  buildSnapshot,
  cashflowIndicators,
  documentReadiness,
  lenderQuestions,
  missingDocuments,
  riskFlags,
} from "@/lib/dossier/readiness";
import { formatMoney } from "@/lib/dossier/format";
import { REQUEST_TYPE_LABEL } from "@/lib/dossier/constants";
import { INDICATIVE_NOTE } from "@/lib/dossier/sections";

export const Route = createFileRoute("/provider/$id")({
  head: () => ({
    meta: [
      { title: "Capital Provider Review — Dossier by Ventureble" },
      {
        name: "description",
        content:
          "A concise lender view of the request: amount, purpose, financial snapshot, repayment support, risk flags, gaps and key questions.",
      },
      { property: "og:title", content: "Capital Provider Review — Dossier by Ventureble" },
      { property: "og:description", content: "Everything a credit officer needs on a single screen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProviderView,
});

const SEVERITY_TONE = { high: "danger", medium: "warning", low: "primary", info: "success" } as const;

function ProviderView() {
  const { id } = Route.useParams();
  const { data: request } = useRequest(id);
  const { data: documents } = useDocuments(id);
  const { data: fields } = useFields(id);
  const { data: sections } = useDossierSections(id);

  if (!request || !documents || !fields || !sections) {
    return (
      <AppShell>
        <div className="flex justify-center py-24 text-muted-foreground">
          <Spinner />
        </div>
      </AppShell>
    );
  }

  const summary = sections.find((s) => s.section_key === "executive_summary");
  const thesis = sections.find((s) => s.section_key === "funding_thesis");
  const risksSection = sections.find((s) => s.section_key === "risks_mitigants");

  const currency = request.currency;
  const snap = buildSnapshot(fields, request);
  const indicators = cashflowIndicators(snap, currency);
  const flags = riskFlags(request, documents, fields, snap).filter((f) => f.severity !== "info");
  const questions = lenderQuestions(request, snap, documents).slice(0, 6);
  const missing = missingDocuments(documents);
  const docs = documentReadiness(documents);

  return (
    <AppShell>
      <Link
        to="/requests/$id"
        params={{ id }}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground no-print"
      >
        <ArrowLeft className="size-3.5" /> Back to the request
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Capital provider review view</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">{request.companies?.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.companies?.industry} · {request.companies?.country} ·{" "}
            {request.companies?.years_in_operation ?? "—"} years trading
          </p>
        </div>
        <Badge tone="primary">Read-only lender summary</Badge>
      </div>

      {summary ? (
        <Card className="mb-6">
          <h3 className="mb-2 font-display text-lg font-semibold">Executive summary</h3>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            {summary.body.split(/\n+/).filter((l) => l.trim() && !l.startsWith("- ")).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {summary.body.split(/\n+/).some((l) => l.startsWith("- ")) ? (
              <ul className="list-disc space-y-1 pl-5">
                {summary.body.split(/\n+/).filter((l) => l.startsWith("- ")).map((b, i) => (
                  <li key={i}>{b.slice(2)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </Card>
      ) : null}

      {thesis ? (
        <Card className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold">Funding thesis</h3>
            <Badge tone="accent">Indicative</Badge>
          </div>
          <p className="mb-2 text-xs italic text-muted-foreground">{INDICATIVE_NOTE}</p>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            {thesis.body.split(/\n+/).filter((l) => l.trim() && !l.startsWith("- ")).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {thesis.body.split(/\n+/).some((l) => l.startsWith("- ")) ? (
              <ul className="list-disc space-y-1 pl-5">
                {thesis.body.split(/\n+/).filter((l) => l.startsWith("- ")).map((b, i) => (
                  <li key={i}>{b.slice(2)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </Card>
      ) : null}

      {risksSection ? (
        <Card className="mb-6">
          <h3 className="mb-2 font-display text-lg font-semibold">Risks and mitigants</h3>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            {risksSection.body.split(/\n+/).filter((l) => l.trim() && !l.startsWith("- ")).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {risksSection.body.split(/\n+/).some((l) => l.startsWith("- ")) ? (
              <ul className="list-disc space-y-1 pl-5">
                {risksSection.body.split(/\n+/).filter((l) => l.startsWith("- ")).map((b, i) => (
                  <li key={i}>{b.slice(2)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Amount requested"
          value={formatMoney(Number(request.amount_sought ?? 0), currency)}
          tone="accent"
          sub={`${REQUEST_TYPE_LABEL[request.request_type] ?? request.request_type} · ${request.term_value ?? "—"} ${request.term_unit ?? ""}`}
        />
        <Stat label="Annual revenue" value={formatMoney(snap.annual_revenue, currency)} sub="Confirmed by the business" />
        <Stat label="Operating profit" value={formatMoney(snap.ebitda, currency)} sub="EBITDA basis where stated" />
        <Stat
          label="Evidence pack"
          value={`${docs.satisfied}/${docs.total}`}
          tone={docs.missing === 0 ? "success" : "warning"}
          sub={`${missing.length} document types outstanding`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-display text-base font-semibold">Purpose and use of funds</h3>
          <p className="mt-3 text-sm text-muted-foreground">{request.purpose || "Not provided."}</p>
          <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{request.use_of_funds || ""}</p>
          <h3 className="mt-6 font-display text-base font-semibold">Repayment support</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="label-caps">Primary</p>
              <p className="text-muted-foreground">{request.repayment_primary || "—"}</p>
            </div>
            <div>
              <p className="label-caps">Secondary</p>
              <p className="text-muted-foreground">{request.repayment_secondary || "—"}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{request.repayment_explanation || ""}</p>
          <h3 className="mt-6 font-display text-base font-semibold">Security offered</h3>
          <p className="mt-2 text-sm text-muted-foreground">{request.security_description || "None recorded."}</p>
        </Card>

        <Card className="p-6">
          <h3 className="font-display text-base font-semibold">Financial snapshot</h3>
          <dl className="mt-3 divide-y divide-border text-sm">
            {[
              ["Revenue", snap.annual_revenue],
              ["Gross profit", snap.gross_profit],
              ["Operating profit", snap.ebitda],
              ["Net profit", snap.net_profit],
              ["Cash", snap.cash_balance],
              ["Receivables", snap.receivables],
              ["Payables", snap.payables],
              ["Existing debt", snap.existing_debt],
            ].map(([l, v]) => (
              <div key={l as string} className="flex justify-between py-2">
                <dt className="text-muted-foreground">{l}</dt>
                <dd className="font-medium tabular-nums">{formatMoney(v as number | null, currency)}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-6 font-display text-base font-semibold">Indicators</h3>
          <dl className="mt-3 divide-y divide-border text-sm">
            {indicators.map((i) => (
              <div key={i.label} className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{i.label}</dt>
                <dd className="text-right font-medium tabular-nums">{i.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <AlertTriangle className="size-4 text-warning" /> Risk flags
          </h3>
          <ul className="mt-3 space-y-3 text-sm">
            {flags.length ? (
              flags.map((f) => (
                <li key={f.title}>
                  <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge>
                  <p className="mt-1 font-medium">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.detail}</p>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">No structural gaps detected.</li>
            )}
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <FileWarning className="size-4 text-destructive" /> Missing documents
          </h3>
          {missing.length ? (
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              {missing.map((m) => (
                <li key={m.key}>{m.label}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Complete evidence pack.</p>
          )}
          <h3 className="mt-6 font-display text-base font-semibold">Major customers</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {snap.majorCustomers.length ? snap.majorCustomers.map((c) => <li key={c}>{c}</li>) : <li>Not confirmed.</li>}
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <HelpCircle className="size-4 text-primary" /> Key questions
          </h3>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </Card>
      </div>

      <SectionTitle>&nbsp;</SectionTitle>
      <p className="text-xs text-muted-foreground">
        This summary is prepared from information supplied by the business. It contains no credit
        assessment, rating or recommendation.
      </p>
    </AppShell>
  );
}
