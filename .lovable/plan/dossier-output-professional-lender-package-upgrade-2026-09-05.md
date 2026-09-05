# Dossier Output — Professional Lender Package Upgrade

Rebuild the Dossier Output step so a completed request produces a professional financing package in the style of the uploaded samples (Importeck / CWL proposals), generated from the request's confirmed data.

## Decisions (confirmed by user)
- Two formats: a condensed lender pack (~4–6 pages) plus an expanded full package.
- AI drafts every narrative section from confirmed figures only; user can edit any paragraph before export.
- Indicative sections allowed (funding thesis, indicative valuation context, term-sheet-style financing structure) — each clearly labelled "indicative — not a credit decision or recommendation", and the standing no-credit-decision disclaimer stays.

## What gets built

### 1. Data model
New table `dossier_sections`:
- `id`, `user_id`, `request_id`, `section_key` (cover, toc, executive_summary, funding_thesis, business_overview, market_context, financial_performance, use_of_funds, repayment_analysis, cash_flow, existing_debt, collateral_package, indicative_structure, valuation_context, risks_mitigants, missing_information, lender_questions, next_steps, appendices), `title`, `body` (text/markdown), `status` (draft | edited | accepted), `sort_order`, `updated_at`.
- RLS + grants per platform rules; unique (request_id, section_key).
- One-shot generate endpoint writes sections; edits update rows.

### 2. AI drafting — `src/lib/dossier/dossier.functions.ts`
`generateDossier(requestId)` server function:
- Loads request + company + documents + confirmed extracted fields only.
- Builds a fact pack (all confirmed figures with period/source) and section-by-section prompts.
- One gateway call returning JSON: `{ sections: [{section_key, title, body}] }` using `google/gemini-3.7-flash`, temperature-free, with explicit instructions: no invented figures, cite amounts in TTD, indicative sections carry disclaimers, never state a credit decision.
- Upserts sections as `draft`; preserves sections the user already edited (`status != draft` untouched unless "Regenerate" is forced).

### 3. Dossier Output page — two formats
Rework `src/routes/requests.$id.dossier.tsx`:
- **Lender Pack (default view)**: condensed professional document — cover block, executive summary, financial snapshot table, use of funds, repayment & cash-flow indicators, collateral, risks & mitigants table, missing information, lender questions, next steps. Styled like the samples: serif headings, thin rules, numbered sections.
- **Full Package view**: all sections in order with cover page, table of contents, numbered sections and appendix (documents register + confirmed figures with sources). Section navigation sidebar.
- Every narrative section is editable inline (textarea on click / Edit button), saving to `dossier_sections` and flipping status to `edited`; per-section Regenerate.
- "Generate dossier" button runs the AI draft; progress state; error surfaces gateway message.

### 4. Export
- Print stylesheet: full package prints like the sample PDFs (cover page, TOC, section pages).
- Export buttons: lender pack as `.docx` and full package as `.docx` (server function building with docx library via dynamic import; fallback `.txt` kept). Simulated print-to-PDF via browser print stays.

### 5. Capital Provider view
`src/routes/provider.$id.tsx` upgraded to read the same generated sections: condensed pack with risk/mitigant table and lender questions.

## Verification
- `npx tsgo --noEmit` clean; build OK.
- Playwright end-to-end with sample data: generate → edit a section → both views render → export downloads.

## Out of scope (unchanged)
No actual credit approval or automated decision; no external API connections; Google sign-in still needs user's own credentials.
