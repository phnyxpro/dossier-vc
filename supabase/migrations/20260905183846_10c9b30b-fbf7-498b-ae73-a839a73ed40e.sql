CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Trinidad and Tobago',
  industry TEXT,
  years_in_operation NUMERIC,
  annual_revenue NUMERIC,
  currency TEXT NOT NULL DEFAULT 'TTD',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own companies" ON public.companies FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.capital_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies ON DELETE CASCADE,
  reference TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'debt',
  financing_subtype TEXT,
  purpose TEXT,
  amount_sought NUMERIC,
  currency TEXT NOT NULL DEFAULT 'TTD',
  term_value NUMERIC,
  term_unit TEXT DEFAULT 'months',
  existing_debt NUMERIC,
  security_description TEXT,
  repayment_primary TEXT,
  repayment_secondary TEXT,
  repayment_explanation TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  readiness_status TEXT NOT NULL DEFAULT 'not_started',
  current_step INTEGER NOT NULL DEFAULT 1,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capital_requests TO authenticated;
GRANT ALL ON public.capital_requests TO service_role;
ALTER TABLE public.capital_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own requests" ON public.capital_requests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER capital_requests_updated_at BEFORE UPDATE ON public.capital_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX capital_requests_user_idx ON public.capital_requests (user_id, updated_at DESC);

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.capital_requests ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'missing',
  storage_path TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  extraction_status TEXT NOT NULL DEFAULT 'idle',
  extraction_error TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own documents" ON public.documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX documents_request_idx ON public.documents (request_id);

CREATE TABLE public.extracted_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.capital_requests ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents ON DELETE SET NULL,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  value_text TEXT,
  value_number NUMERIC,
  unit TEXT,
  period TEXT,
  confidence NUMERIC,
  origin TEXT NOT NULL DEFAULT 'ai',
  status TEXT NOT NULL DEFAULT 'pending',
  source_excerpt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extracted_fields TO authenticated;
GRANT ALL ON public.extracted_fields TO service_role;
ALTER TABLE public.extracted_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fields" ON public.extracted_fields FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER extracted_fields_updated_at BEFORE UPDATE ON public.extracted_fields FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX extracted_fields_request_idx ON public.extracted_fields (request_id);

CREATE TABLE public.readiness_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.capital_requests ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.readiness_notes TO authenticated;
GRANT ALL ON public.readiness_notes TO service_role;
ALTER TABLE public.readiness_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notes" ON public.readiness_notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX readiness_notes_request_idx ON public.readiness_notes (request_id);