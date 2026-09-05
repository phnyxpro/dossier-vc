CREATE TABLE public.legal_acceptances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key text NOT NULL,
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_key, version)
);

GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_acceptances TO service_role;

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own acceptances read" ON public.legal_acceptances
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own acceptances insert" ON public.legal_acceptances
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);