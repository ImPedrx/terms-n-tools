
-- 1) Audit logs: remove null-client_id bypass
DROP POLICY IF EXISTS "tenant audit insert" ON public.audit_logs;
CREATE POLICY "tenant audit insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_auksys_admin(auth.uid())
    OR client_id = public.current_client_id(auth.uid())
  );

-- 2) Drop overly-broad storage policies
DROP POLICY IF EXISTS "Anyone can read" ON storage.objects;
DROP POLICY IF EXISTS "Auth can read" ON storage.objects;
DROP POLICY IF EXISTS "Auth can delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read signed terms" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload signed terms" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete signed terms" ON storage.objects;

-- 3) company-assets: path-prefixed tenant isolation (path: {client_id}/...)
CREATE POLICY "company-assets tenant list"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (
      public.is_auksys_admin(auth.uid())
      OR (storage.foldername(name))[1] = public.current_client_id(auth.uid())::text
    )
  );

CREATE POLICY "company-assets tenant write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND (
      public.is_auksys_admin(auth.uid())
      OR (storage.foldername(name))[1] = public.current_client_id(auth.uid())::text
    )
  );

CREATE POLICY "company-assets tenant update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (
      public.is_auksys_admin(auth.uid())
      OR (storage.foldername(name))[1] = public.current_client_id(auth.uid())::text
    )
  )
  WITH CHECK (
    bucket_id = 'company-assets'
    AND (
      public.is_auksys_admin(auth.uid())
      OR (storage.foldername(name))[1] = public.current_client_id(auth.uid())::text
    )
  );

CREATE POLICY "company-assets tenant delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (
      public.is_auksys_admin(auth.uid())
      OR (storage.foldername(name))[1] = public.current_client_id(auth.uid())::text
    )
  );

-- 4) Lock down SECURITY DEFINER helper functions from direct invocation
REVOKE EXECUTE ON FUNCTION public.current_client_id(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_client_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_client_id(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_auksys_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_auksys_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_auksys_admin(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.current_client_id(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_auksys_admin(uuid) TO service_role;
