import type { Database } from "@/integrations/supabase/types";

export type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
export type RequestRow = Database["public"]["Tables"]["capital_requests"]["Row"];
export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type FieldRow = Database["public"]["Tables"]["extracted_fields"]["Row"];
export type NoteRow = Database["public"]["Tables"]["readiness_notes"]["Row"];
export type DossierSectionRow = Database["public"]["Tables"]["dossier_sections"]["Row"];

export type RequestWithCompany = RequestRow & { companies: CompanyRow | null };
