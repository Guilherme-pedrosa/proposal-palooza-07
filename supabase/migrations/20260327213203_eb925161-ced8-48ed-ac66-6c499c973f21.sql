-- Create security definer function to check perfil without recursion
CREATE OR REPLACE FUNCTION public.is_admin_or_gestor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = _user_id AND perfil IN ('admin', 'gestor')
  )
$$;

-- Fix SELECT policy to avoid recursion
DROP POLICY IF EXISTS "usuario_ve_perfil" ON public.usuarios;
CREATE POLICY "usuario_ve_perfil" ON public.usuarios
  FOR SELECT TO public
  USING (
    id = auth.uid()
    OR public.is_admin_or_gestor(auth.uid())
  );

-- Fix UPDATE policy to avoid recursion
DROP POLICY IF EXISTS "usuario_atualiza_perfil" ON public.usuarios;
CREATE POLICY "usuario_atualiza_perfil" ON public.usuarios
  FOR UPDATE TO public
  USING (
    id = auth.uid()
    OR public.is_admin_or_gestor(auth.uid())
  );