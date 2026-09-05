import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { DocumentRow, DossierSectionRow, FieldRow, RequestWithCompany } from "./types";

type RequestUpdate = Database["public"]["Tables"]["capital_requests"]["Update"];
type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];
type SectionUpdate = Database["public"]["Tables"]["dossier_sections"]["Update"];

export function useDossierSections(requestId: string) {
  return useQuery({
    queryKey: ["dossier-sections", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossier_sections")
        .select("*")
        .eq("request_id", requestId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DossierSectionRow[];
    },
  });
}

export function useSaveDossierSection(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: SectionUpdate }) => {
      const { error } = await supabase.from("dossier_sections").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dossier-sections", requestId] }),
  });
}

export function useRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ["requests", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capital_requests")
        .select("*, companies(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RequestWithCompany[];
    },
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: ["request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capital_requests")
        .select("*, companies(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as RequestWithCompany;
    },
  });
}

export function useDocuments(requestId: string) {
  return useQuery({
    queryKey: ["documents", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
  });
}

export function useFields(requestId: string) {
  return useQuery({
    queryKey: ["fields", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extracted_fields")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FieldRow[];
    },
  });
}

export function useSaveRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: RequestUpdate) => {
      const { error } = await supabase.from("capital_requests").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["request", id] });
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

export function useSaveCompany(companyId: string | null | undefined, requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: CompanyUpdate) => {
      if (!companyId) throw new Error("No company on this request");
      const { error } = await supabase.from("companies").update(patch).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["request", requestId] });
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

export function invalidateRequest(qc: ReturnType<typeof useQueryClient>, requestId: string) {
  qc.invalidateQueries({ queryKey: ["request", requestId] });
  qc.invalidateQueries({ queryKey: ["documents", requestId] });
  qc.invalidateQueries({ queryKey: ["fields", requestId] });
  qc.invalidateQueries({ queryKey: ["requests"] });
}
