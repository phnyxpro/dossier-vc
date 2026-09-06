import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type KycProfile = {
  id: string;
  user_id: string;
  legal_name: string;
  date_of_birth: string | null;
  nationality: string;
  id_type: string;
  id_number: string;
  phone: string;
  address_line: string;
  city: string;
  country: string;
  business_role: string;
  company_name: string;
  source_of_funds: string;
  is_pep: boolean;
  declaration_accepted: boolean;
  status: string;
  completed_at: string | null;
};

export function kycQueryKey(userId: string | undefined) {
  return ["kyc", userId ?? "anon"] as const;
}

export async function fetchKyc(userId: string): Promise<KycProfile | null> {
  const { data, error } = await supabase
    .from("kyc_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as KycProfile | null) ?? null;
}

export function useKyc(userId: string | undefined) {
  return useQuery({
    queryKey: kycQueryKey(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: () => fetchKyc(userId as string),
  });
}

export function isKycComplete(profile: KycProfile | null | undefined) {
  return profile?.status === "complete";
}
