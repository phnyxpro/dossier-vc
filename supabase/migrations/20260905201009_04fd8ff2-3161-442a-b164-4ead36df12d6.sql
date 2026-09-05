CREATE TYPE public.app_role AS ENUM ('business', 'provider');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "claim provider role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND role = 'provider');

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.dossier_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.capital_requests(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  share_code text NOT NULL UNIQUE,
  invited_email text,
  provider_org text,
  status text NOT NULL DEFAULT 'invited',
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX dossier_shares_request_idx ON public.dossier_shares (request_id);
CREATE INDEX dossier_shares_provider_idx ON public.dossier_shares (provider_id);
CREATE INDEX dossier_shares_email_idx ON public.dossier_shares (lower(invited_email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dossier_shares TO authenticated;
GRANT ALL ON public.dossier_shares TO service_role;
ALTER TABLE public.dossier_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages shares" ON public.dossier_shares FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "provider reads own shares" ON public.dossier_shares FOR SELECT TO authenticated
  USING (auth.uid() = provider_id);

CREATE TABLE public.provider_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL UNIQUE REFERENCES public.dossier_shares(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.capital_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_org text,
  status text NOT NULL DEFAULT 'reviewing',
  notes text NOT NULL DEFAULT '',
  requested_docs text[] NOT NULL DEFAULT '{}',
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX provider_reviews_request_idx ON public.provider_reviews (request_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_reviews TO authenticated;
GRANT ALL ON public.provider_reviews TO service_role;
ALTER TABLE public.provider_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provider manages own reviews" ON public.provider_reviews FOR ALL TO authenticated
  USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "owner reads reviews on own dossiers" ON public.provider_reviews FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);
CREATE TRIGGER provider_reviews_updated_at BEFORE UPDATE ON public.provider_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.provider_review_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL UNIQUE REFERENCES public.provider_reviews(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  financials integer,
  security integer,
  management integer,
  documentation integer,
  private_comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_review_scores TO authenticated;
GRANT ALL ON public.provider_review_scores TO service_role;
ALTER TABLE public.provider_review_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provider manages own scores" ON public.provider_review_scores FOR ALL TO authenticated
  USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);
CREATE TRIGGER provider_review_scores_updated_at BEFORE UPDATE ON public.provider_review_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();