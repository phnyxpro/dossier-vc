import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ documentId: z.string().uuid() });

type AiField = {
  field_key: string;
  field_label?: string;
  value_text?: string | null;
  value_number?: number | null;
  unit?: string | null;
  period?: string | null;
  confidence?: number | null;
  source_excerpt?: string | null;
};

const ALLOWED_KEYS = new Set([
  "annual_revenue",
  "gross_profit",
  "ebitda",
  "net_profit",
  "cash_balance",
  "existing_debt",
  "debt_service",
  "receivables",
  "payables",
  "inventory",
  "major_customer",
  "recurring_obligation",
]);

const SYSTEM_PROMPT = `You are a financial analyst assistant preparing a lender pack for a Caribbean small or medium business.
Read the supplied business document and extract only figures and facts that are explicitly present.
Never estimate, infer or invent a value. If a figure is not clearly stated, omit it.
Return JSON only, with this exact shape:
{"fields":[{"field_key":"annual_revenue","value_number":1234567,"value_text":null,"unit":"TTD","period":"FY2024","confidence":0.9,"source_excerpt":"exact line from the document"}]}
Allowed field_key values: annual_revenue, gross_profit, ebitda, net_profit, cash_balance, existing_debt, debt_service, receivables, payables, inventory, major_customer, recurring_obligation.
Use value_number for monetary amounts (plain number, no separators or symbols) and value_text for named items such as major_customer and recurring_obligation.
confidence is 0 to 1 and reflects how clearly the document states the value.
source_excerpt must be a short verbatim quote from the document supporting the value.
Emit one entry per distinct customer or obligation. Return {"fields":[]} if nothing reliable can be read.`;

function parseJson(raw: string): { fields: AiField[] } {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(slice) as { fields?: AiField[] };
  return { fields: Array.isArray(parsed.fields) ? parsed.fields : [] };
}

export const extractDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const supabase = context.supabase;

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", data.documentId)
      .single();
    if (docError || !doc) throw new Error("Document not found.");
    if (!doc.storage_path) throw new Error("This document has no uploaded file to read.");

    await supabase
      .from("documents")
      .update({ extraction_status: "running", extraction_error: null })
      .eq("id", doc.id);

    try {
      const { data: blob, error: dlError } = await supabase.storage
        .from("documents")
        .download(doc.storage_path);
      if (dlError || !blob) throw new Error("The stored file could not be opened.");

      const buffer = new Uint8Array(await blob.arrayBuffer());
      const mime = doc.mime_type || blob.type || "application/octet-stream";

      let contentBlock: Record<string, unknown>;
      if (mime.startsWith("image/")) {
        const base64 = Buffer.from(buffer).toString("base64");
        contentBlock = { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } };
      } else if (mime === "application/pdf") {
        const base64 = Buffer.from(buffer).toString("base64");
        contentBlock = {
          type: "file",
          file: { filename: doc.name, file_data: `data:application/pdf;base64,${base64}` },
        };
      } else if (
        mime.startsWith("text/") ||
        mime === "application/json" ||
        mime === "text/csv" ||
        doc.name.match(/\.(csv|txt|md|json)$/i)
      ) {
        const text = new TextDecoder().decode(buffer).slice(0, 120_000);
        contentBlock = { type: "text", text: `Document contents:\n\n${text}` };
      } else {
        throw new Error(
          "This file type cannot be read automatically. Upload a PDF, image, CSV or text version.",
        );
      }

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
              content: [
                {
                  type: "text",
                  text: `This document was uploaded as: ${doc.name} (category: ${doc.doc_type}). Extract the financial facts it states, as JSON.`,
                },
                contentBlock,
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        if (response.status === 429) throw new Error("The AI service is busy. Try again shortly.");
        if (response.status === 402) throw new Error("AI credits are exhausted for this workspace.");
        throw new Error(`AI request failed (${response.status}): ${body.slice(0, 300)}`);
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = payload.choices?.[0]?.message?.content ?? "";
      let fields: AiField[] = [];
      try {
        fields = parseJson(raw).fields;
      } catch {
        throw new Error("The AI response could not be read. Try again.");
      }

      const rows = fields
        .filter((f) => f && ALLOWED_KEYS.has(f.field_key))
        .filter((f) => f.value_number !== undefined && f.value_number !== null ? Number.isFinite(Number(f.value_number)) : Boolean(f.value_text))
        .slice(0, 40)
        .map((f) => ({
          user_id: context.userId,
          request_id: doc.request_id,
          document_id: doc.id,
          field_key: f.field_key,
          field_label: f.field_label ?? f.field_key.replace(/_/g, " "),
          value_text: f.value_text ?? null,
          value_number:
            f.value_number === undefined || f.value_number === null ? null : Number(f.value_number),
          unit: f.unit ?? null,
          period: f.period ?? null,
          confidence: f.confidence === undefined || f.confidence === null ? null : Number(f.confidence),
          origin: "ai",
          status: "pending",
          source_excerpt: f.source_excerpt ?? null,
        }));

      // Replace any earlier AI reads of this same document.
      await supabase
        .from("extracted_fields")
        .delete()
        .eq("document_id", doc.id)
        .eq("origin", "ai")
        .eq("status", "pending");

      if (rows.length) {
        const { error: insertError } = await supabase.from("extracted_fields").insert(rows);
        if (insertError) throw new Error(insertError.message);
      }

      await supabase
        .from("documents")
        .update({
          extraction_status: "done",
          extraction_error: null,
          status: rows.length ? "received" : "needs_review",
        })
        .eq("id", doc.id);

      return { extracted: rows.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Extraction failed.";
      await supabase
        .from("documents")
        .update({ extraction_status: "error", extraction_error: message, status: "needs_review" })
        .eq("id", doc.id);
      throw new Error(message);
    }
  });
