export type DocStatus = "received" | "missing" | "needs_review";

export const DOC_TYPES = [
  { key: "financial_statements", label: "Financial statements", hint: "Audited or reviewed, last 2-3 years" },
  { key: "management_accounts", label: "Management accounts", hint: "Most recent interim period" },
  { key: "bank_statements", label: "Bank statements", hint: "Last 6-12 months, all operating accounts" },
  { key: "ar_ageing", label: "Accounts receivable ageing", hint: "Current ageing by customer" },
  { key: "ap_ageing", label: "Accounts payable ageing", hint: "Current ageing by supplier" },
  { key: "contracts", label: "Contracts", hint: "Signed customer or supply agreements" },
  { key: "invoices", label: "Invoices", hint: "Recent representative invoices" },
  { key: "tax_documents", label: "Tax documents", hint: "Filings, clearance or compliance certificates" },
  { key: "business_registration", label: "Business registration documents", hint: "Certificate of incorporation, VAT/BIR" },
  { key: "collateral_documents", label: "Collateral or security documents", hint: "Valuations, titles, asset schedules" },
] as const;

export type DocTypeKey = (typeof DOC_TYPES)[number]["key"];

export const DOC_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  DOC_TYPES.map((d) => [d.key, d.label]),
);

export const REQUEST_TYPES = [
  { key: "debt", label: "Debt Financing", hint: "Banks, credit unions, DFIs, private lenders" },
  { key: "equity", label: "Equity Financing", hint: "Equity investors, strategic investors, family offices" },
  { key: "acquisition", label: "Acquisition / Strategic Transaction", hint: "M&A, buyouts, strategic investments" },
  { key: "project", label: "Project Finance", hint: "Infrastructure, energy, development projects" },
  { key: "hybrid", label: "Hybrid / Structured Capital", hint: "Convertible, mezzanine, preferred equity" },
  { key: "grant", label: "Grant / Blended Finance", hint: "Development grants, blended-finance providers" },
] as const;

export const REQUEST_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  REQUEST_TYPES.map((r) => [r.key, r.label]),
);

export const DEBT_SUBTYPES = [
  "Asset / Equipment Finance",
  "Working Capital Facility",
  "Term Loan",
  "Trade Finance",
  "Invoice Discounting",
  "Overdraft",
  "Other",
];

export const CURRENCIES = ["TTD", "USD", "BBD", "JMD", "XCD", "GYD", "EUR", "GBP"];

export const COUNTRIES = [
  "Trinidad and Tobago",
  "Barbados",
  "Jamaica",
  "Guyana",
  "Saint Lucia",
  "Grenada",
  "Antigua and Barbuda",
  "Saint Vincent and the Grenadines",
  "Dominica",
  "Saint Kitts and Nevis",
  "Belize",
  "Suriname",
  "The Bahamas",
  "Other",
];

/** Financial fields Dossier tries to read out of uploaded documents. */
export const EXTRACTION_FIELDS = [
  { key: "annual_revenue", label: "Annual revenue", numeric: true },
  { key: "gross_profit", label: "Gross profit", numeric: true },
  { key: "ebitda", label: "EBITDA / operating profit", numeric: true },
  { key: "net_profit", label: "Net profit", numeric: true },
  { key: "cash_balance", label: "Cash balance", numeric: true },
  { key: "existing_debt", label: "Existing debt", numeric: true },
  { key: "debt_service", label: "Monthly debt service", numeric: true },
  { key: "receivables", label: "Accounts receivable", numeric: true },
  { key: "payables", label: "Accounts payable", numeric: true },
  { key: "inventory", label: "Inventory", numeric: true },
  { key: "major_customer", label: "Major customer", numeric: false },
  { key: "recurring_obligation", label: "Recurring obligation", numeric: false },
] as const;

export const EXTRACTION_FIELD_LABEL: Record<string, string> = Object.fromEntries(
  EXTRACTION_FIELDS.map((f) => [f.key, f.label]),
);

export const WIZARD_STEPS = [
  { slug: "", label: "Company Profile" },
  { slug: "details", label: "Capital Details" },
  { slug: "repayment", label: "Repayment & Security" },
  { slug: "documents", label: "Document Upload" },
  { slug: "extraction", label: "AI Extraction" },
  { slug: "readiness", label: "Readiness Review" },
  { slug: "dossier", label: "Dossier Output" },
] as const;
