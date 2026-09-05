ALTER TABLE public.provider_reviews ADD COLUMN IF NOT EXISTS closed boolean NOT NULL DEFAULT false;
ALTER TABLE public.provider_reviews ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;