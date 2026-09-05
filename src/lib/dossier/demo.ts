import { supabase } from "@/integrations/supabase/client";

/**
 * Loads a fully worked demonstration request (Caribbean Tropical Producers Ltd,
 * Trinidad and Tobago, TTD) so the workflow can be explored end to end.
 */
export async function loadDemoData(userId: string) {
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      user_id: userId,
      name: "Caribbean Tropical Producers Ltd",
      country: "Trinidad and Tobago",
      industry: "Agro-processing & food manufacturing",
      years_in_operation: 11,
      annual_revenue: 18400000,
      currency: "TTD",
      is_demo: true,
    })
    .select()
    .single();
  if (companyError) throw companyError;

  const { data: request, error: requestError } = await supabase
    .from("capital_requests")
    .insert({
      user_id: userId,
      company_id: company.id,
      reference: "CTP-2026-014",
      request_type: "debt",
      financing_subtype: "Asset / Equipment Finance",
      purpose:
        "Purchase of a high-throughput bottling and pasteurisation line, plus working capital to support a new regional supply agreement with two supermarket groups in Barbados and Grenada.",
      amount_sought: 4250000,
      currency: "TTD",
      term_value: 60,
      term_unit: "months",
      existing_debt: 2150000,
      security_description:
        "First charge over the new bottling line (TTD 3.1M invoiced value), existing debenture over plant and equipment at Chaguanas facility, and a director's guarantee from the managing shareholder.",
      repayment_primary: "Operating cash flow from contracted supermarket volumes",
      repayment_secondary: "Receivables collections and the directors' personal guarantee",
      repayment_explanation:
        "The new line lifts bottling capacity from 4,000 to 11,000 units per day. Contracted volumes from the two regional supermarket groups add an estimated TTD 5.4M of annual revenue at a 31% gross margin, giving roughly TTD 1.67M of incremental gross profit against annual debt service of approximately TTD 1.02M on the new facility.",
      use_of_funds:
        "Bottling and pasteurisation line, installation and commissioning — TTD 3,100,000\nCold-store expansion and pallet racking at Chaguanas — TTD 520,000\nPackaging and label tooling for the two export SKUs — TTD 280,000\nWorking capital for raw fruit intake during first two harvest cycles — TTD 350,000",
      business_overview:
        "Caribbean Tropical Producers Ltd has processed and bottled tropical fruit juices, purees and pepper sauces in Chaguanas, Trinidad since 2015. The business supplies Massy Stores and independent groceries across Trinidad and Tobago, and has recently been awarded listings with two regional supermarket groups in Barbados and Grenada. It employs 46 people, 31 of them full time, and sources fruit from roughly 70 registered smallholder farmers.",
      status: "in_review",
      readiness_status: "in_progress",
      current_step: 5,
      is_demo: true,
    })
    .select()
    .single();
  if (requestError) throw requestError;

  const docs = [
    { doc_type: "financial_statements", name: "Audited Financial Statements FY2023-FY2024.pdf", status: "received", extraction_status: "done", size_bytes: 1_840_000, mime_type: "application/pdf" },
    { doc_type: "management_accounts", name: "Management Accounts Jan-Sep 2025.pdf", status: "received", extraction_status: "done", size_bytes: 640_000, mime_type: "application/pdf" },
    { doc_type: "bank_statements", name: "RBC Operating Account 12 months.pdf", status: "received", extraction_status: "done", size_bytes: 2_240_000, mime_type: "application/pdf" },
    { doc_type: "ar_ageing", name: "Receivables Ageing Sep 2025.csv", status: "received", extraction_status: "done", size_bytes: 41_000, mime_type: "text/csv" },
    { doc_type: "ap_ageing", name: "Payables Ageing Sep 2025.csv", status: "needs_review", extraction_status: "done", size_bytes: 38_000, mime_type: "text/csv", notes: "Ageing buckets do not sum to the control total — confirm with the accountant." },
    { doc_type: "contracts", name: "Supply Agreement — Regional Supermarket Group.pdf", status: "received", extraction_status: "done", size_bytes: 910_000, mime_type: "application/pdf" },
    { doc_type: "invoices", name: "Bottling Line Proforma Invoice.pdf", status: "received", extraction_status: "done", size_bytes: 220_000, mime_type: "application/pdf" },
    { doc_type: "tax_documents", name: null, status: "missing" },
    { doc_type: "business_registration", name: "Certificate of Continuance & BIR Registration.pdf", status: "received", extraction_status: "done", size_bytes: 310_000, mime_type: "application/pdf" },
    { doc_type: "collateral_documents", name: null, status: "missing" },
  ];

  const { data: insertedDocs, error: docError } = await supabase
    .from("documents")
    .insert(
      docs.map((d) => ({
        user_id: userId,
        request_id: request.id,
        doc_type: d.doc_type,
        name: d.name ?? "",
        status: d.status,
        extraction_status: d.extraction_status ?? "idle",
        size_bytes: d.size_bytes ?? null,
        mime_type: d.mime_type ?? null,
        notes: d.notes ?? null,
      })),
    )
    .select();
  if (docError) throw docError;

  const byType = (key: string) => insertedDocs.find((d) => d.doc_type === key)?.id ?? null;

  const fields = [
    { field_key: "annual_revenue", field_label: "Annual revenue", value_number: 18400000, period: "FY2024", confidence: 0.96, status: "confirmed", doc: "financial_statements", source_excerpt: "Revenue from contracts with customers 18,400,312" },
    { field_key: "gross_profit", field_label: "Gross profit", value_number: 5980000, period: "FY2024", confidence: 0.93, status: "confirmed", doc: "financial_statements", source_excerpt: "Gross profit 5,979,884" },
    { field_key: "ebitda", field_label: "EBITDA / operating profit", value_number: 2610000, period: "FY2024", confidence: 0.88, status: "confirmed", doc: "financial_statements", source_excerpt: "Operating profit before depreciation and amortisation 2,610,455" },
    { field_key: "net_profit", field_label: "Net profit", value_number: 1180000, period: "FY2024", confidence: 0.91, status: "confirmed", doc: "financial_statements", source_excerpt: "Profit for the year 1,180,207" },
    { field_key: "cash_balance", field_label: "Cash balance", value_number: 1340000, period: "Sep 2025", confidence: 0.94, status: "confirmed", doc: "bank_statements", source_excerpt: "Closing balance 30 September 2025 — 1,339,612.44" },
    { field_key: "existing_debt", field_label: "Existing debt", value_number: 2150000, period: "Sep 2025", confidence: 0.85, status: "confirmed", doc: "financial_statements", source_excerpt: "Non-current borrowings 1,620,000; current portion 530,000" },
    { field_key: "debt_service", field_label: "Monthly debt service", value_number: 48500, period: "Monthly", confidence: 0.72, status: "pending", doc: "bank_statements", source_excerpt: "Standing order — loan repayment 48,500.00 monthly" },
    { field_key: "receivables", field_label: "Accounts receivable", value_number: 3120000, period: "Sep 2025", confidence: 0.9, status: "confirmed", doc: "ar_ageing", source_excerpt: "Total receivables 3,118,940" },
    { field_key: "payables", field_label: "Accounts payable", value_number: 1875000, period: "Sep 2025", confidence: 0.64, status: "pending", doc: "ap_ageing", source_excerpt: "Total payables 1,874,556 (control total differs by 12,400)" },
    { field_key: "inventory", field_label: "Inventory", value_number: 2240000, period: "Sep 2025", confidence: 0.81, status: "confirmed", doc: "management_accounts", source_excerpt: "Inventories 2,240,118" },
    { field_key: "major_customer", field_label: "Major customer", value_text: "Massy Stores (Trinidad)", confidence: 0.89, status: "confirmed", doc: "contracts", source_excerpt: "Master supply agreement — Massy Stores Trinidad Ltd" },
    { field_key: "major_customer", field_label: "Major customer", value_text: "Regional supermarket group (Barbados & Grenada)", confidence: 0.83, status: "confirmed", doc: "contracts", source_excerpt: "Regional distribution agreement, 3-year term" },
    { field_key: "major_customer", field_label: "Major customer", value_text: "Caribbean Airlines catering", confidence: 0.58, status: "pending", doc: "invoices", source_excerpt: "Invoice 2025-0812 — inflight catering supply" },
    { field_key: "recurring_obligation", field_label: "Recurring obligation", value_text: "Chaguanas facility lease — TTD 32,000 monthly", confidence: 0.87, status: "confirmed", doc: "bank_statements", source_excerpt: "Monthly transfer — facility lease 32,000.00" },
    { field_key: "recurring_obligation", field_label: "Recurring obligation", value_text: "Equipment maintenance contract — TTD 9,500 monthly", confidence: 0.69, status: "pending", doc: "bank_statements", source_excerpt: "Standing order — maintenance services 9,500.00" },
  ];

  const { error: fieldError } = await supabase.from("extracted_fields").insert(
    fields.map((f) => ({
      user_id: userId,
      request_id: request.id,
      document_id: byType(f.doc),
      field_key: f.field_key,
      field_label: f.field_label,
      value_text: f.value_text ?? null,
      value_number: f.value_number ?? null,
      unit: f.value_number ? "TTD" : null,
      period: f.period ?? null,
      confidence: f.confidence,
      origin: "ai",
      status: f.status,
      source_excerpt: f.source_excerpt,
    })),
  );
  if (fieldError) throw fieldError;

  return request.id as string;
}

export async function removeDemoData(userId: string) {
  await supabase.from("capital_requests").delete().eq("user_id", userId).eq("is_demo", true);
  await supabase.from("companies").delete().eq("user_id", userId).eq("is_demo", true);
}
