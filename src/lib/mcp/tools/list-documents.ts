import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireUser, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_documents",
  title: "List dossier documents",
  description:
    "List the documents attached to one dossier, with document type, upload status and AI reading status. Optionally include the text read from each file.",
  inputSchema: {
    request_id: z.string().uuid().describe("Dossier (capital request) id."),
    include_text: z.boolean().default(false).describe("Include the transcribed text of each document."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ request_id, include_text }, ctx) => {
    requireUser(ctx);
    const supabase = supabaseForUser(ctx);
    const columns = include_text
      ? "id, name, doc_type, status, extraction_status, extraction_error, mime_type, size_bytes, notes, created_at, extracted_text"
      : "id, name, doc_type, status, extraction_status, extraction_error, mime_type, size_bytes, notes, created_at";
    const { data, error } = await supabase
      .from("documents")
      .select(columns)
      .eq("request_id", request_id)
      .order("created_at", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { documents: data ?? [] },
    };
  },
});
