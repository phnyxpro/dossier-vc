import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireUser, supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_dossier",
  title: "Update dossier details",
  description:
    "Update the financing ask or narrative fields of an existing dossier. Only the fields you provide are changed.",
  inputSchema: {
    request_id: z.string().uuid().describe("Dossier (capital request) id."),
    amount_sought: z.number().positive().optional(),
    purpose: z.string().trim().optional(),
    business_overview: z.string().trim().optional(),
    use_of_funds: z.string().trim().optional(),
    repayment_primary: z.string().trim().optional(),
    repayment_secondary: z.string().trim().optional(),
    repayment_explanation: z.string().trim().optional(),
    security_description: z.string().trim().optional(),
    term_value: z.number().int().positive().optional(),
    term_unit: z.enum(["months", "years"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ request_id, ...fields }, ctx) => {
    requireUser(ctx);
    const supabase = supabaseForUser(ctx);
    const patch = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    if (Object.keys(patch).length === 0) {
      return { content: [{ type: "text", text: "Provide at least one field to update." }], isError: true };
    }
    const { data, error } = await supabase
      .from("capital_requests")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", request_id)
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Updated dossier ${data.reference}.` }],
      structuredContent: { request: data },
    };
  },
});
