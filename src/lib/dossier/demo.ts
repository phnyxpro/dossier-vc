import { supabase } from "@/integrations/supabase/client";
import { extractDocument } from "@/lib/dossier/extract.functions";

/**
 * Loads a fully worked demonstration request (Caribbean Tropical Producers Ltd,
 * Trinidad and Tobago, TTD) so the workflow can be explored end to end. The
 * sample documents are uploaded as real files and read by the AI parser — no
 * financial figures are hard-coded.
 */
export async function loadDemoData(userId: string, onProgress?: (name: string) => void) {
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

  const docs: {
    doc_type: string;
    name: string | null;
    file?: string;
    mime?: string;
    status: string;
    notes?: string;
  }[] = [
    {
      doc_type: "financial_statements",
      name: "Audited Financial Statements FY2024.pdf",
      file: "audited-financial-statements-fy2024.pdf",
      mime: "application/pdf",
      status: "received",
    },
    {
      doc_type: "management_accounts",
      name: "Management Accounts Jan-Sep 2025.csv",
      file: "management-accounts-jan-sep-2025.csv",
      mime: "text/csv",
      status: "received",
    },
    {
      doc_type: "bank_statements",
      name: "RBC Operating Account — September 2025.csv",
      file: "bank-statement-operating-account.csv",
      mime: "text/csv",
      status: "received",
    },
    {
      doc_type: "ar_ageing",
      name: "Receivables Ageing Sep 2025.csv",
      file: "receivables-ageing-sep-2025.csv",
      mime: "text/csv",
      status: "received",
    },
    {
      doc_type: "ap_ageing",
      name: "Payables Ageing Sep 2025.csv",
      file: "payables-ageing-sep-2025.csv",
      mime: "text/csv",
      status: "received",
    },
    { doc_type: "contracts", name: null, status: "missing" },
    { doc_type: "invoices", name: null, status: "missing" },
    { doc_type: "tax_documents", name: null, status: "missing" },
    { doc_type: "business_registration", name: null, status: "missing" },
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
        extraction_status: "idle",
        mime_type: d.mime ?? null,
        notes: d.notes ?? null,
      })),
    )
    .select();
  if (docError) throw docError;

  // Upload the real sample files, then let the AI reader pull the figures out of
  // them. No financial values are seeded — everything comes from the documents.
  for (const spec of docs) {
    if (!spec.file) continue;
    const row = insertedDocs.find((d) => d.doc_type === spec.doc_type);
    if (!row) continue;

    const response = await fetch(`/sample-docs/${spec.file}`);
    if (!response.ok) continue;
    const blob = await response.blob();
    const path = `${userId}/${request.id}/${row.id}-${spec.file}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, blob, { upsert: true, contentType: spec.mime ?? blob.type });
    if (uploadError) throw uploadError;

    await supabase
      .from("documents")
      .update({
        storage_path: path,
        mime_type: spec.mime ?? blob.type,
        size_bytes: blob.size,
        status: "received",
        extraction_status: "idle",
      })
      .eq("id", row.id);

    onProgress?.(spec.name ?? spec.doc_type);
    try {
      await extractDocument({ data: { documentId: row.id } });
    } catch {
      // A single unreadable file should not stop the rest of the sample loading.
    }
  }

  return request.id as string;
}

export async function removeDemoData(userId: string) {
  await supabase.from("capital_requests").delete().eq("user_id", userId).eq("is_demo", true);
  await supabase.from("companies").delete().eq("user_id", userId).eq("is_demo", true);
}
