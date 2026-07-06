REVOKE EXECUTE ON FUNCTION public.get_shared_concept(uuid) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_concept(uuid) TO service_role;