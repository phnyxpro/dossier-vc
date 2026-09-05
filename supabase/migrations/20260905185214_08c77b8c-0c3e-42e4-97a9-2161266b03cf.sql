ALTER TABLE public.capital_requests
  ADD COLUMN IF NOT EXISTS business_overview text,
  ADD COLUMN IF NOT EXISTS use_of_funds text;