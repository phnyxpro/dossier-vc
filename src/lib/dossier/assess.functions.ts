import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DOC_TYPE_LABEL, REQUEST_TYPE_LABEL } from "./constants";
import {
  buildSnapshot,
  cashflowIndicators,
  documentReadiness,
  missingDocuments,
  readinessScore,
  riskFlags,
} from "./readiness";
import { formatMoney } from "./format";

const Input = z.object({ requestId: z.string().uuid() });

const SYSTEM_PROMPT = `You are a senior Caribbean corporate finance advisor reviewing a small business's capital-readiness evidence pack.

Assess how prepared this business is to approach a lender, based ONLY on the confirmed figures and document status supplied. Score readiness from 0 to 100, where:
- 85-100: evidence pack is essentially lender-ready
- 60-84: strong core with a few gaps
- 40-59: meaningful gaps in evidence or financial depth
- 0-39: early stage, substantial work needed

Also assign a documentation/financial risk level: "low", "moderate" or "high". This reflects gaps, inconsistencies and weaknesses in the evidence — it is NOT a credit decision.

Rules:
- Use only the confirmed figures and facts provided. Never invent numbers.
- Weigh: completeness of documents, whether key financials are confirmed, revenue/EBITDA vs amount sought, cash-flow coverage, existing debt burden, security offered, and missing items.
- Be candid but constructive; every concern should be paired with what would resolve it.

Respond with EXACTLY this JSON shape, no markdown fences, no commentary:
{
  "score": 72,
  "risk_level": "moderate",
  "rationale": "2-4 sentence overall assessment.",
  "strengths": ["short bullet", "short bullet"],
  "concerns": ["short bullet naming the gap and what resolves it"]
}
Provide 2-5 strengths and 2-6 concerns.`;

export type AiAssessment = {
  score: number;
  risk_level: "low" | "moderate" | "high";
  rationale: string;
  strengths: string[];
  concerns: string[];
};

export const assessReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured (missing key).");

    const { data: request, error: reqErr } = await supabase
      .from("capital_requests")
      .select("*, companies(*)")
      .eq("id", data.requestId)
      .eq("user_id", userId)
      .single();
    if (reqErr || !request) throw new Error("Financing request not found.");

    const [{ data: documents }, { data: fields }] = await Promise.all([
      supabase.from("documents").select("*").eq("request_id", data.requestId),
      supabase.from("extracted_fields").select("*").eq("request_id", data.requestId),
    ]);
    const docs = documents ?? [];
    const allFields = fields ?? [];
    const confirmed = allFields.filter((f) => f.status === "confirmed");
    const pending = allFields.filter((f) => f.status === "pending");
    const company = request.companies;
    const currency = request.currency;

    const snap = buildSnapshot(allFields, request);
    const indicators = cashflowIndicators(snap, currency);
    const missing = missingDocuments(docs);
    const docStats = documentReadiness(docs);
    const flags = riskFlags(request, docs, allFields, snap);
    const heuristic = readinessScore(docs, allFields, request);

    const factText = `== BUSINESS ==
Name: ${company?.name ?? "—"}
Industry: ${company?.industry ?? "—"}
Country: ${company?.country ?? "—"}
Years in operation: ${company?.years_in_operation ?? "—"}

== FINANCING REQUEST ==
Type: ${REQUEST_TYPE_LABEL[request.request_type] ?? request.request_type}${request.financing_subtype ? ` / ${request.financing_subtype}` : ""}
Amount sought: ${formatMoney(Number(request.amount_sought ?? 0), currency)}
Term: ${request.term_value ?? "—"} ${request.term_unit ?? ""}
Purpose: ${request.purpose ?? "—"}
Use of funds: ${request.use_of_funds ?? "—"}
Primary repayment source: ${request.repayment_primary ?? "—"}
Secondary repayment source: ${request.repayment_secondary ?? "—"}
Security offered: ${request.security_description ?? "—"}

== CONFIRMED FINANCIAL FIGURES (the only figures you may cite) ==
${confirmed.length
  ? confirmed
      .map(
        (f) =>
          `- ${f.field_label}: ${
            f.value_number !== null && f.value_number !== undefined
              ? `${f.unit ?? currency} ${Number(f.value_number).toLocaleString("en-US")}`
              : f.value_text
          }${f.period ? ` (${f.period})` : ""}`,
      )
      .join("\n")
  : "(none confirmed)"}
Unconfirmed AI readings still awaiting review: ${pending.length}

== COMPUTED INDICATORS ==
${indicators.map((i) => `- ${i.label}: ${i.value}`).join("\n")}

== EVIDENCE PACK ==
${docStats.satisfied}/${docStats.total} document types on file, ${docStats.needsReview} flagged for review.
${docs
  .filter((d) => d.status !== "missing")
  .map((d) => `- ${DOC_TYPE_LABEL[d.doc_type] ?? d.doc_type}: ${d.status.replace(/_/g, " ")}`)
  .join("\n")}

== MISSING DOCUMENTS ==
${missing.length ? missing.map((m) => `- ${m.label}: ${m.hint}`).join("\n") : "(none)"}

== RULE-BASED RISK FLAGS ALREADY DETECTED ==
${flags.length ? flags.map((f) => `- [${f.severity}] ${f.title}: ${f.detail}`).join("\n") : "(none)"}

== REFERENCE ==
The app's rule-based readiness score is ${heuristic}%. You may agree or diverge — explain either way in the rationale.`;

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
          { role: "user", content: factText },
        ],
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AI assessment failed [${response.status}]: ${body}`);
    }
    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = (json.choices?.[0]?.message?.content ?? "").trim().replace(/^```(?:json)?|```$/g, "");
    let parsed: AiAssessment;
    try {
      parsed = JSON.parse(raw) as AiAssessment;
    } catch {
      throw new Error("The AI returned an unreadable assessment. Please try again.");
    }
    return {
      score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
      risk_level: (["low", "moderate", "high"] as const).includes(parsed.risk_level)
        ? parsed.risk_level
        : "moderate",
      rationale: String(parsed.rationale ?? ""),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns.map(String) : [],
    } satisfies AiAssessment;
  });
