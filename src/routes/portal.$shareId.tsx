import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, EyeOff, Lock, Save, Send } from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import {
  Badge,
  Button,
  Card,
  Field,
  SectionTitle,
  Spinner,
  Stat,
  Textarea,
} from "@/components/ui/primitives";
import { MicTextarea } from "@/components/mic-textarea";
import { portalDossier, saveProviderReview } from "@/lib/portal/portal.functions";
import {
  REVIEW_STATUSES,
  REVIEW_STATUS_LABEL,
  REVIEW_STATUS_TONE,
  SCORE_CRITERIA,
  SCORE_LABEL,
  type ReviewStatus,
  type ScoreKey,
} from "@/lib/portal/constants";
import { DOC_TYPES, DOC_TYPE_LABEL, REQUEST_TYPE_LABEL } from "@/lib/dossier/constants";
import { formatDate, formatMoney } from "@/lib/dossier/format";
import {
  buildSnapshot,
  cashflowIndicators,
  documentReadiness,
  lenderQuestions,
  missingDocuments,
  riskFlags,
} from "@/lib/dossier/readiness";
import { INDICATIVE_NOTE } from "@/lib/dossier/sections";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portal/$shareId")({
  head: () => ({
    meta: [
      { title: "Review a dossier — Capital Provider Portal" },
      {
        name: "description",
        content:
          "Read a shared Caribbean financing dossier — amount, purpose, financial snapshot, risks, gaps and evidence — then submit a lender review.",
      },
      { property: "og:title", content: "Review a dossier — Capital Provider Portal" },
      {
        property: "og:description",
        content: "Everything a credit officer needs, plus a structured review to send back.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PortalShell>
      <ReviewPage />
    </PortalShell>
  ),
});

const SEVERITY_TONE = { high: "danger", medium: "warning", low: "primary", info: "success" } as const;

function Prose({ text }: { text: string }) {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => l.startsWith("- "));
  const paragraphs = lines.filter((l) => !l.startsWith("- "));
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {bullets.length ? (
        <ul className="list-disc space-y-1 pl-5">
          {bullets.map((b, i) => (
            <li key={i}>{b.slice(2)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ReviewPage() {
  const { shareId } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(portalDossier);
  const save = useServerFn(saveProviderReview);

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-dossier", shareId],
    queryFn: () => load({ data: { shareId } }),
    retry: false,
  });

  const [status, setStatus] = useState<ReviewStatus>("reviewing");
  const [notes, setNotes] = useState("");
  const [requested, setRequested] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<ScoreKey, number | null>>({
    financials: null,
    security: null,
    management: null,
    documentation: null,
  });
  const [privateComment, setPrivateComment] = useState("");
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    if (data.review) {
      setStatus((data.review.status as ReviewStatus) ?? "reviewing");
      setNotes(data.review.notes ?? "");
      setRequested(data.review.requested_docs ?? []);
    }
    if (data.scores) {
      setScores({
        financials: data.scores.financials,
        security: data.scores.security,
        management: data.scores.management,
        documentation: data.scores.documentation,
      });
      setPrivateComment(data.scores.private_comment ?? "");
    }
  }, [data]);

  const derived = useMemo(() => {
    if (!data?.request) return null;
    const request = data.request;
    const snap = buildSnapshot(data.fields, request);
    return {
      request,
      snap,
      indicators: cashflowIndicators(snap, request.currency),
      flags: riskFlags(request, data.documents, data.fields, snap).filter((f) => f.severity !== "info"),
      questions: lenderQuestions(request, snap, data.documents).slice(0, 6),
      missing: missingDocuments(data.documents),
      docs: documentReadiness(data.documents),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Spinner />
      </div>
    );
  }

  if (error || !data?.request || !derived) {
    return (
      <Card className="p-8 text-center">
        <h1 className="font-display text-xl font-semibold">This dossier is not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The share may have been withdrawn by the business, or it was never assigned to your account.
        </p>
        <Link to="/portal" className="mt-5 inline-block">
          <Button variant="outline">Back to your queue</Button>
        </Link>
      </Card>
    );
  }

  const { request, snap, indicators, flags, questions, missing, docs } = derived;
  const currency = request.currency;
  const company = request.companies;
  const summary = data.sections.find((s) => s.section_key === "executive_summary");
  const thesis = data.sections.find((s) => s.section_key === "funding_thesis");
  const risksSection = data.sections.find((s) => s.section_key === "risks_mitigants");

  async function persist(submit: boolean) {
    setBusy(submit ? "submit" : "save");
    setSaveError(null);
    setSaved(null);
    try {
      await save({
        data: {
          shareId,
          status,
          notes,
          requestedDocs: requested,
          submit,
          scores: { ...scores, private_comment: privateComment },
        },
      });
      setSaved(submit ? "Review sent to the business." : "Draft saved.");
      await qc.invalidateQueries({ queryKey: ["portal-dossier", shareId] });
      await qc.invalidateQueries({ queryKey: ["provider-queue"] });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "The review could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Link
        to="/portal"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to your queue
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-accent">Shared financing dossier · {data.shareCode}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">{company?.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[company?.industry, company?.country, company?.years_in_operation ? `${company.years_in_operation} years trading` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {data.review?.submitted_at ? (
          <Badge tone={REVIEW_STATUS_TONE[data.review.status] ?? "primary"}>
            {REVIEW_STATUS_LABEL[data.review.status] ?? data.review.status} · sent{" "}
            {formatDate(data.review.submitted_at)}
          </Badge>
        ) : (
          <Badge tone="primary">Read-only lender view</Badge>
        )}
      </div>

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
        <div className="space-y-6 lg:col-span-2">
          {summary ? (
            <Card className="p-6">
              <h2 className="mb-3 font-display text-lg font-semibold">Executive summary</h2>
              <Prose text={summary.body} />
            </Card>
          ) : null}

          {thesis ? (
            <Card className="p-6">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold">Funding thesis</h2>
                <Badge tone="accent">Indicative</Badge>
              </div>
              <p className="mb-3 text-xs italic text-muted-foreground">{INDICATIVE_NOTE}</p>
              <Prose text={thesis.body} />
            </Card>
          ) : null}

          <Card className="p-6">
            <h2 className="font-display text-base font-semibold">Purpose and use of funds</h2>
            <p className="mt-3 text-sm text-muted-foreground">{request.purpose || "Not provided."}</p>
            {request.use_of_funds ? (
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{request.use_of_funds}</p>
            ) : null}
            <h2 className="mt-6 font-display text-base font-semibold">Repayment support</h2>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="label-caps">Primary</p>
                <p className="text-muted-foreground">{request.repayment_primary || "—"}</p>
              </div>
              <div>
                <p className="label-caps">Secondary</p>
                <p className="text-muted-foreground">{request.repayment_secondary || "—"}</p>
              </div>
            </div>
            {request.repayment_explanation ? (
              <p className="mt-3 text-sm text-muted-foreground">{request.repayment_explanation}</p>
            ) : null}
            <h2 className="mt-6 font-display text-base font-semibold">Security offered</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {request.security_description || "None recorded."}
            </p>
          </Card>

          {risksSection ? (
            <Card className="p-6">
              <h2 className="mb-3 font-display text-lg font-semibold">Risks and mitigants</h2>
              <Prose text={risksSection.body} />
            </Card>
          ) : null}

          {flags.length ? (
            <Card className="p-6">
              <SectionTitle>Flags from the readiness review</SectionTitle>
              <ul className="space-y-3">
                {flags.map((f, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <Badge tone={SEVERITY_TONE[f.severity as keyof typeof SEVERITY_TONE] ?? "muted"}>
                      {f.severity}
                    </Badge>
                    <span>
                      <span className="font-medium">{f.title}</span>
                      {f.detail ? <span className="block text-muted-foreground">{f.detail}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {questions.length ? (
            <Card className="p-6">
              <SectionTitle>Questions this file raises</SectionTitle>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </Card>
          ) : null}

          <PortalEvidence shareId={shareId} documents={data.documents} />

        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-base font-semibold">Financial snapshot</h2>
            <dl className="mt-3 divide-y divide-border text-sm">
              {(
                [
                  ["Revenue", snap.annual_revenue],
                  ["Gross profit", snap.gross_profit],
                  ["Operating profit", snap.ebitda],
                  ["Net profit", snap.net_profit],
                  ["Cash", snap.cash_balance],
                  ["Receivables", snap.receivables],
                  ["Payables", snap.payables],
                  ["Existing debt", snap.existing_debt],
                ] as [string, number][]
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between py-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium tabular-nums">{formatMoney(value, currency)}</dd>
                </div>
              ))}
            </dl>
            {indicators.length ? (
              <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                {indicators.map((ind) => (
                  <div key={ind.label} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{ind.label}</span>
                    <span className="font-medium tabular-nums">{ind.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="mt-4 text-xs italic text-muted-foreground">
              Indicative measures prepared from figures the business confirmed. Recalculate under your
              own credit policy.
            </p>
          </Card>

          <Card className="p-6" id="review">
            <SectionTitle>Your review</SectionTitle>

            <Field label="Status back to the business">
              <div className="grid gap-2">
                {REVIEW_STATUSES.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setStatus(option.key)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      status === option.key
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.hint}</span>
                  </button>
                ))}
              </div>
            </Field>

            <div className="mt-5">
              <Field label="Notes to the business" hint="Shared with the business exactly as written.">
                <MicTextarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What you have seen, what you still need, and what happens next."
                />
              </Field>
            </div>

            <div className="mt-5">
              <Field label="Documents you need" hint="Ticked items appear on the business's checklist.">
                <div className="mt-1 grid gap-1.5">
                  {DOC_TYPES.map((doc) => {
                    const checked = requested.includes(doc.key);
                    return (
                      <label
                        key={doc.key}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
                      >
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--color-primary)]"
                          checked={checked}
                          onChange={(e) =>
                            setRequested((prev) =>
                              e.target.checked ? [...prev, doc.key] : prev.filter((k) => k !== doc.key),
                            )
                          }
                        />
                        {doc.label}
                      </label>
                    );
                  })}
                </div>
              </Field>
            </div>

            {saveError ? (
              <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{saveError}</p>
            ) : null}
            {saved ? (
              <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
                <CheckCircle2 className="size-4" /> {saved}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => persist(false)} disabled={busy !== null}>
                {busy === "save" ? <Spinner /> : <Save className="size-4" />} Save draft
              </Button>
              <Button onClick={() => persist(true)} disabled={busy !== null}>
                {busy === "submit" ? <Spinner /> : <Send className="size-4" />} Send review
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-1 flex items-center gap-2">
              <Lock className="size-4 text-accent" />
              <h2 className="font-display text-base font-semibold">Private scoring</h2>
            </div>
            <p className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <EyeOff className="size-3.5" /> Visible only to your institution — never shared with the business.
            </p>
            <div className="space-y-4">
              {SCORE_CRITERIA.map((criterion) => (
                <div key={criterion.key}>
                  <p className="label-caps mb-1.5">{criterion.label}</p>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        title={SCORE_LABEL[n]}
                        onClick={() =>
                          setScores((prev) => ({ ...prev, [criterion.key]: prev[criterion.key] === n ? null : n }))
                        }
                        className={cn(
                          "h-9 flex-1 rounded-md border text-sm font-medium transition-colors",
                          scores[criterion.key] === n
                            ? "border-accent bg-accent/15 text-accent"
                            : "border-border text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {scores[criterion.key] ? (
                    <p className="mt-1 text-xs text-muted-foreground">{SCORE_LABEL[scores[criterion.key]!]}</p>
                  ) : null}
                </div>
              ))}
              <Field label="Private comment">
                <MicTextarea
                  value={privateComment}
                  onChange={(e) => setPrivateComment(e.target.value)}
                  placeholder="Internal notes for your credit file."
                  className="min-h-20"
                />
              </Field>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
