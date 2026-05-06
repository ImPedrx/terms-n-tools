REVOKE EXECUTE ON FUNCTION public.current_client_id(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_auksys_admin(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_client_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_auksys_admin(uuid) TO authenticated;