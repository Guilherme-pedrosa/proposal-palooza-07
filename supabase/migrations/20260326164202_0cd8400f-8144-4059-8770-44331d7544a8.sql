
-- Insert mock products for Sprint 03
INSERT INTO public.produtos_gc
  (gc_id, codigo, nome, descricao, categoria, tipo, preco_venda, preco_locacao_mensal, unidade, estoque_atual, destaque, foto_url)
VALUES
  ('gc-prod-001','RAT-ICOMBI-10','Rational iCombi Pro 10 GN 1/1',
   'Forno combinado Rational iCombi Pro com 10 níveis GN 1/1. Tecnologia de inteligência artificial iCookingSuite. Economia de energia até 70% vs fornos convencionais. Produção de até 96 refeições/hora. Limpeza automática iCareSystem. Conectividade ConnectedCooking. Ideal para restaurantes, hotéis e catering de médio e grande porte.',
   'forno_combinado','produto', 89900.00, 2800.00, 'UN', 3, true, NULL),
  ('gc-prod-002','RAT-ICOMBI-6','Rational iCombi Pro 6 GN 1/1',
   'Forno combinado Rational iCombi Pro com 6 níveis GN 1/1. Perfeito para restaurantes até 80 refeições/hora. Mesmo sistema de IA do modelo maior em formato compacto. Cabe em bancada de cozinha padrão.',
   'forno_combinado','produto', 62000.00, 1900.00, 'UN', 5, true, NULL),
  ('gc-prod-003','RAT-IVARIO-2-1','Rational iVario Pro 2-1',
   'Panela de pressão multifuncional Rational iVario Pro 2-1. Frita, cozinha sob pressão, braseia, ferve e refoga com precisão. Substitui fritadeira, caldeirão, rondeau e panela de pressão. 2x 25 litros independentes. Temperatura 30°C a 200°C.',
   'forno_combinado','produto', 75000.00, 2400.00, 'UN', 2, true, NULL),
  ('gc-prod-004','REF-CAM-10M2','Câmara Fria Modular 10m²',
   'Câmara fria modular para conservação de alimentos entre -5°C e +5°C. Painel de 100mm de espessura, piso em alumínio antiderrapante. Condensador remoto ou monobloco. Instalação em 4 horas. Certificada ANVISA/RDC 216.',
   'refrigeracao','produto', 28000.00, 900.00, 'UN', 4, false, NULL),
  ('gc-prod-005','REF-EXPO-4P','Expositor Refrigerado 4 Portas',
   'Expositor refrigerado vertical 4 portas. Temperatura 0°C a +8°C. Iluminação LED interna. Capacidade 1200L. Ideal para buffets e serviço de balcão. Display digital de temperatura. Alarme de porta aberta.',
   'refrigeracao','produto', 18500.00, 650.00, 'UN', 7, false, NULL),
  ('gc-prod-006','SRV-PREV-RATIONAL','Manutenção Preventiva Rational (anual)',
   'Contrato de manutenção preventiva anual para fornos Rational. Inclui: 2 visitas técnicas/ano, limpeza profunda, calibração de sondas, verificação de gaxetas, atualização de software, relatório técnico com fotos. Técnicos certificados Rational.',
   'servico','servico', 3600.00, NULL, 'CONTRATO', 999, false, NULL),
  ('gc-prod-007','SRV-PCM-MENSAL','Contrato PCM Mensal — Cozinha Completa',
   'Contrato PCM (Peças, Mão de Obra e Chamadas) mensal para cozinha profissional completa. Inclui: visitas preventivas mensais, atendimento corretivo ilimitado, peças inclusas (lista negociada), SLA 4h para equipamentos críticos, relatório mensal, suporte técnico via WhatsApp 7/7.',
   'servico','servico', NULL, 1800.00, 'MÊS', 999, true, NULL),
  ('gc-prod-008','SRV-COIFA-COMP','Higienização Técnica Coifa Completa',
   'Higienização técnica de coifa e sistema de exaustão conforme ABNT NBR 14518 e NR23. Inclui: desmontagem dos filtros, limpeza química com desengraxante alcalino, higienização do duto, limpeza da caixa coletora, relatório fotográfico antes/após, laudo técnico assinado. Certificado de conformidade incluso.',
   'servico','servico', 850.00, NULL, 'SV', 999, false, NULL),
  ('gc-prod-009','QUI-DESEN-20L','Desengraxante Industrial WeDo Clean 20L',
   'Desengraxante alcalino concentrado para equipamentos de cozinha profissional. Dilução 1:20. Aprovado para uso em superfícies de aço inox. Biodegradável. Certificado ANVISA. Remove gordura carbonizada de grades, grelhas e fornos. Rendimento: 400L de solução pronta.',
   'quimicos','produto', 180.00, NULL, 'BALDE', 45, false, NULL),
  ('gc-prod-010','QUI-SANIT-5L','Sanitizante Neutro WeDo San 5L',
   'Sanitizante neutro pronto para uso para higienização de superfícies em contato com alimentos. Atende RDC 216/ANVISA. Não requer enxágue em diluições até 200ppm. Aprovado para cozinhas industriais e food service.',
   'quimicos','produto', 65.00, NULL, 'GALÃO', 80, false, NULL)
ON CONFLICT (gc_id) DO NOTHING;

-- Add RLS policies for INSERT and UPDATE on produtos_gc (for photo management)
CREATE POLICY "autenticados_inserem_produtos" ON public.produtos_gc
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "autenticados_atualizam_produtos" ON public.produtos_gc
  FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated');

-- Add unique constraint on gc_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'produtos_gc_gc_id_key'
  ) THEN
    ALTER TABLE public.produtos_gc ADD CONSTRAINT produtos_gc_gc_id_key UNIQUE (gc_id);
  END IF;
END $$;
