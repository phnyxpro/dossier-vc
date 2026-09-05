/**
 * Knowledge base + glossary content for Dossier by Ventureble.
 * Plain data so articles can be linked from anywhere in the product.
 */

export type Article = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  readMinutes: number;
  sections: { heading: string; paragraphs: string[]; bullets?: string[] }[];
  related?: string[];
};

export const ARTICLES: Article[] = [
  {
    slug: "types-of-capital",
    title: "Types of capital explained",
    summary:
      "Debt, equity, project finance, hybrid instruments and grants — what each one costs you, who provides it in the Caribbean, and when it fits.",
    category: "Raising capital",
    readMinutes: 6,
    sections: [
      {
        heading: "Why the type matters",
        paragraphs: [
          "The type of capital you request sets the whole tone of your dossier. It decides which figures a provider looks at first, which documents they insist on, and how they price the risk of backing you.",
          "Asking for the wrong type is one of the most common reasons a good Caribbean business gets a slow no. A seasonal manufacturer asking for a five-year term loan when it really needs a working capital line will look over-geared on paper, even when the business is healthy.",
        ],
      },
      {
        heading: "Debt financing",
        paragraphs: [
          "You borrow a fixed sum and repay it with interest over an agreed term. Ownership stays entirely with you. Providers include commercial banks, credit unions, development finance institutions such as the Caribbean Development Bank and national development banks, and private lenders.",
          "Lenders care about repayment capacity above everything: consistent earnings, cash in the bank, existing obligations and security. Expect them to look hard at your debt service coverage ratio and your bank statements.",
        ],
        bullets: [
          "Best for: predictable cash flow, asset purchases, bridging a known gap",
          "Typical evidence: two to three years of financial statements, twelve months of bank statements, ageing reports, collateral documents",
          "Main cost: interest and fees, plus security over assets",
        ],
      },
      {
        heading: "Equity financing",
        paragraphs: [
          "You sell a share of the business in exchange for capital that does not have to be repaid. Providers include angel investors, regional venture funds, family offices and strategic corporate investors.",
          "Equity investors are buying a future, so the questions shift: market size, growth rate, the strength of the management team and a credible exit. Your dossier needs a business narrative and forecasts, not only historic accounts.",
        ],
        bullets: [
          "Best for: growth ahead of profit, new markets, businesses without security to pledge",
          "Typical evidence: cap table, shareholder agreements, forecasts, customer contracts",
          "Main cost: dilution and shared control",
        ],
      },
      {
        heading: "Acquisition and strategic transactions",
        paragraphs: [
          "Capital raised to buy another business, buy out a partner, or fund a merger. The provider is underwriting two businesses at once: yours and the target's, plus your ability to integrate them.",
          "Expect diligence on both sets of accounts, the purchase agreement, and a clear statement of where the combined cash flow will come from.",
        ],
      },
      {
        heading: "Project finance",
        paragraphs: [
          "Capital tied to a specific project — a solar installation, a processing plant, a tourism development — where repayment comes from the project's own revenue rather than the wider business.",
          "Providers assess the project on its own feet: construction cost, offtake agreements, permits, and the sponsor's contribution. Strong long-term contracts are usually worth more than the sponsor's balance sheet.",
        ],
      },
      {
        heading: "Hybrid and structured capital",
        paragraphs: [
          "Instruments that sit between debt and equity: convertible notes, mezzanine debt and preference shares. They usually pay a return like debt but can convert into ownership, or rank behind senior lenders in exchange for a higher rate.",
          "Useful when a business is too young for a bank and too established to give away large equity. The structure detail matters, so put the proposed terms in your dossier rather than leaving them to be negotiated blind.",
        ],
      },
      {
        heading: "Grant and blended finance",
        paragraphs: [
          "Non-repayable funding or concessional capital, often from development agencies, regional programmes or donor-backed facilities, frequently blended with commercial money to lower the overall cost.",
          "Grant providers are strict about eligibility, reporting and use of funds. Their diligence looks different from a lender's: compliance, registration and impact evidence carry as much weight as profitability.",
        ],
      },
      {
        heading: "Choosing between them",
        paragraphs: [
          "A quick test: if the money buys something that will generate cash on a known schedule, debt usually fits. If it buys time to prove a market, equity or hybrid capital fits better. If it funds something with its own revenue stream and contracts, look at project finance. If it funds capacity building or a development outcome, look at grants and blended facilities.",
        ],
      },
    ],
    related: ["debt-facility-types", "collateral-and-security", "capital-readiness"],
  },
  {
    slug: "debt-facility-types",
    title: "Debt facility types: which structure to ask for",
    summary:
      "Term loans, working capital lines, invoice discounting, trade finance, asset finance and overdrafts, and how each one is repaid.",
    category: "Raising capital",
    readMinutes: 5,
    sections: [
      {
        heading: "Term loan",
        paragraphs: [
          "A fixed amount repaid in instalments over a set period, commonly three to seven years. Suited to a one-off investment with a long payback: a building, a fit-out, a major machine.",
        ],
      },
      {
        heading: "Working capital facility",
        paragraphs: [
          "A revolving limit you draw on and repay as trading cycles turn. It funds the gap between paying suppliers and being paid by customers. Lenders size it against your receivables, inventory and seasonality rather than your fixed assets.",
        ],
      },
      {
        heading: "Asset or equipment finance",
        paragraphs: [
          "The asset itself is the security, so the approval hinges on the equipment's value and useful life. Deposits of ten to thirty percent are common, and the term normally matches how long the asset will earn.",
        ],
      },
      {
        heading: "Invoice discounting and factoring",
        paragraphs: [
          "You advance cash against unpaid invoices. The provider is really underwriting your customers, so a concentrated book of strong regional buyers can be an advantage. Keep your receivables ageing clean and current.",
        ],
      },
      {
        heading: "Trade finance",
        paragraphs: [
          "Letters of credit, import loans and similar instruments that bridge the period between ordering goods and selling them. Widely used by Caribbean importers and exporters where shipping times stretch the cash cycle.",
        ],
      },
      {
        heading: "Overdraft",
        paragraphs: [
          "A short-term buffer on your operating account. Cheap to hold and expensive to live in — providers read a permanently drawn overdraft as a sign that a term facility is really needed.",
        ],
      },
    ],
    related: ["types-of-capital", "dscr-explained", "collateral-and-security"],
  },
  {
    slug: "capital-readiness",
    title: "What capital readiness actually measures",
    summary:
      "The five dimensions behind your readiness score and the practical steps that move each one.",
    category: "Readiness",
    readMinutes: 4,
    sections: [
      {
        heading: "The idea",
        paragraphs: [
          "Capital readiness is not a credit score. It measures whether a provider can make a decision on your business without chasing you for missing information — the single biggest cause of delay for Caribbean MSMEs.",
        ],
      },
      {
        heading: "The five dimensions",
        paragraphs: [
          "Dossier scores each of these and rolls them into one figure out of one hundred.",
        ],
        bullets: [
          "Documentation completeness — are the core documents present, current and legible?",
          "Financial clarity — do revenue, EBITDA, cash and debt reconcile across the documents you supplied?",
          "Governance and compliance — registration, tax standing, shareholder and board records",
          "Repayment or return capacity — coverage of the obligation you are proposing",
          "Narrative quality — a clear statement of what the money does and what changes because of it",
        ],
      },
      {
        heading: "Moving the score",
        paragraphs: [
          "The fastest gains almost always come from documentation and clarity: uploading the twelve months of bank statements you skipped, or resolving a revenue figure that appears two different ways in two different files. Narrative and governance improve more slowly but matter greatly at credit committee.",
        ],
      },
    ],
    related: ["documents-providers-expect", "dscr-explained"],
  },
  {
    slug: "documents-providers-expect",
    title: "The documents capital providers expect",
    summary:
      "The ten-document checklist behind every Dossier request, why each one is asked for and what makes one acceptable.",
    category: "Documents",
    readMinutes: 5,
    sections: [
      {
        heading: "Core financials",
        paragraphs: [
          "Financial statements for the last two to three years, audited or reviewed where your size requires it. Management accounts for the period since your last year end. Together they show both the track record and the current trading picture.",
        ],
      },
      {
        heading: "Bank statements",
        paragraphs: [
          "Six to twelve months for every operating account. Providers use them to confirm that the revenue in your accounts actually arrives, to see the true low point of your balance, and to spot returned items or undisclosed loan repayments.",
        ],
      },
      {
        heading: "Ageing reports",
        paragraphs: [
          "Receivables ageing shows who owes you and how late they are; payables ageing shows the same for your suppliers. Concentration and long-overdue balances are read as risk, so annotate anything unusual rather than leaving it to be guessed at.",
        ],
      },
      {
        heading: "Contracts and invoices",
        paragraphs: [
          "Signed customer and supply agreements support the durability of your revenue. A handful of representative recent invoices lets a provider tie your pricing and volumes back to the accounts.",
        ],
      },
      {
        heading: "Compliance and security",
        paragraphs: [
          "Business registration, VAT or BIR records and tax clearance evidence establish that you can legally borrow and are in good standing. Collateral documents — valuations, titles, asset schedules — support any security you intend to pledge.",
        ],
      },
      {
        heading: "What makes a document acceptable",
        paragraphs: [
          "Complete pages, readable scans, matching entity name, and a date inside the window requested. A statement missing its final page or a valuation three years old will be sent back, and each round trip typically costs a fortnight.",
        ],
      },
    ],
    related: ["ai-extraction", "capital-readiness"],
  },
  {
    slug: "ai-extraction",
    title: "How Dossier reads your documents",
    summary:
      "What the AI extraction step pulls out, where confidence comes from, and why you confirm every figure.",
    category: "Using Dossier",
    readMinutes: 3,
    sections: [
      {
        heading: "What happens on upload",
        paragraphs: [
          "Each uploaded file is read and the key financial figures are located: revenue, gross profit, EBITDA, net profit, cash balance, existing debt, monthly debt service, receivables, payables and inventory, plus context such as major customers and recurring obligations.",
          "Every extracted value keeps a reference to the line it came from, so you can see the source rather than trusting a number that appeared from nowhere.",
        ],
      },
      {
        heading: "Confidence and conflicts",
        paragraphs: [
          "Where two documents disagree — a revenue figure in the management accounts against the audited statements — both are surfaced and the most recent document takes precedence in the snapshot until you decide otherwise.",
        ],
      },
      {
        heading: "Why you confirm",
        paragraphs: [
          "Nothing reaches your readiness score or your dossier until you confirm it. You are the source of truth; the extraction only saves you the typing.",
        ],
      },
    ],
    related: ["documents-providers-expect", "dossier-output"],
  },
  {
    slug: "dscr-explained",
    title: "Debt service coverage and the ratios lenders run",
    summary:
      "DSCR, gearing, current ratio and interest cover — how each is calculated and the levels that usually pass.",
    category: "Finance basics",
    readMinutes: 4,
    sections: [
      {
        heading: "Debt service coverage ratio (DSCR)",
        paragraphs: [
          "EBITDA divided by total debt service for the same period, including the facility you are requesting. It answers one question: does the business generate enough to make the payments?",
          "Most Caribbean lenders look for at least 1.25x, and stronger for cyclical or seasonal sectors. Below 1.0x the business cannot cover the obligation from earnings.",
        ],
      },
      {
        heading: "Gearing",
        paragraphs: [
          "Total debt against equity or total assets. High gearing means little cushion if trading weakens. Existing shareholder loans are often counted, so disclose them.",
        ],
      },
      {
        heading: "Current ratio",
        paragraphs: [
          "Current assets over current liabilities, a short-term liquidity check. Below 1.0x signals that near-term obligations exceed near-term resources.",
        ],
      },
      {
        heading: "Interest cover",
        paragraphs: [
          "EBITDA over interest expense. It isolates the cost of borrowing from the repayment of principal and is often used alongside DSCR for revolving facilities.",
        ],
      },
    ],
    related: ["types-of-capital", "capital-readiness"],
  },
  {
    slug: "collateral-and-security",
    title: "Collateral and security in the Caribbean",
    summary:
      "What providers accept as security, how it is valued, and the alternatives when you have little to pledge.",
    category: "Raising capital",
    readMinutes: 4,
    sections: [
      {
        heading: "Common forms of security",
        paragraphs: [
          "Mortgages over commercial or residential property, debentures over company assets, chattel mortgages on equipment and vehicles, assignment of receivables or contract proceeds, cash deposits, and personal or corporate guarantees.",
        ],
      },
      {
        heading: "How it is valued",
        paragraphs: [
          "Providers apply a discount to market value — the forced-sale value — because they must assume a quick disposal. Property is often taken at seventy to eighty percent of valuation, specialised equipment far lower.",
          "Valuations are usually accepted for a limited period, commonly twelve to twenty-four months, after which a refresh is required.",
        ],
      },
      {
        heading: "When security is thin",
        paragraphs: [
          "Look at partial-guarantee schemes offered by regional development institutions, invoice-based facilities where the receivable is the security, equipment finance where the asset secures itself, or blended structures where a development partner takes first loss.",
        ],
      },
    ],
    related: ["debt-facility-types", "types-of-capital"],
  },
  {
    slug: "dossier-output",
    title: "What a lender pack contains",
    summary:
      "The difference between the condensed pack and the full package, and how a provider reads each section.",
    category: "Using Dossier",
    readMinutes: 3,
    sections: [
      {
        heading: "Two formats",
        paragraphs: [
          "The condensed lender pack is a short decision document: request summary, business overview, financial snapshot, coverage, security and use of funds. It is what a relationship officer reads first.",
          "The full package adds the supporting detail a credit committee needs: full financial history, ageing analysis, governance, market context, risks and mitigants, and the document index.",
        ],
      },
      {
        heading: "Indicative sections",
        paragraphs: [
          "Where a figure is derived rather than taken directly from a confirmed document, the section is marked indicative. This is deliberate: providers trust a pack more when it is honest about which numbers are estimates.",
        ],
      },
      {
        heading: "Sharing",
        paragraphs: [
          "You can invite a provider by email or issue a share code. You will see when they open the pack, and their status, notes and any documents they request come back into your Documents page.",
        ],
      },
    ],
    related: ["capital-readiness", "documents-providers-expect"],
  },
];

export const ARTICLE_BY_SLUG: Record<string, Article> = Object.fromEntries(
  ARTICLES.map((a) => [a.slug, a]),
);

export const ARTICLE_CATEGORIES = Array.from(new Set(ARTICLES.map((a) => a.category)));

/** Article slug that explains each capital request type. */
export const REQUEST_TYPE_ARTICLE = "types-of-capital";

export type GlossaryTerm = { term: string; definition: string; group: string };

export const GLOSSARY: GlossaryTerm[] = [
  { group: "Financials", term: "Revenue", definition: "Total income from sales of goods or services before any costs are deducted." },
  { group: "Financials", term: "Gross profit", definition: "Revenue less the direct cost of producing what you sold." },
  { group: "Financials", term: "EBITDA", definition: "Earnings before interest, tax, depreciation and amortisation — a proxy for the cash the trading business generates." },
  { group: "Financials", term: "Net profit", definition: "What remains after every expense, including interest and tax." },
  { group: "Financials", term: "Working capital", definition: "Current assets less current liabilities; the money tied up in day-to-day trading." },
  { group: "Financials", term: "Cash conversion cycle", definition: "The number of days between paying suppliers and collecting from customers." },
  { group: "Financials", term: "Receivables ageing", definition: "A breakdown of unpaid customer invoices by how long they have been outstanding." },
  { group: "Financials", term: "Payables ageing", definition: "The same breakdown for what you owe suppliers." },
  { group: "Ratios", term: "DSCR", definition: "Debt service coverage ratio: EBITDA divided by total debt payments. Most lenders want at least 1.25x." },
  { group: "Ratios", term: "Gearing", definition: "The proportion of the business funded by debt rather than equity." },
  { group: "Ratios", term: "Current ratio", definition: "Current assets divided by current liabilities; a short-term liquidity test." },
  { group: "Ratios", term: "Interest cover", definition: "EBITDA divided by interest expense." },
  { group: "Ratios", term: "Loan to value (LTV)", definition: "The loan amount as a percentage of the appraised value of the security." },
  { group: "Capital", term: "Debt financing", definition: "Borrowed capital repaid with interest; ownership is unaffected." },
  { group: "Capital", term: "Equity financing", definition: "Capital raised by selling a share of the business; no repayment, but dilution." },
  { group: "Capital", term: "Mezzanine", definition: "Subordinated debt that ranks behind senior lenders and prices higher, often with an equity kicker." },
  { group: "Capital", term: "Convertible note", definition: "A loan that can convert into shares on agreed terms, usually at a future raise." },
  { group: "Capital", term: "Preference shares", definition: "Shares with a priority claim on dividends or proceeds ahead of ordinary shares." },
  { group: "Capital", term: "Project finance", definition: "Funding repaid from the cash flow of a specific project rather than the sponsor's balance sheet." },
  { group: "Capital", term: "Blended finance", definition: "Concessional or development capital combined with commercial money to lower the overall cost or risk." },
  { group: "Capital", term: "Term sheet", definition: "A non-binding summary of the main commercial terms of a proposed facility or investment." },
  { group: "Capital", term: "Tenor", definition: "The length of time until a facility must be fully repaid." },
  { group: "Capital", term: "Moratorium", definition: "An agreed period at the start of a facility where principal repayments are deferred." },
  { group: "Security", term: "Collateral", definition: "Assets pledged to a provider that can be sold if the facility is not repaid." },
  { group: "Security", term: "Debenture", definition: "A charge over the assets of a company, fixed on named assets or floating over the rest." },
  { group: "Security", term: "Chattel mortgage", definition: "Security taken over movable assets such as vehicles or equipment." },
  { group: "Security", term: "Personal guarantee", definition: "A promise by a director or shareholder to repay personally if the business cannot." },
  { group: "Security", term: "Forced-sale value", definition: "The discounted amount a provider assumes an asset would fetch in a quick disposal." },
  { group: "Process", term: "Due diligence", definition: "The provider's verification of your business, documents and figures before committing." },
  { group: "Process", term: "Credit committee", definition: "The internal body at a provider that approves or declines a request." },
  { group: "Process", term: "Covenant", definition: "A condition in a facility agreement, such as maintaining a minimum DSCR." },
  { group: "Process", term: "Drawdown", definition: "The act of taking the funds once conditions precedent are satisfied." },
  { group: "Process", term: "Capital readiness", definition: "How prepared a business is for a provider to make a decision without further information requests." },
  { group: "Process", term: "Lender pack", definition: "The structured document set a provider needs to assess a financing request." },
];

export const GLOSSARY_GROUPS = Array.from(new Set(GLOSSARY.map((g) => g.group)));
