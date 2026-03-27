
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  name text NOT NULL DEFAULT 'WeDo Cozinhas',
  phone text DEFAULT '',
  email text DEFAULT '',
  cnpj text DEFAULT '',
  address text DEFAULT '',
  vision text DEFAULT '',
  mission text DEFAULT '',
  values text[] DEFAULT '{}',
  clients jsonb DEFAULT '[]',
  brands jsonb DEFAULT '[]',
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados_leem_company_settings" ON public.company_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "autenticados_atualizam_company_settings" ON public.company_settings
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "autenticados_inserem_company_settings" ON public.company_settings
  FOR INSERT TO authenticated WITH CHECK (true);

-- Insert default row
INSERT INTO public.company_settings (name, phone, cnpj, vision, mission, values)
VALUES (
  'WeDo Cozinhas',
  '(62) 99446-6458',
  '43.572.954/0001-81',
  'Ser reconhecida na esfera nacional e internacional como uma empresa de excelência, qualidade e preço justo, em todas as áreas de atuação.',
  'Dar suporte nas fases essenciais da cadeia de suprimento dos clientes, prestando serviços de qualidade para resolução de problemas adequados à realidade do processo no qual estivermos inseridos.',
  ARRAY['Segurança', 'Pessoas', 'Meio Ambiente', 'Qualidade', 'Foco no cliente', 'Melhoria Contínua']
);
