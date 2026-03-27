-- Allow admins/gestors to read all users
DROP POLICY IF EXISTS "usuario_ve_proprio_perfil" ON public.usuarios;
CREATE POLICY "usuario_ve_perfil" ON public.usuarios
  FOR SELECT TO public
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.perfil IN ('admin', 'gestor')
    )
  );

-- Allow admins/gestors to update other users
DROP POLICY IF EXISTS "usuario_atualiza_proprio_perfil" ON public.usuarios;
CREATE POLICY "usuario_atualiza_perfil" ON public.usuarios
  FOR UPDATE TO public
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.perfil IN ('admin', 'gestor')
    )
  );