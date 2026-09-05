export type DossierSectionDef = {
  key: string;
  title: string;
  order: number;
  /** Included in the condensed lender pack (the default view). */
  pack: boolean;
  /** Forward-looking / indicative content that must carry the indicative disclaimer. */
  indicative: boolean;
};

export const INDICATIVE_NOTE =
  "Indicative only — prepared to support discussion. It is not a credit approval, loan recommendation or investment decision.";

export const DOSSIER_SECTIONS: DossierSectionDef[] = [
  { key: "executive_summary", title: "Executive Summary", order: 1, pack: true, indicative: false },
  { key: "funding_thesis", title: "Funding Thesis", order: 2, pack: true, indicative: true },
  { key: "business_overview", title: "Business Overview", order: 3, pack: true, indicative: false },
  { key: "market_context", title: "Industry and Market Context", order: 4, pack: false, indicative: false },
  { key: "financial_performance", title: "Financial Performance", order: 5, pack: true, indicative: false },
  { key: "use_of_funds", title: "Use of Funds", order: 6, pack: true, indicative: false },
  { key: "repayment_analysis", title: "Repayment and Debt Service Analysis", order: 7, pack: true, indicative: false },
  { key: "cash_flow", title: "Cash Flow Characteristics", order: 8, pack: false, indicative: false },
  { key: "existing_debt", title: "Existing Debt and Obligations", order: 9, pack: false, indicative: false },
  { key: "collateral_package", title: "Security and Collateral Package", order: 10, pack: true, indicative: false },
  { key: "indicative_structure", title: "Indicative Financing Structure", order: 11, pack: false, indicative: true },
  { key: "valuation_context", title: "Indicative Valuation Context", order: 12, pack: false, indicative: true },
  { key: "risks_mitigants", title: "Risk Assessment and Mitigants", order: 13, pack: true, indicative: false },
  { key: "missing_information", title: "Missing Information and Evidence Gaps", order: 14, pack: true, indicative: false },
  { key: "lender_questions", title: "Questions a Capital Provider Is Likely to Ask", order: 15, pack: true, indicative: false },
  { key: "next_steps", title: "Recommended Next Steps", order: 16, pack: true, indicative: false },
];

export const DOSSIER_SECTION_MAP = new Map(DOSSIER_SECTIONS.map((s) => [s.key, s]));
