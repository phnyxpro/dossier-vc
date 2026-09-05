# Dossier by Ventureble — Capital Readiness Workspace

A responsive web app that helps Caribbean MSMEs organise a financing request, upload supporting documents, have AI read those documents, review readiness gaps, and produce a lender-ready dossier.

## What gets built

**Accounts and saved work**
Real sign-up and sign-in (email and password). Every company, request, document and extracted figure is stored securely and only visible to the account that created it. Files are kept in private storage.

**1. Dashboard (Capital Overview)**
Totals for capital sought, active requests and requests ready for submission, plus a table of all financing requests with type, amount, term, status, readiness and last-updated date. Buttons for a new request, and a one-click load/remove of the Caribbean Tropical Producers Ltd. sample data in TTD.

**2. New Financing Request**
A seven-step guided flow with autosaving drafts: Company Profile → Capital Details → Repayment & Security → Document Upload → AI Extraction → Review → Dossier Output. Collects company name, country, industry, years in operation, revenue, amount sought, currency, purpose, desired term, existing debt, proposed security and repayment explanation.

**3. Documents**
Upload real files (PDF, images, spreadsheets, Word) against a required checklist: financial statements, management accounts, bank statements, AR and AP ageing, contracts, invoices, tax documents, business registration and collateral documents. Each item shows Received, Missing or Needs Review, with a document-readiness percentage, search and filters.

**4. AI Extraction Review**
Uploaded documents are actually read by AI. Extracted values — revenue, EBITDA or operating profit, cash balance, existing debt, receivables, major customers and recurring obligations — appear in a table with the source document, a confidence indicator and a status. Nothing is used in calculations or the dossier until a person confirms it; every field can be corrected, confirmed or discarded, and fields can be added manually.

**5. Capital Readiness Review**
A structured review: financial snapshot, use of funds, repayment support, cash-flow indicators, existing debt, security or collateral, missing documents, key risk flags, likely lender questions and recommended next steps. No credit decision, score or approval is ever produced — the wording makes that explicit.

**6. Dossier Output**
A printable, lender-ready document preview with borrower profile, financing request, use of funds, business overview, financial snapshot, repayment support, cash-flow indicators, existing debt, security summary, key risks, missing information, lender questions and next steps. Print and Export buttons; export produces a downloadable file.

**7. Capital Provider Review**
A concise read-only view for a lender: amount requested, purpose, financial snapshot, repayment support, risk flags, missing documents and key questions.

**Design**
Dark navy base with restrained teal and warm gold accents, strong typography, clean cards and dense data tables. Prominent "DOSSIER / by Ventureble" mark, simple left navigation following the workflow order, and a working light/dark toggle. Fully responsive down to mobile.

## Technical notes

- TanStack Start app; Lovable Cloud for auth, database and private file storage.
- Tables: `profiles`, `companies`, `capital_requests`, `documents`, `extracted_fields`, `readiness_notes` — all row-level-secured to the owning user, with explicit grants. Sample data is inserted per user on demand, not shared.
- Documents go to a private storage bucket; signed URLs only.
- Extraction runs in a server function calling the Lovable AI gateway (multimodal: PDFs and images sent inline, spreadsheets/Word parsed to text first), returning structured fields with per-field source and confidence. Long runs are streamed; gateway errors (rate limit, credits) surface clearly in the UI.
- Extracted fields carry a `confirmed` flag; readiness and dossier calculations read confirmed values only.
- Export renders the dossier to a downloadable file client-side.

## Out of scope for this version

Team collaboration, lender-side accounts, e-signatures, real bank integrations, and any automated credit scoring or approval.
