import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireUser, supabaseForUser } from "../supabase";

function reference(name: string): string {
  const prefix =
    name
      .replace(/[^A-Za-z]/g, "")
      .slice(0, 3)
      .toUpperCase() || "REQ";
  const year = new Date().getFullYear();
  const suffix = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix}-${year}-${suffix}`;
}

export default defineTool({
  name: "create_dossier",
  title: "Create dossier",
  description:
    "Start a new financing dossier for the signed-in user: creates the business profile and the capital request draft.",
  inputSchema: {
    company_name: z.string().trim().min(1).describe("Registered business name."),
    industry: z.string().trim().optional().describe("Industry of the business."),
    country: z.string().trim().default("Trinidad and Tobago").describe("Country of operation."),
    request_type: z
      .enum(["debt", "equity", "grant", "blended"])
      .default("debt")
      .describe("Type of capital sought."),
    amount_sought: z.number().positive().optional().describe("Amount of capital sought."),
    currency: z.string().trim().default("TTD").describe("Currency code, e.g. TTD."),
    purpose: z.string().trim().optional().describe("Short purpose of the financing."),
    business_overview: z.string().trim().optional().describe("Business overview narrative."),
    use_of_funds: z.string().trim().optional().describe("How the funds will be used."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const userId = requireUser(ctx);
    const supabase = supabaseForUser(ctx);

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        user_id: userId,
        name: input.company_name,
        industry: input.industry ?? null,
        country: input.country ?? "Trinidad and Tobago",
        currency: input.currency ?? "TTD",
      })
      .select()
      .single();
    if (companyError) return { content: [{ type: "text", text: companyError.message }], isError: true };

    const { data: request, error: requestError } = await supabase
      .from("capital_requests")
      .insert({
        user_id: userId,
        company_id: company.id,
        reference: reference(input.company_name),
        request_type: input.request_type ?? "debt",
        amount_sought: input.amount_sought ?? null,
        currency: input.currency ?? "TTD",
        purpose: input.purpose ?? null,
        business_overview: input.business_overview ?? null,
        use_of_funds: input.use_of_funds ?? null,
      })
      .select()
      .single();
    if (requestError) return { content: [{ type: "text", text: requestError.message }], isError: true };

    return {
      content: [
        {
          type: "text",
          text: `Created dossier ${request.reference} for ${company.name}. Upload documents in the app at /requests/${request.id}/documents.`,
        },
      ],
      structuredContent: { request, company },
    };
  },
});
