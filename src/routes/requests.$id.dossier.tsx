import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Printer, Share2 } from "lucide-react";
import { Badge, Button, Card, SectionTitle, Spinner } from "@/components/ui/primitives";
import { useDocuments, useFields, useRequest, useSaveRequest } from "@/lib/dossier/queries";
import {
  buildSnapshot,
  cashflowIndicators,
  documentReadiness,
  lenderQuestions,
  missingDocuments,
  nextSteps,
  readinessScore,
  riskFlags,
} from "@/lib/dossier/readiness";
import { formatDate, formatMoney } from "@/lib/dossier/format";
import { REQUEST_TYPE_LABEL } from "@/lib/dossier/constants";

export const Route = createFileRoute("/requests/$id/dossier")({
  head: () => ({
    meta: [
      { title: "Dossier Output — Dossier by Ventureble" },
      {
        name: "description",
        content:
          "A lender-ready financing dossier: borrower profile, request, use of funds, financial snapshot, risks, gaps and next steps.",
      },
      { property: "og:title", content: "Dossier Output — Dossier by Ventureble" },
      { property: "og:description", content: "Export a professional financing dossier for banks, credit unions and DFIs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DossierStep,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-paper-border px-8 py-6 first:border-t-0">
      <h3 className="mb-3 font-display text-xs font-bold uppercase tracking-[0.16em] text-paper-foreground/60">
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-paper-foreground">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-paper-border/60 py-2 last:border-0">
      <span className="text-paper-foreground/60">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

function DossierStep() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: request } = useRequest(id);
  const { data: documents } = useDocuments(id);
  const { data: fields } = useFields(id);
  const save = useSaveRequest(id);
  const [exported, setExported] = useState(false);

  if (!request || !documents || !fields) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Spinner />
      </div>
    );
  }

  const currency = request.currency;
  const snap = buildSnapshot(fields, request);
  const indicators = cashflowIndicators(snap, currency);
  const flags = riskFlags(request, documents, fields, snap);
  const questions = lenderQuestions(request, snap, documents);
  const steps = nextSteps(documents, fields, snap);
  const missing = missingDocuments(documents);
  const docs = documentReadiness(documents);
  const score = readinessScore(documents, fields, request);
  const company = request.companies;

  function handleExport() {
    const lines: string[] = [];
    const push = (s = "") => lines.push(s);
    push("DOSSIER by Ventureble — Financing Dossier");
    push(`Reference: ${request!.reference}`);
    push(`Prepared: ${new Date().toLocaleDateString("en-GB")}`);
    push("");
    push("BORROWER PROFILE");
    push(`Business: ${company?.name ?? "—"}`);
    push(`Country: ${company?.country ?? "—"}`);
    push(`Industry: ${company?.industry ?? "—"}`);
    push(`Years in operation: ${company?.years_in_operation ?? "—"}`);
    push("");
    push("FINANCING REQUEST");
    push(`Type: ${REQUEST_TYPE_LABEL[request!.request_type] ?? request!.request_type}`);
    push(`Amount sought: ${formatMoney(Number(request!.amount_sought ?? 0), currency)}`);
    push(`Term: ${request!.term_value ?? "—"} ${request!.term_unit ?? ""}`);
    push(`Purpose: ${request!.purpose ?? "—"}`);
    push("");
    push("USE OF FUNDS");
    push(request!.use_of_funds ?? "Not provided");
    push("");
    push("BUSINESS OVERVIEW");
    push(request!.business_overview ?? "Not provided");
    push("");
    push("FINANCIAL SNAPSHOT (confirmed values only)");
    push(`Annual revenue: ${formatMoney(snap.annual_revenue, currency)}`);
    push(`Gross profit: ${formatMoney(snap.gross_profit, currency)}`);
    push(`EBITDA / operating profit: ${formatMoney(snap.ebitda, currency)}`);
    push(`Net profit: ${formatMoney(snap.net_profit, currency)}`);
    push(`Cash balance: ${formatMoney(snap.cash_balance, currency)}`);
    push(`Receivables: ${formatMoney(snap.receivables, currency)}`);
    push(`Payables: ${formatMoney(snap.payables, currency)}`);
    push("");
    push("REPAYMENT SUPPORT");
    push(`Primary: ${request!.repayment_primary ?? "—"}`);
    push(`Secondary: ${request!.repayment_secondary ?? "—"}`);
    push(request!.repayment_explanation ?? "");
    push("");
    push("CASH-FLOW INDICATORS (indicative)");
    indicators.forEach((i) => push(`${i.label}: ${i.value}`));
    push("");
    push("EXISTING DEBT AND SECURITY");
    push(`Existing debt: ${formatMoney(snap.existing_debt, currency)}`);
    push(`Monthly debt service: ${formatMoney(snap.debt_service, currency)}`);
    push(`Security: ${request!.security_description ?? "—"}`);
    push("");
    push("KEY RISKS");
    flags.forEach((f) => push(`- [${f.severity}] ${f.title}: ${f.detail}`));
    push("");
    push("MISSING INFORMATION");
    missing.forEach((m) => push(`- ${m.label}`));
    push("");
    push("LENDER QUESTIONS");
    questions.forEach((q, i) => push(`${i + 1}. ${q}`));
    push("");
    push("RECOMMENDED NEXT STEPS");
    steps.forEach((s, i) => push(`${i + 1}. ${s}`));
    push("");
    push("Dossier organises information provided by the business. It is not a credit approval, loan recommendation or investment decision.");

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${request!.reference ?? "financing"}-dossier.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
  }

  return (
    <div>
      <SectionTitle
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button variant="outline" onClick={() => save.mutate({ status: "ready", readiness_status: score >= 85 ? "ready" : "in_progress" })}>
              <Share2 className="size-4" /> Mark as ready to share
            </Button>
            <Button variant="accent" onClick={handleExport}>
              <Download className="size-4" /> Export dossier
            </Button>
          </div>
        }
      >
        Dossier output
      </SectionTitle>

      {exported ? (
        <p className="mb-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Dossier exported. The file has been downloaded to your device.
        </p>
      ) : null}

      <div className="mx-auto max-w-4xl overflow-hidden rounded-lg border border-paper-border bg-paper text-paper-foreground shadow-lift">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-paper-foreground/80 px-8 py-7">
          <div>
            <p className="font-display text-lg font-bold tracking-tight">DOSSIER</p>
            <p className="text-[0.6rem] uppercase tracking-[0.22em] text-paper-foreground/60">by Ventureble</p>
            <h2 className="mt-5 font-display text-2xl font-semibold">{company?.name}</h2>
            <p className="text-sm text-paper-foreground/70">
              {company?.industry} · {company?.country}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono text-xs text-paper-foreground/60">{request.reference}</p>
            <p className="mt-3 text-xs uppercase tracking-widest text-paper-foreground/60">Amount sought</p>
            <p className="font-display text-2xl font-semibold tabular-nums">
              {formatMoney(Number(request.amount_sought ?? 0), currency)}
            </p>
            <p className="mt-1 text-xs text-paper-foreground/60">
              {REQUEST_TYPE_LABEL[request.request_type]} · {request.term_value ?? "—"} {request.term_unit}
            </p>
            <p className="mt-3 text-xs text-paper-foreground/60">Prepared {formatDate(new Date().toISOString())}</p>
          </div>
        </header>

        <Section title="Borrower profile">
          <div className="grid gap-x-10 sm:grid-cols-2">
            <Row label="Registered name" value={company?.name ?? "—"} />
            <Row label="Country" value={company?.country ?? "—"} />
            <Row label="Industry" value={company?.industry ?? "—"} />
            <Row label="Years in operation" value={company?.years_in_operation ?? "—"} />
            <Row label="Reporting currency" value={currency} />
            <Row label="Evidence pack" value={`${docs.satisfied} of ${docs.total} document types on file`} />
          </div>
        </Section>

        <Section title="Financing request">
          <div className="grid gap-x-10 sm:grid-cols-2">
            <Row label="Type of capital" value={REQUEST_TYPE_LABEL[request.request_type] ?? request.request_type} />
            <Row label="Facility type" value={request.financing_subtype ?? "—"} />
            <Row label="Amount sought" value={formatMoney(Number(request.amount_sought ?? 0), currency)} />
            <Row label="Desired term" value={`${request.term_value ?? "—"} ${request.term_unit ?? ""}`} />
          </div>
          <p className="mt-4">{request.purpose || "Purpose not provided."}</p>
        </Section>

        <Section title="Use of funds">
          <p className="whitespace-pre-line">{request.use_of_funds || "No line-by-line breakdown provided."}</p>
        </Section>

        <Section title="Business overview">
          <p>{request.business_overview || "No business overview provided."}</p>
        </Section>

        <Section title="Financial snapshot">
          <p className="mb-3 text-xs text-paper-foreground/60">
            Figures below are drawn from the business's own documents and confirmed by the business.
          </p>
          <div className="grid gap-x-10 sm:grid-cols-2">
            <Row label="Annual revenue" value={formatMoney(snap.annual_revenue, currency)} />
            <Row label="Gross profit" value={formatMoney(snap.gross_profit, currency)} />
            <Row label="EBITDA / operating profit" value={formatMoney(snap.ebitda, currency)} />
            <Row label="Net profit" value={formatMoney(snap.net_profit, currency)} />
            <Row label="Cash balance" value={formatMoney(snap.cash_balance, currency)} />
            <Row label="Inventory" value={formatMoney(snap.inventory, currency)} />
            <Row label="Accounts receivable" value={formatMoney(snap.receivables, currency)} />
            <Row label="Accounts payable" value={formatMoney(snap.payables, currency)} />
          </div>
        </Section>

        <Section title="Repayment support">
          <div className="grid gap-x-10 sm:grid-cols-2">
            <Row label="Primary source" value={request.repayment_primary ?? "—"} />
            <Row label="Secondary source" value={request.repayment_secondary ?? "—"} />
          </div>
          <p className="mt-4">{request.repayment_explanation || "No repayment explanation provided."}</p>
        </Section>

        <Section title="Cash-flow indicators">
          <div className="grid gap-x-10 sm:grid-cols-2">
            {indicators.map((i) => (
              <Row key={i.label} label={i.label} value={i.value} />
            ))}
          </div>
          <p className="mt-3 text-xs text-paper-foreground/60">
            Indicative measures prepared from confirmed figures. A capital provider will recalculate on
            their own basis.
          </p>
        </Section>

        <Section title="Existing debt and security">
          <div className="grid gap-x-10 sm:grid-cols-2">
            <Row label="Existing debt outstanding" value={formatMoney(snap.existing_debt, currency)} />
            <Row label="Monthly debt service" value={formatMoney(snap.debt_service, currency)} />
          </div>
          <p className="mt-4">{request.security_description || "No security position recorded."}</p>
          {snap.recurringObligations.length ? (
            <ul className="mt-3 list-disc pl-5">
              {snap.recurringObligations.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          ) : null}
        </Section>

        <Section title="Key risks">
          <ul className="space-y-2">
            {flags.map((f) => (
              <li key={f.title}>
                <span className="font-semibold">{f.title}.</span> {f.detail}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Missing information">
          {missing.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {missing.map((m) => (
                <li key={m.key}>{m.label}</li>
              ))}
            </ul>
          ) : (
            <p>All required evidence types are on file.</p>
          )}
        </Section>

        <Section title="Questions a lender is likely to ask">
          <ol className="list-decimal space-y-1 pl-5">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </Section>

        <Section title="Recommended next steps">
          <ol className="list-decimal space-y-1 pl-5">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Section>

        <footer className="border-t border-paper-border bg-paper-foreground/[0.03] px-8 py-5 text-xs text-paper-foreground/60">
          Prepared with DOSSIER by Ventureble. This dossier organises information provided by the
          business and read from its own documents. It is not a credit approval, loan recommendation
          or investment decision. Figures are unaudited unless the supporting document states
          otherwise.
        </footer>
      </div>

      <Card className="mx-auto mt-6 max-w-4xl p-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Readiness {score}% · {fields.filter((f) => f.status === "confirmed").length} confirmed data points ·{" "}
            {docs.satisfied}/{docs.total} documents
          </span>
          <Badge tone={request.status === "ready" ? "success" : "muted"}>
            {request.status === "ready" ? "Ready to share" : "Draft"}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
