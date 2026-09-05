import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DOSSIER_SECTIONS, DOSSIER_SECTION_MAP, INDICATIVE_NOTE } from "./sections";
import {
  buildSnapshot,
  cashflowIndicators,
  documentReadiness,
  lenderQuestions,
  missingDocuments,
  nextSteps,
  riskFlags,
} from "./readiness";
import { formatMoney } from "./format";
import { DOC_TYPE_LABEL, REQUEST_TYPE_LABEL } from "./constants";
import type { DocumentRow, FieldRow, RequestWithCompany } from "./types";

const generateInput = z.object({
  requestId: z.string().uuid(),
  /** Regenerate a single section when provided. */
  sectionKey: z.string().optional(),
  /** When true, overwrite sections the user has edited. */
  force: z.boolean().optional(),
});

const exportInput = z.object({
  requestId: z.string().uuid(),
  format: z.enum(["pack", "full"]),
});

type AiSection = { section_key: string; title?: string; body?: string };

function parseSections(raw: string): AiSection[] {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(slice) as { sections?: AiSection[] };
  return Array.isArray(parsed.sections) ? parsed.sections : [];
}

type FactPack = {
  request: RequestWithCompany;
  documents: DocumentRow[];
  confirmed: FieldRow[];
};

async function loadFacts(
  supabase: { from: (t: string) => any },
  requestId: string,
): Promise<FactPack> {
  const { data: request, error } = await supabase
    .from("capital_requests")
    .select("*, companies(*)")
    .eq("id", requestId)
    .single();
  if (error || !request) throw new Error("Financing request not found.");

  const [{ data: documents }, { data: fields }] = await Promise.all([
    supabase.from("documents").select("*").eq("request_id", requestId),
    supabase.from("extracted_fields").select("*").eq("request_id", requestId).eq("status", "confirmed"),
  ]);

  return {
    request: request as RequestWithCompany,
    documents: (documents ?? []) as DocumentRow[],
    confirmed: (fields ?? []) as FieldRow[],
  };
}

function factPackText({ request, documents, confirmed }: FactPack): string {
  const currency = request.currency;
  const company = request.companies;
  const snap = buildSnapshot(confirmed, request);
  const indicators = cashflowIndicators(snap, currency);
  const flags = riskFlags(request, documents, confirmed, snap);
  const questions = lenderQuestions(request, snap, documents);
  const steps = nextSteps(documents, confirmed, snap);
  const missing = missingDocuments(documents);
  const docs = documentReadiness(documents);

  const lines: string[] = [];
  const push = (s = "") => lines.push(s);

  push("== BORROWER ==");
  push(`Business: ${company?.name ?? "Unknown"}`);
  push(`Country: ${company?.country ?? "—"}`);
  push(`Industry: ${company?.industry ?? "—"}`);
  push(`Years in operation: ${company?.years_in_operation ?? "—"}`);
  push(`Reporting currency: ${currency}`);
  if (request.business_overview) push(`Business overview provided by the owner: ${request.business_overview}`);
  push("");
  push("== FINANCING REQUEST ==");
  push(`Reference: ${request.reference ?? "—"}`);
  push(`Type: ${REQUEST_TYPE_LABEL[request.request_type] ?? request.request_type}`);
  if (request.financing_subtype) push(`Facility type: ${request.financing_subtype}`);
  push(`Amount sought: ${formatMoney(Number(request.amount_sought ?? 0), currency)}`);
  push(`Desired term: ${request.term_value ?? "—"} ${request.term_unit ?? ""}`);
  push(`Purpose: ${request.purpose ?? "—"}`);
  if (request.use_of_funds) push(`Use of funds provided by the owner: ${request.use_of_funds}`);
  push("");
  push("== CONFIRMED FINANCIAL FIGURES (the only figures you may cite) ==");
  if (!confirmed.length) push("None confirmed yet.");
  confirmed.forEach((f) => {
    const value =
      f.value_number !== null && f.value_number !== undefined
        ? `${f.unit ?? currency} ${Number(f.value_number).toLocaleString("en-US")}`
        : (f.value_text ?? "");
    push(
      `- ${f.field_label}: ${value}${f.period ? ` (${f.period})` : ""} — source: ${f.source_excerpt ? `"${f.source_excerpt}"` : "record"}`,
    );
  });
  push("");
  push("== COMPUTED INDICATORS (from confirmed figures) ==");
  indicators.forEach((i) => push(`- ${i.label}: ${i.value}`));
  push("");
  push("== REPAYMENT ==");
  push(`Primary source: ${request.repayment_primary ?? "—"}`);
  push(`Secondary source: ${request.repayment_secondary ?? "—"}`);
  if (request.repayment_explanation) push(`Owner's explanation: ${request.repayment_explanation}`);
  push("");
  push("== SECURITY / COLLATERAL ==");
  push(request.security_description ?? "None recorded.");
  push("");
  push("== EVIDENCE PACK ==");
  push(`${docs.satisfied} of ${docs.total} document types on file; ${docs.needsReview} need review.`);
  documents.forEach((d) => {
    push(`- ${DOC_TYPE_LABEL[d.doc_type] ?? d.doc_type}: ${d.status}${d.name ? ` (${d.name})` : ""}`);
  });
  push("");
  push("== MISSING DOCUMENTS ==");
  missing.forEach((m) => push(`- ${m.label}`));
  if (!missing.length) push("None.");
  push("");
  push("== DETECTED RISK FLAGS ==");
  flags.forEach((f) => push(`- [${f.severity}] ${f.title}: ${f.detail}`));
  push("");
  push("== LIKELY LENDER QUESTIONS ==");
  questions.forEach((q, i) => push(`${i + 1}. ${q}`));
  push("");
  push("== RECOMMENDED NEXT STEPS ==");
  steps.forEach((s, i) => push(`${i + 1}. ${s}`));

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are a senior Caribbean corporate finance advisor drafting a financing dossier for a small or medium business, to be shared with banks, credit unions and development finance institutions.
You receive a fact pack and must write the narrative sections of the dossier.

Hard rules:
- Use ONLY facts and figures present in the fact pack. Never invent, estimate or extrapolate a number, date, customer name or obligation.
- If a section's data is thin, say plainly what is known and what the business has not yet provided. Never fill gaps with assumptions.
- Amounts stay in the currency given in the fact pack (write e.g. "TTD 4,250,000").
- Professional, measured investment-memo tone. No marketing language, no superlatives.
- Sections "funding_thesis", "indicative_structure" and "valuation_context" are forward-looking: frame them as indicative discussion material and end each with exactly this sentence: "${INDICATIVE_NOTE}"
- Never state or imply that financing is approved, recommended or likely to be approved. You present information, not a credit decision.
- For "risks_mitigants": for each risk in the fact pack, give the risk and then a practical mitigant the business can act on. Format each as "RISK: ... / MITIGANT: ..." as separate bullet lines.
- For "lender_questions", "missing_information" and "next_steps": write short lead-in paragraphs plus bullet lists drawn from the fact pack.
- Each body is 120 to 280 words. Plain text only: paragraphs separated by a blank line; bullet items as lines starting with "- ". No markdown headings, no bold, no tables, no numbering syntax beyond bullets.

Return JSON only, with this exact shape:
{"sections":[{"section_key":"executive_summary","body":"..."}]}
Use exactly the section keys requested. Every requested section must appear.`;

export const generateDossier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => generateInput.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const supabase = context.supabase;
    const facts = await loadFacts(supabase, data.requestId);

    const wanted = data.sectionKey
      ? DOSSIER_SECTIONS.filter((s) => s.key === data.sectionKey)
      : DOSSIER_SECTIONS;
    if (!wanted.length) throw new Error("Unknown dossier section.");

    // Don't clobber user edits unless forced.
    let skipKeys = new Set<string>();
    if (!data.force && !data.sectionKey) {
      const { data: existing } = await supabase
        .from("dossier_sections")
        .select("section_key, status")
        .eq("request_id", data.requestId);
      skipKeys = new Set(
        (existing ?? []).filter((s: { status: string }) => s.status !== "draft").map((s: { section_key: string }) => s.section_key),
      );
    }
    const toWrite = wanted.filter((s) => !skipKeys.has(s.key));
    if (!toWrite.length) return { generated: 0 };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Write these dossier sections, as JSON: ${toWrite
              .map((s) => `${s.key} ("${s.title}")`)
              .join(", ")}.\n\nFACT PACK:\n\n${factPackText(facts)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 429) throw new Error("The AI service is busy. Try again shortly.");
      if (response.status === 402) throw new Error("AI credits are exhausted for this workspace.");
      if (response.status === 403) throw new Error("AI is disabled for this workspace by policy.");
      throw new Error(`AI request failed (${response.status}): ${body.slice(0, 300)}`);
    }

    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    let sections: AiSection[] = [];
    try {
      sections = parseSections(raw);
    } catch {
      throw new Error("The AI response could not be read. Try again.");
    }

    const rows = sections
      .filter((s) => s && DOSSIER_SECTION_MAP.has(s.section_key) && typeof s.body === "string" && s.body.trim())
      .filter((s) => toWrite.some((w) => w.key === s.section_key))
      .map((s) => {
        const def = DOSSIER_SECTION_MAP.get(s.section_key)!;
        return {
          user_id: context.userId,
          request_id: data.requestId,
          section_key: s.section_key,
          title: def.title,
          body: s.body!.trim(),
          status: "draft",
          sort_order: def.order,
        };
      });

    if (!rows.length) throw new Error("The AI returned no usable sections. Try again.");

    const { error: upsertError } = await supabase
      .from("dossier_sections")
      .upsert(rows, { onConflict: "request_id,section_key" });
    if (upsertError) throw new Error(upsertError.message);

    return { generated: rows.length };
  });

// ---------- DOCX export ----------

function docxParagraphs(body: string, make: { p: (text: string) => any; bullet: (text: string) => any }) {
  return body.split(/\n+/).map((line) => {
    const t = line.replace(/\s+/g, " ").trim();
    if (!t) return null;
    if (t.startsWith("- ")) return make.bullet(t.slice(2));
    return make.p(t);
  }).filter(Boolean);
}

export const exportDossierDocx = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => exportInput.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const facts = await loadFacts(supabase, data.requestId);
    const { request, documents, confirmed } = facts;

    const { data: sections } = await supabase
      .from("dossier_sections")
      .select("*")
      .eq("request_id", data.requestId)
      .order("sort_order", { ascending: true });
    const all = (sections ?? []) as { section_key: string; title: string; body: string; sort_order: number }[];
    const picked =
      data.format === "pack"
        ? all.filter((s) => DOSSIER_SECTION_MAP.get(s.section_key)?.pack)
        : all;

    const currency = request.currency;
    const company = request.companies;
    const snap = buildSnapshot(confirmed, request);
    const indicators = cashflowIndicators(snap, currency);

    const {
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel,
      AlignmentType, LevelFormat, BorderStyle, WidthType, ShadingType, PageBreak,
      Header, Footer, PageNumber,
    } = await import("docx");

    const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } as const;
    const cellBorders = { top: border, bottom: border, left: border, right: border };
    const CONTENT = 9360;

    const p = (text: string, opts: Record<string, unknown> = {}) =>
      new Paragraph({ children: [new TextRun(text)], spacing: { after: 160 }, ...opts });
    const bullet = (text: string) =>
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun(text)], spacing: { after: 80 } });
    const h1 = (text: string, pageBreak = true) =>
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)], pageBreakBefore: pageBreak });

    function dataTable(rows: [string, string][]) {
      return new Table({
        width: { size: CONTENT, type: WidthType.DXA },
        columnWidths: [6240, 3120],
        rows: rows.map(
          ([label, value], i) =>
            new TableRow({
              children: [
                new TableCell({
                  borders: cellBorders,
                  width: { size: 6240, type: WidthType.DXA },
                  margins: { top: 60, bottom: 60, left: 120, right: 120 },
                  ...(i % 2 ? { shading: { fill: "F4F6F8", type: ShadingType.CLEAR } } : {}),
                  children: [new Paragraph({ children: [new TextRun(label)] })],
                }),
                new TableCell({
                  borders: cellBorders,
                  width: { size: 3120, type: WidthType.DXA },
                  margins: { top: 60, bottom: 60, left: 120, right: 120 },
                  ...(i % 2 ? { shading: { fill: "F4F6F8", type: ShadingType.CLEAR } } : {}),
                  children: [
                    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: value, bold: true })] }),
                  ],
                }),
              ],
            }),
        ),
      });
    }

    const children: any[] = [];

    // Cover
    children.push(
      new Paragraph({ spacing: { before: 3200 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "DOSSIER", bold: true, size: 56 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 1200 },
        children: [new TextRun({ text: "by Ventureble", size: 20, color: "666666" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: data.format === "pack" ? "Financing Lender Pack" : "Financing Dossier — Full Package", bold: true, size: 36 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: company?.name ?? "", size: 28 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: `${company?.industry ?? ""} · ${company?.country ?? ""}`, size: 22, color: "666666" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `${REQUEST_TYPE_LABEL[request.request_type] ?? request.request_type} — ${formatMoney(Number(request.amount_sought ?? 0), currency)}`,
            size: 24,
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Reference ${request.reference ?? "—"} · Prepared ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
            size: 20,
            color: "666666",
          }),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),
    );

    // Table of contents (static list — no field codes so it reads correctly everywhere)
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Contents")] }));
    let n = 0;
    for (const s of picked) {
      n += 1;
      children.push(p(`${n}. ${s.title}`, { spacing: { after: 60 } }));
    }
    children.push(
      p("Financial snapshot", { spacing: { after: 60 } }),
      p("Appendix: evidence register and confirmed figures", { spacing: { after: 60 } }),
    );

    // Narrative sections
    picked.forEach((s, i) => {
      const def = DOSSIER_SECTION_MAP.get(s.section_key);
      children.push(h1(`${i + 1}. ${s.title}`));
      if (def?.indicative) {
        children.push(
          new Paragraph({
            spacing: { after: 160 },
            children: [new TextRun({ text: INDICATIVE_NOTE, italics: true, color: "666666", size: 18 })],
          }),
        );
      }
      children.push(...docxParagraphs(s.body, { p, bullet }));
    });

    // Financial snapshot table
    children.push(h1("Financial snapshot"));
    children.push(
      p("Figures are drawn from the business's own documents and confirmed by the business. Indicative measures prepared from confirmed figures.", {}),
      dataTable([
        ["Annual revenue", formatMoney(snap.annual_revenue, currency)],
        ["Gross profit", formatMoney(snap.gross_profit, currency)],
        ["EBITDA / operating profit", formatMoney(snap.ebitda, currency)],
        ["Net profit", formatMoney(snap.net_profit, currency)],
        ["Cash balance", formatMoney(snap.cash_balance, currency)],
        ["Inventory", formatMoney(snap.inventory, currency)],
        ["Accounts receivable", formatMoney(snap.receivables, currency)],
        ["Accounts payable", formatMoney(snap.payables, currency)],
        ["Existing debt", formatMoney(snap.existing_debt, currency)],
        ["Monthly debt service", formatMoney(snap.debt_service, currency)],
        ...indicators.map((i): [string, string] => [i.label, i.value]),
      ]),
    );

    // Appendix
    children.push(h1("Appendix: evidence register and confirmed figures"));
    children.push(p("Documents on file:"));
    documents.forEach((d) => {
      children.push(bullet(`${DOC_TYPE_LABEL[d.doc_type] ?? d.doc_type} — ${d.status}${d.name ? ` (${d.name})` : ""}`));
    });
    children.push(p("Confirmed figures and their sources:"));
    confirmed.forEach((f) => {
      const value =
        f.value_number !== null && f.value_number !== undefined
          ? `${f.unit ?? currency} ${Number(f.value_number).toLocaleString("en-US")}`
          : (f.value_text ?? "");
      children.push(
        bullet(
          `${f.field_label}: ${value}${f.period ? ` (${f.period})` : ""}${f.source_excerpt ? ` — source: "${f.source_excerpt}"` : ""}`,
        ),
      );
    });

    children.push(
      new Paragraph({
        spacing: { before: 600 },
        children: [
          new TextRun({
            text:
              "Prepared with DOSSIER by Ventureble. This document organises information provided by the business and read from its own documents. It is not a credit approval, loan recommendation or investment decision. Figures are unaudited unless the supporting document states otherwise.",
            size: 16,
            color: "666666",
            italics: true,
          }),
        ],
      }),
    );

    const doc = new Document({
      styles: {
        default: { document: { run: { font: "Georgia", size: 21 } } },
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 28, bold: true, font: "Georgia", color: "1A2B4A" },
            paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 },
          },
        ],
      },
      numbering: {
        config: [
          {
            reference: "bullets",
            levels: [
              {
                level: 0,
                format: LevelFormat.BULLET,
                text: "•",
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } },
              },
            ],
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 12240, height: 15840 },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: "DOSSIER by Ventureble — Confidential", size: 14, color: "999999" })],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: `${company?.name ?? ""} · ${request.reference ?? ""} · Page `, size: 14, color: "999999" }),
                    new TextRun({ children: [PageNumber.CURRENT], size: 14, color: "999999" }),
                  ],
                }),
              ],
            }),
          },
          children,
        },
      ],
    });

    const base64 = await Packer.toBase64String(doc);
    const filename = `${request.reference ?? "financing"}-${data.format === "pack" ? "lender-pack" : "full-dossier"}.docx`;
    return { filename, base64 };
  });
