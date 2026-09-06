import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireUser, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_dossier",
  title: "Get dossier detail",
  description:
    "Fetch one dossier in full: company profile, financing ask, confirmed extracted figures, readiness notes and written dossier sections. Accepts the dossier id or its reference (e.g. QTM-2026-014).",
  inputSchema: {
    dossier: z.string().trim().min(1).describe("Dossier id (UUID) or reference code."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ dossier }, ctx) => {
    requireUser(ctx);
    const supabase = supabaseForUser(ctx);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dossier);
    const query = supabase
      .from("capital_requests")
      .select("*, companies(*)")
      .limit(1);
    const { data: rows, error } = isUuid
      ? await query.eq("id", dossier)
      : await query.eq("reference", dossier);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const request = rows?.[0];
    if (!request) return { content: [{ type: "text", text: "No dossier found for that id or reference." }], isError: true };

    const [figures, notes, sections, documents] = await Promise.all([
      supabase
        .from("extracted_fields")
        .select("field_key, field_label, value_number, value_text, unit, period, status, origin, confidence")
        .eq("request_id", request.id),
      supabase.from("readiness_notes").select("category, severity, title, detail").eq("request_id", request.id),
      supabase.from("dossier_sections").select("*").eq("request_id", request.id),
      supabase.from("documents").select("id, name, doc_type, status, extraction_status").eq("request_id", request.id),
    ]);

    const payload = {
      request,
      figures: figures.data ?? [],
      readiness_notes: notes.data ?? [],
      dossier_sections: sections.data ?? [],
      documents: documents.data ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
