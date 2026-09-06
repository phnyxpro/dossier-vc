CREATE TABLE public.kyc_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_name text NOT NULL DEFAULT '',
  date_of_birth date,
  nationality text NOT NULL DEFAULT '',
  id_type text NOT NULL DEFAULT '',
  id_number text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address_line text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'Trinidad and Tobago',
  business_role text NOT NULL DEFAULT '',
  company_name text NOT NULL DEFAULT '',
  source_of_funds text NOT NULL DEFAULT '',
  is_pep boolean NOT NULL DEFAULT false,
  declaration_accepted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'in_progress',
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.kyc_profiles TO authenticated;
GRANT ALL ON public.kyc_profiles TO service_role;

ALTER TABLE public.kyc_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own kyc read" ON public.kyc_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own kyc insert" ON public.kyc_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own kyc update" ON public.kyc_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER kyc_profiles_updated_at BEFORE UPDATE ON public.kyc_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();