export type LegalSection = { heading: string; body: string[] };

export type LegalDoc = {
  key: "terms" | "privacy" | "ai-notice" | "security" | "help" | "accessibility";
  path: string;
  version: string;
  title: string;
  summary: string;
  updated: string;
  sections: LegalSection[];
};

export const SUPPORT_EMAIL = "support@ventureble.com";
export const SECURITY_EMAIL = "security@ventureble.com";
export const PRIVACY_EMAIL = "privacy@ventureble.com";
export const COMPANY_LINE = "Ventureble Ltd — Port of Spain, Trinidad and Tobago";

export const LEGAL_DOCS: LegalDoc[] = [
  {
    key: "terms",
    path: "/terms",
    version: "2026-09-01",
    title: "Terms of Use",
    summary: "The rules for using Dossier by Ventureble.",
    updated: "1 September 2026",
    sections: [
      {
        heading: "What Dossier is",
        body: [
          "Dossier by Ventureble is a preparation tool. It helps a business organise its own financial information into a structured financing dossier that a capital provider can read.",
          "Dossier is not a lender, broker or adviser. Nothing in the product is a credit approval, a loan recommendation, an investment decision or professional financial, legal or tax advice.",
        ],
      },
      {
        heading: "Your account",
        body: [
          "You are responsible for keeping your sign-in details private and for everything done through your account. Tell us straight away if you believe someone else has access.",
          "You must be authorised to act for the business whose information you upload.",
        ],
      },
      {
        heading: "Your content",
        body: [
          "You keep ownership of every document and figure you upload. You grant Ventureble permission to store and process that material only to provide the service to you.",
          "You confirm you have the authority to upload company information and any third-party information it contains, and that doing so does not breach any duty of confidence.",
        ],
      },
      {
        heading: "Sharing with capital providers",
        body: [
          "A dossier reaches a capital provider only when you share it. You can withdraw access at any time; withdrawn access stops further viewing immediately, though a provider may retain notes made before withdrawal.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Do not upload malicious files, attempt to reach another account's data, probe the service for weaknesses without written permission, or use the product to mislead a capital provider.",
        ],
      },
      {
        heading: "Availability and liability",
        body: [
          "The service is provided as-is. We work to keep it available and accurate, but we do not guarantee uninterrupted service or that an extracted figure is correct — you confirm every figure before it is used.",
          "To the extent the law allows, Ventureble is not liable for indirect or consequential loss, or for any financing decision made by any party.",
        ],
      },
      {
        heading: "Ending your use",
        body: [
          "You may stop using Dossier and ask us to delete your data at any time by writing to " + SUPPORT_EMAIL + ". We may suspend an account that breaches these terms.",
        ],
      },
      {
        heading: "Governing law",
        body: ["These terms are governed by the laws of Trinidad and Tobago."],
      },
    ],
  },
  {
    key: "privacy",
    path: "/privacy",
    version: "2026-09-01",
    title: "Privacy Notice",
    summary: "What we collect, why, where it is stored and how to get it removed.",
    updated: "1 September 2026",
    sections: [
      {
        heading: "Who we are",
        body: [COMPANY_LINE + ". For any privacy question write to " + PRIVACY_EMAIL + "."],
      },
      {
        heading: "What we collect",
        body: [
          "Account details: your name, email address and, for capital providers, your institution.",
          "Business information you enter: company profile, financing request details, repayment and security notes.",
          "Documents you upload: financial statements, bank statements, ageing reports, registrations and similar evidence, plus the figures read from them.",
          "Technical records: sign-in events, request logs and error reports needed to run and secure the service.",
        ],
      },
      {
        heading: "Why we use it",
        body: [
          "To build your financing dossier, to show you where each figure came from, to share a dossier with the capital providers you choose, and to keep the service secure.",
          "We do not sell your information and we do not use your documents to advertise to you.",
        ],
      },
      {
        heading: "Who can see it",
        body: [
          "Only you, and any capital provider you explicitly share a dossier with. Our staff access customer content only when you ask for support or when required to resolve a fault.",
        ],
      },
      {
        heading: "Where it is stored and processed",
        body: [
          "Your data is held in managed cloud infrastructure and may be processed outside Trinidad and Tobago, including in the United States and the European Union, under contractual protections with our processors.",
          "Documents are stored in private storage. They are never publicly listed and are served only through short-lived signed links to your own signed-in session.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "We keep your account and dossiers while your account is open. When you ask for deletion we remove your requests, documents and extracted figures, retaining only records we are legally required to keep.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can ask for a copy of your data, correct it, or have it deleted. Write to " + PRIVACY_EMAIL + " and we will respond within 30 days.",
        ],
      },
    ],
  },
  {
    key: "ai-notice",
    path: "/ai-notice",
    version: "2026-09-01",
    title: "AI and Data Processing Notice",
    summary: "Exactly what the AI reads, what it produces and where a person stays in control.",
    updated: "1 September 2026",
    sections: [
      {
        heading: "What the AI does",
        body: [
          "When you upload a document, its contents are sent to an AI model to read the figures out of it — revenue, profit, cash balances, debt, receivables and similar values — along with the line each figure came from.",
          "For scans and photographs the document is first transcribed, then read a second time and cross-checked.",
        ],
      },
      {
        heading: "A person confirms every figure",
        body: [
          "Extracted values arrive as suggestions marked pending. Nothing reaches your readiness score or your dossier until you confirm or correct it. You can also enter figures by hand instead.",
        ],
      },
      {
        heading: "Drafted narrative",
        body: [
          "The AI also drafts the written sections of a dossier from information you have confirmed. You can edit any section before sharing, and you remain responsible for what a capital provider reads.",
        ],
      },
      {
        heading: "Which providers process your documents",
        body: [
          "Document reading, transcription and narrative drafting run through the Lovable AI gateway using large language models. Content is sent for processing only and is not used by us to train models.",
        ],
      },
      {
        heading: "Limits",
        body: [
          "AI reading can misread a poor scan, an unusual layout or an unlabelled table. Always check the source line shown next to each figure. Where the model is unsure it abstains rather than guessing, and the document appears in your review queue.",
        ],
      },
      {
        heading: "Opting out",
        body: [
          "You can skip AI reading entirely and type your figures in by hand on the Documents page. The rest of the product works the same way.",
        ],
      },
    ],
  },
  {
    key: "security",
    path: "/security",
    version: "2026-09-01",
    title: "Security",
    summary: "How your documents and figures are protected.",
    updated: "1 September 2026",
    sections: [
      {
        heading: "Account separation",
        body: [
          "Every request, document, extracted figure, readiness note and dossier section is tied to the account that created it, and the database refuses to return rows belonging to anyone else. A capital provider sees only the specific dossier shared with them, and only while that share is active.",
        ],
      },
      {
        heading: "Documents",
        body: [
          "Uploaded files live in private storage with no public listing and no public URL. Viewing a file issues a short-lived signed link to your signed-in session only.",
        ],
      },
      {
        heading: "In transit and at rest",
        body: [
          "All traffic uses HTTPS. Stored data and backups are encrypted at rest by our infrastructure provider.",
        ],
      },
      {
        heading: "Accounts and passwords",
        body: [
          "Passwords must be at least 12 characters, are screened against known breached-password lists, and are never stored in readable form. Sign-in attempts and password reset requests are rate limited. Resetting a password ends other active sessions.",
        ],
      },
      {
        heading: "Secrets",
        body: [
          "Service credentials and AI keys are held as server-side secrets. They are never sent to the browser and never appear in a dossier or export.",
        ],
      },
      {
        heading: "Reporting a problem",
        body: [
          "If you believe you have found a vulnerability, write to " + SECURITY_EMAIL + " with the details. We will acknowledge within two business days and will not pursue anyone who reports in good faith and does not access other people's data.",
        ],
      },
      {
        heading: "Current status",
        body: [
          "Dossier is in controlled pilot. Malware scanning of uploads, immutable dossier versioning and independent penetration testing are on the roadmap and are not yet in place — please take that into account before uploading highly sensitive records.",
        ],
      },
    ],
  },
  {
    key: "help",
    path: "/help",
    version: "2026-09-01",
    title: "Help and support",
    summary: "How to reach a person, and answers to the usual questions.",
    updated: "1 September 2026",
    sections: [
      {
        heading: "Contact us",
        body: [
          "General and account support: " + SUPPORT_EMAIL,
          "Privacy and data requests: " + PRIVACY_EMAIL,
          "Security reports: " + SECURITY_EMAIL,
          COMPANY_LINE,
          "We answer within one business day, Monday to Friday.",
        ],
      },
      {
        heading: "I cannot sign in",
        body: [
          "Use the \"Forgot password?\" link on the sign-in card. We send a single-use link that expires; opening it lets you set a new password and signs you in.",
        ],
      },
      {
        heading: "A document did not read properly",
        body: [
          "Open the request's Documents page. Anything the reader could not handle appears under \"Needs your review\", where you can set the right document type, try again, or type the figures in by hand.",
        ],
      },
      {
        heading: "How do I share with a lender?",
        body: [
          "From the Dossier page, invite a provider by email or generate a share code. You can see when it was opened and withdraw access at any time.",
        ],
      },
      {
        heading: "Am I approved for financing?",
        body: [
          "No. Dossier prepares and presents your information. Every credit decision is made by the capital provider under their own policies.",
        ],
      },
    ],
  },
  {
    key: "accessibility",
    path: "/accessibility",
    version: "2026-09-01",
    title: "Accessibility statement",
    summary: "Our commitment, what works today and what we are still fixing.",
    updated: "1 September 2026",
    sections: [
      {
        heading: "Our commitment",
        body: [
          "We aim to meet WCAG 2.2 level AA across Dossier, for both the business workspace and the capital-provider portal.",
        ],
      },
      {
        heading: "What works today",
        body: [
          "Every form field has a visible, programmatically associated label with required states and sensible autocomplete. Keyboard focus order follows the visible order and focus is always visible. The interface is available in English, Spanish, French and Dutch, and the page language is set correctly.",
          "Text scales without loss of content, and the layout adapts down to small phone screens without horizontal scrolling.",
        ],
      },
      {
        heading: "Known gaps",
        body: [
          "Full screen-reader testing of the request wizard is not complete. Generated PDF exports are not yet tagged for assistive technology. Some secondary and disclaimer text is being re-measured against contrast and minimum-size requirements.",
        ],
      },
      {
        heading: "Tell us",
        body: [
          "If any part of Dossier is hard to use, write to " + SUPPORT_EMAIL + " describing the page and what happened. We treat accessibility faults as defects, not requests.",
        ],
      },
    ],
  },
];

export const LEGAL_BY_KEY = Object.fromEntries(LEGAL_DOCS.map((d) => [d.key, d])) as Record<
  LegalDoc["key"],
  LegalDoc
>;

export const CONSENT_VERSION = "2026-09-01";
