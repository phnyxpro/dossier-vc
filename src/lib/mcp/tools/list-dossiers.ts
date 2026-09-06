import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireUser, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_dossiers",
  title: "List dossiers",
  description:
    "List the signed-in user's financing dossiers (capital requests) with reference, amount, status and readiness.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum number of dossiers to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    requireUser(ctx);
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("capital_requests")
      .select(
        "id, reference, request_type, financing_subtype, amount_sought, currency, purpose, status, readiness_status, current_step, updated_at, companies(name, industry, country)",
      )
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { dossiers: data ?? [] },
    };
  },
});
