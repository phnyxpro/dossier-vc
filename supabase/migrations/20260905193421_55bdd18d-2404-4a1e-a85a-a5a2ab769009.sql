CREATE TABLE public.dossier_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.capital_requests(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, section_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dossier_sections TO authenticated;
GRANT ALL ON public.dossier_sections TO service_role;

ALTER TABLE public.dossier_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own dossier sections" ON public.dossier_sections
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX dossier_sections_request_idx ON public.dossier_sections (request_id, sort_order);

CREATE TRIGGER set_dossier_sections_updated_at
  BEFORE UPDATE ON public.dossier_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();