-- 1. Remove self-service provider role escalation
DROP POLICY IF EXISTS "claim provider role" ON public.user_roles;

-- Verified server-side path: a user may only hold the provider role when an
-- invitation or share code has actually been issued to them.
CREATE OR REPLACE FUNCTION public.has_provider_invitation(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dossier_shares s
    JOIN auth.users u ON u.id = _user_id
    WHERE s.revoked_at IS NULL
      AND (
        s.provider_id = _user_id
        OR lower(s.invited_email) = lower(u.email)
      )
  )
$$;

REVOKE ALL ON FUNCTION public.has_provider_invitation(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.has_provider_invitation(uuid) TO authenticated, service_role;

-- 2. Providers only see shares actually assigned to them and still active,
--    so share codes are never readable before a verified claim.
DROP POLICY IF EXISTS "provider reads own shares" ON public.dossier_shares;
CREATE POLICY "provider reads claimed shares"
ON public.dossier_shares
FOR SELECT
TO authenticated
USING (auth.uid() = provider_id AND revoked_at IS NULL);