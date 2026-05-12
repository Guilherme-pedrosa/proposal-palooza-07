CREATE OR REPLACE FUNCTION public.get_team_members()
RETURNS TABLE (id uuid, nome text, email text, perfil text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.nome, u.email, u.perfil
  FROM public.usuarios u
  WHERE u.ativo IS TRUE
  ORDER BY u.nome;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_members() TO authenticated;