import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, HelpCircle, ListChecks, ShieldCheck, Sparkles } from "@/lib/icons";
import { Badge, Button, Card, SectionTitle, Spinner, Stat } from "@/components/ui/primitives";
import { StepFooter } from "@/components/step-footer";
import { InfoLink } from "@/components/info-link";
import { useDocuments, useFields, useRequest } from "@/lib/dossier/queries";
import { assessReadiness, type AiAssessment } from "@/lib/dossier/assess.functions";
import {
  buildSnapshot,
  cashflowIndicators,
  documentReadiness,
  lenderQuestions,
  missingDocuments,
  nextSteps,
  readinessLabel,
  readinessScore,
  riskFlags,
} from "@/lib/dossier/readiness";
import { formatMoney } from "@/lib/dossier/format";

export const Route = createFileRoute("/requests/$id/readiness")({
  head: () => ({
    meta: [
      { title: "Capital Readiness Review — Dossier by Ventureble" },
      {
        name: "description",
        content:
          "A structured readiness review: financial snapshot, cash-flow indicators, security, gaps, risk flags and the questions a lender will ask.",
      },
      { property: "og:title", content: "Capital Readiness Review — Dossier by Ventureble" },
      { property: "og:description", content: "See what a capital provider will see — before they do." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReadinessStep,
});

const SEVERITY_TONE = { high: "danger", medium: "warning", low: "primary", info: "success" } as const;
const RISK_TONE = { low: "success", moderate: "warning", high: "danger" } as const;

function ReadinessStep() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: request } = useRequest(id);
  const { data: documents } = useDocuments(id);
  const { data: fields } = useFields(id);
  const runAssessment = useServerFn(assessReadiness);
  const [assessment, setAssessment] = useState<AiAssessment | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [assessError, setAssessError] = useState<string | null>(null);

  async function handleAssess() {
    setAssessError(null);
    setAssessing(true);
    try {
      setAssessment(await runAssessment({ data: { requestId: id } }));
    } catch (e) {
      setAssessError(e instanceof Error ? e.message : "Assessment failed.");
    } finally {
      setAssessing(false);
    }
  }

  if (!request || !documents || !fields) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Spinner />
      </div>
    );
  }

  const snap = buildSnapshot(fields, request);
  const indicators = cashflowIndicators(snap, request.currency);
  const flags = riskFlags(request, documents, fields, snap);
  const questions = lenderQuestions(request, snap, documents);
  const steps = nextSteps(documents, fields, snap);
  const missing = missingDocuments(documents);
  const docs = documentReadiness(documents);
  const score = readinessScore(documents, fields, request);
  const label = readinessLabel(score);

  return (
    <div>
      <SectionTitle action={<Badge tone={label.tone}>{label.label}</Badge>}>
        Capital readiness review
      </SectionTitle>

      <div className="mb-4">
        <InfoLink slug="capital-readiness" label="How the readiness score is calculated" />
      </div>

      <Card className="mb-6 flex flex-wrap items-start gap-3 border-primary/30 bg-primary/5 p-4 text-sm">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          This is a preparation review, not a credit assessment. Dossier does not approve credit,
          recommend a loan or make an investment decision — it shows what a capital provider will
          look for and what is still outstanding.
        </p>
      </Card>

      <Card className="mb-8 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-display text-base font-semibold">
              <Sparkles className="size-4 text-accent" /> AI readiness assessment
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              AI reviews your confirmed figures and missing documents, then scores readiness and assigns a
              risk level. Indicative only — not a credit approval, loan recommendation or investment
              decision.
            </p>
          </div>
          <Button variant="accent" onClick={handleAssess} disabled={assessing}>
            <Sparkles className={`size-4 ${assessing ? "animate-pulse" : ""}`} />
            {assessing ? "Assessing…" : assessment ? "Re-run assessment" : "Run AI assessment"}
          </Button>
        </div>

        {assessError ? (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{assessError}</p>
        ) : null}

        {assessment ? (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="label-caps">AI readiness score</p>
                <p className="font-display text-4xl font-semibold tabular-nums">
                  {assessment.score}
                  <span className="text-lg text-muted-foreground">/100</span>
                </p>
              </div>
              <div>
                <p className="label-caps">Risk level</p>
                <Badge tone={RISK_TONE[assessment.risk_level]} className="mt-1">
                  {assessment.risk_level} risk
                </Badge>
              </div>
              <p className="min-w-56 flex-1 text-sm text-muted-foreground">{assessment.rationale}</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="label-caps">Strengths</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {assessment.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      <span className="text-muted-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="label-caps">Concerns to resolve</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {assessment.concerns.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                      <span className="text-muted-foreground">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Readiness score" value={`${score}%`} tone={score >= 85 ? "success" : "primary"} sub="Evidence, confirmed data and narrative" />
        <Stat label="Documents on file" value={`${docs.satisfied}/${docs.total}`} sub={`${docs.needsReview} flagged for review`} />
        <Stat label="Confirmed data points" value={fields.filter((f) => f.status === "confirmed").length} sub={`${fields.filter((f) => f.status === "pending").length} still unconfirmed`} />
        <Stat label="Amount sought" value={formatMoney(Number(request.amount_sought ?? 0), request.currency)} tone="accent" sub={request.financing_subtype ?? "Facility type not set"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-display text-base font-semibold">Financial snapshot</h3>
          <p className="mt-1 text-xs text-muted-foreground">Confirmed values only.</p>
          <dl className="mt-4 divide-y divide-border">
            {[
              ["Annual revenue", snap.annual_revenue],
              ["Gross profit", snap.gross_profit],
              ["EBITDA / operating profit", snap.ebitda],
              ["Net profit", snap.net_profit],
              ["Cash balance", snap.cash_balance],
              ["Accounts receivable", snap.receivables],
              ["Accounts payable", snap.payables],
              ["Inventory", snap.inventory],
            ].map(([labelText, value]) => (
              <div key={labelText as string} className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-muted-foreground">{labelText}</dt>
                <dd className="font-medium tabular-nums">
                  {formatMoney(value as number | null, request.currency)}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <h3 className="font-display text-base font-semibold">Cash-flow indicators</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Indicative only. A capital provider will recalculate on their own basis.
          </p>
          <div className="mt-4 space-y-4">
            {indicators.map((ind) => (
              <div key={ind.label}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-sm text-muted-foreground">{ind.label}</p>
                  <p className="font-display text-base font-semibold tabular-nums">{ind.value}</p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{ind.note}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display text-base font-semibold">Use of funds &amp; repayment support</h3>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="label-caps">Purpose</p>
              <p className="mt-1 text-muted-foreground">{request.purpose || "Not yet described."}</p>
            </div>
            <div>
              <p className="label-caps">Use of funds</p>
              <p className="mt-1 whitespace-pre-line text-muted-foreground">
                {request.use_of_funds || "No line-by-line breakdown recorded."}
              </p>
            </div>
            <div>
              <p className="label-caps">Primary repayment source</p>
              <p className="mt-1 text-muted-foreground">{request.repayment_primary || "Not recorded."}</p>
            </div>
            <div>
              <p className="label-caps">Secondary repayment source</p>
              <p className="mt-1 text-muted-foreground">{request.repayment_secondary || "Not recorded."}</p>
            </div>
            <div>
              <p className="label-caps">Repayment explanation</p>
              <p className="mt-1 text-muted-foreground">{request.repayment_explanation || "Not recorded."}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display text-base font-semibold">Existing debt &amp; security</h3>
          <div className="mt-4 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Existing debt outstanding</p>
              <p className="font-medium tabular-nums">{formatMoney(snap.existing_debt, request.currency)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Monthly debt service</p>
              <p className="font-medium tabular-nums">{formatMoney(snap.debt_service, request.currency)}</p>
            </div>
            <div>
              <p className="label-caps">Proposed security or collateral</p>
              <p className="mt-1 text-muted-foreground">
                {request.security_description || "No security position recorded."}
              </p>
            </div>
            <div>
              <p className="label-caps">Recurring obligations</p>
              {snap.recurringObligations.length ? (
                <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                  {snap.recurringObligations.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-muted-foreground">None confirmed.</p>
              )}
            </div>
            <div>
              <p className="label-caps">Major customers</p>
              {snap.majorCustomers.length ? (
                <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                  {snap.majorCustomers.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-muted-foreground">None confirmed.</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <AlertTriangle className="size-4 text-warning" /> Key risk flags
          </h3>
          <ul className="mt-4 space-y-3">
            {flags.map((flag) => (
              <li key={flag.title} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={SEVERITY_TONE[flag.severity]}>{flag.severity}</Badge>
                  <p className="text-sm font-medium">{flag.title}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{flag.detail}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="font-display text-base font-semibold">Missing information</h3>
          {missing.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {missing.map((m) => (
                <li key={m.key} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" />
                  <span>
                    <span className="font-medium">{m.label}</span>
                    <span className="block text-xs text-muted-foreground">{m.hint}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">All required evidence types are on file.</p>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <HelpCircle className="size-4 text-primary" /> Questions a lender is likely to ask
          </h3>
          <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </Card>

        <Card className="p-6">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <ListChecks className="size-4 text-accent" /> Recommended next steps
          </h3>
          <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Card>
      </div>

      <StepFooter
        backTo={`/requests/${id}/extraction`}
        onSave={() => navigate({ to: "/requests/$id/dossier", params: { id } })}
        nextLabel="Generate dossier"
      />
    </div>
  );
}
