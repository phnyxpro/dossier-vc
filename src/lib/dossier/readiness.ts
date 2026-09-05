import { DOC_TYPES, DOC_TYPE_LABEL, EXTRACTION_FIELD_LABEL } from "./constants";
import type { DocumentRow, FieldRow, RequestWithCompany } from "./types";

export type Severity = "high" | "medium" | "low" | "info";

export type Flag = { title: string; detail: string; severity: Severity };

export type Snapshot = {
  annual_revenue: number | null;
  gross_profit: number | null;
  ebitda: number | null;
  net_profit: number | null;
  cash_balance: number | null;
  existing_debt: number | null;
  debt_service: number | null;
  receivables: number | null;
  payables: number | null;
  inventory: number | null;
  majorCustomers: string[];
  recurringObligations: string[];
};

/** Only human-confirmed values feed calculations and the dossier. */
export function buildSnapshot(fields: FieldRow[], request?: RequestWithCompany | null): Snapshot {
  const confirmed = fields.filter((f) => f.status === "confirmed");
  const num = (key: string) => {
    const row = confirmed.find((f) => f.field_key === key && f.value_number !== null);
    return row?.value_number !== undefined && row?.value_number !== null ? Number(row.value_number) : null;
  };
  const texts = (key: string) =>
    confirmed.filter((f) => f.field_key === key).map((f) => f.value_text ?? "").filter(Boolean);

  return {
    annual_revenue: num("annual_revenue") ?? (request?.companies?.annual_revenue != null ? Number(request.companies.annual_revenue) : null),
    gross_profit: num("gross_profit"),
    ebitda: num("ebitda"),
    net_profit: num("net_profit"),
    cash_balance: num("cash_balance"),
    existing_debt: num("existing_debt") ?? (request?.existing_debt != null ? Number(request.existing_debt) : null),
    debt_service: num("debt_service"),
    receivables: num("receivables"),
    payables: num("payables"),
    inventory: num("inventory"),
    majorCustomers: texts("major_customer"),
    recurringObligations: texts("recurring_obligation"),
  };
}

export type CashflowIndicator = {
  label: string;
  value: string;
  note: string;
};

export function cashflowIndicators(snap: Snapshot, currency: string): CashflowIndicator[] {
  const out: CashflowIndicator[] = [];
  const fmt = (n: number | null, digits = 2) => (n === null ? "Not available" : n.toFixed(digits));

  const margin =
    snap.annual_revenue && snap.ebitda !== null ? (snap.ebitda / snap.annual_revenue) * 100 : null;
  out.push({
    label: "Operating margin",
    value: margin === null ? "Not available" : `${margin.toFixed(1)}%`,
    note: "Operating profit as a share of revenue.",
  });

  const dscr =
    snap.ebitda !== null && snap.debt_service ? snap.ebitda / (snap.debt_service * 12) : null;
  out.push({
    label: "Indicative debt-service coverage",
    value: fmt(dscr),
    note: "Operating profit divided by annual debt service. Indicative only — a lender will recalculate.",
  });

  const leverage = snap.ebitda && snap.existing_debt !== null ? snap.existing_debt / snap.ebitda : null;
  out.push({
    label: "Debt to operating profit",
    value: fmt(leverage),
    note: "Existing debt relative to operating profit.",
  });

  const cashMonths =
    snap.cash_balance !== null && snap.annual_revenue
      ? snap.cash_balance / (snap.annual_revenue / 12)
      : null;
  out.push({
    label: "Cash cover",
    value: cashMonths === null ? "Not available" : `${cashMonths.toFixed(1)} months of revenue`,
    note: `Cash balance ${snap.cash_balance === null ? "not confirmed" : `${currency} ${snap.cash_balance.toLocaleString()}`}.`,
  });

  const workingCapital =
    snap.receivables !== null && snap.payables !== null ? snap.receivables - snap.payables : null;
  out.push({
    label: "Receivables less payables",
    value: workingCapital === null ? "Not available" : `${currency} ${workingCapital.toLocaleString()}`,
    note: "Simple working-capital position from confirmed ageing data.",
  });

  return out;
}

export function missingDocuments(documents: DocumentRow[]) {
  const received = new Set(
    documents.filter((d) => d.status === "received").map((d) => d.doc_type),
  );
  return DOC_TYPES.filter((t) => !received.has(t.key));
}

export function documentReadiness(documents: DocumentRow[]) {
  const satisfied = new Set(documents.filter((d) => d.status === "received").map((d) => d.doc_type)).size;
  const needsReview = documents.filter((d) => d.status === "needs_review").length;
  const total = DOC_TYPES.length;
  return {
    satisfied,
    needsReview,
    missing: total - satisfied,
    total,
    percent: Math.round((satisfied / total) * 100),
  };
}

export function riskFlags(
  request: RequestWithCompany,
  documents: DocumentRow[],
  fields: FieldRow[],
  snap: Snapshot,
): Flag[] {
  const flags: Flag[] = [];
  const docs = documentReadiness(documents);
  const pending = fields.filter((f) => f.status === "pending").length;

  if (docs.missing > 0) {
    flags.push({
      title: `${docs.missing} required document ${docs.missing === 1 ? "type is" : "types are"} outstanding`,
      detail: `A capital provider will normally ask for all ten evidence types before assessment. Outstanding: ${missingDocuments(documents)
        .map((d) => d.label)
        .join(", ")}.`,
      severity: docs.missing > 5 ? "high" : "medium",
    });
  }
  if (pending > 0) {
    flags.push({
      title: `${pending} extracted ${pending === 1 ? "value has" : "values have"} not been confirmed`,
      detail: "Unconfirmed values are excluded from every figure shown in this dossier.",
      severity: "medium",
    });
  }
  if (snap.annual_revenue === null) {
    flags.push({
      title: "No confirmed revenue figure",
      detail: "Revenue underpins nearly every lender calculation. Confirm it from a financial statement.",
      severity: "high",
    });
  }
  if (snap.ebitda === null) {
    flags.push({
      title: "No confirmed operating profit / EBITDA",
      detail: "Repayment capacity cannot be indicated without an earnings figure.",
      severity: "high",
    });
  }
  if (snap.debt_service === null && (snap.existing_debt ?? 0) > 0) {
    flags.push({
      title: "Existing debt recorded without a confirmed debt-service amount",
      detail: "Provide the monthly repayment on existing facilities so coverage can be shown.",
      severity: "medium",
    });
  }
  if (snap.annual_revenue && request.amount_sought && Number(request.amount_sought) > snap.annual_revenue) {
    flags.push({
      title: "Amount sought exceeds confirmed annual revenue",
      detail: "Requests above annual turnover usually need a stronger security and repayment narrative.",
      severity: "medium",
    });
  }
  if (!request.security_description) {
    flags.push({
      title: "No proposed security or collateral recorded",
      detail: "Most Caribbean lenders expect a stated security position for debt requests.",
      severity: "medium",
    });
  }
  if (!request.repayment_explanation) {
    flags.push({
      title: "Repayment explanation is incomplete",
      detail: "Describe, in cash terms, how the facility will be serviced.",
      severity: "medium",
    });
  }
  if (snap.majorCustomers.length === 1) {
    flags.push({
      title: "Customer concentration",
      detail: `Only one major customer is on record (${snap.majorCustomers[0]}). Concentration is a common lender concern.`,
      severity: "low",
    });
  }
  if (!flags.length) {
    flags.push({
      title: "No structural gaps detected",
      detail: "All required evidence types are on file and key figures are confirmed.",
      severity: "info",
    });
  }
  return flags;
}

export function lenderQuestions(
  request: RequestWithCompany,
  snap: Snapshot,
  documents: DocumentRow[],
): string[] {
  const q: string[] = [
    `What specifically will the ${request.currency} ${Number(request.amount_sought ?? 0).toLocaleString()} be spent on, and over what period?`,
    "How were the revenue and earnings figures in this pack prepared, and by whom?",
    "What happens to repayment capacity if revenue falls by 20%?",
  ];
  if (snap.majorCustomers.length) {
    q.push(`How much of revenue comes from ${snap.majorCustomers.slice(0, 3).join(", ")}, and are those contracts committed?`);
  } else {
    q.push("Who are the largest customers and what share of revenue do they represent?");
  }
  if ((snap.existing_debt ?? 0) > 0) {
    q.push("What are the terms, security and covenants on existing facilities?");
  }
  if (request.security_description) {
    q.push("When were the proposed security assets last valued, and by whom?");
  } else {
    q.push("What security can be offered against this facility?");
  }
  const missing = missingDocuments(documents);
  if (missing.length) {
    q.push(`When can the outstanding evidence be provided (${missing.slice(0, 3).map((m) => m.label).join(", ")}${missing.length > 3 ? ", …" : ""})?`);
  }
  q.push("Are all statutory filings and tax obligations current?");
  return q;
}

export function nextSteps(
  documents: DocumentRow[],
  fields: FieldRow[],
  snap: Snapshot,
): string[] {
  const steps: string[] = [];
  const missing = missingDocuments(documents);
  const pending = fields.filter((f) => f.status === "pending");
  if (missing.length) {
    steps.push(`Collect and upload the ${missing.length} outstanding document ${missing.length === 1 ? "type" : "types"}: ${missing.map((m) => m.label).join(", ")}.`);
  }
  if (pending.length) {
    steps.push(`Review and confirm ${pending.length} extracted ${pending.length === 1 ? "value" : "values"} on the AI Extraction screen (${[...new Set(pending.map((p) => EXTRACTION_FIELD_LABEL[p.field_key] ?? p.field_label))].slice(0, 4).join(", ")}).`);
  }
  if (snap.ebitda === null || snap.annual_revenue === null) {
    steps.push("Confirm revenue and operating profit so repayment capacity can be presented.");
  }
  if (snap.debt_service === null) {
    steps.push("Record the monthly debt service on existing facilities.");
  }
  steps.push("Prepare a short written explanation of any year-on-year movement in revenue or margin.");
  steps.push("Share the generated dossier with your preferred capital provider and keep the evidence pack ready for their diligence questions.");
  return steps;
}

export function readinessScore(documents: DocumentRow[], fields: FieldRow[], request: RequestWithCompany) {
  const docs = documentReadiness(documents);
  const confirmed = fields.filter((f) => f.status === "confirmed").length;
  const dataScore = Math.min(confirmed / 6, 1) * 40;
  const docScore = (docs.satisfied / docs.total) * 40;
  const narrativeParts = [request.purpose, request.repayment_primary, request.repayment_explanation, request.security_description];
  const narrativeScore = (narrativeParts.filter(Boolean).length / narrativeParts.length) * 20;
  return Math.round(dataScore + docScore + narrativeScore);
}

export function readinessLabel(score: number) {
  if (score >= 85) return { label: "Ready", tone: "success" as const };
  if (score >= 45) return { label: "In progress", tone: "warning" as const };
  if (score > 0) return { label: "Early", tone: "muted" as const };
  return { label: "Not started", tone: "muted" as const };
}

export { DOC_TYPE_LABEL };
