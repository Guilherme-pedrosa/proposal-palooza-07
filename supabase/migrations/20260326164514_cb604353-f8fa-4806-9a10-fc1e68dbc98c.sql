
-- Insert mock oportunidades for Sprint 04
INSERT INTO public.oportunidades
  (titulo, cliente_id, etapa, tipo_venda, valor_estimado, probabilidade,
   data_fechamento_prevista, origem, temperatura)
SELECT
  'Fornos Rational iCombi 10 níveis',
  (SELECT id FROM clientes_gc WHERE gc_id='mock-001' LIMIT 1),
  'proposta_enviada', 'equipamento_novo', 89900.00, 60,
  NOW() + interval '30 days', 'visita_espontanea', 'quente'
WHERE EXISTS (SELECT 1 FROM clientes_gc WHERE gc_id='mock-001');

INSERT INTO public.oportunidades
  (titulo, cliente_id, etapa, tipo_venda, valor_estimado, probabilidade,
   data_fechamento_prevista, origem, temperatura)
SELECT
  'Contrato PCM Cozinha Completa — Anual',
  (SELECT id FROM clientes_gc WHERE gc_id='mock-002' LIMIT 1),
  'negociacao', 'contrato_pcm', 21600.00, 80,
  NOW() + interval '10 days', 'indicacao', 'quente'
WHERE EXISTS (SELECT 1 FROM clientes_gc WHERE gc_id='mock-002');

INSERT INTO public.oportunidades
  (titulo, cliente_id, etapa, tipo_venda, valor_estimado, probabilidade,
   data_fechamento_prevista, origem, temperatura)
SELECT
  'Câmaras Frias 3 unidades',
  (SELECT id FROM clientes_gc WHERE gc_id='mock-004' LIMIT 1),
  'visita_tecnica', 'equipamento_novo', 84000.00, 40,
  NOW() + interval '45 days', 'prospeccao_ativa', 'morno'
WHERE EXISTS (SELECT 1 FROM clientes_gc WHERE gc_id='mock-004');

INSERT INTO public.oportunidades
  (titulo, cliente_id, etapa, tipo_venda, valor_estimado, probabilidade,
   data_fechamento_prevista, origem, temperatura)
SELECT
  'Higienização Coifa — Shopping Center',
  (SELECT id FROM clientes_gc WHERE gc_id='mock-003' LIMIT 1),
  'prospeccao', 'higienizacao_coifa', 4500.00, 10,
  NOW() + interval '60 days', 'whatsapp', 'frio'
WHERE EXISTS (SELECT 1 FROM clientes_gc WHERE gc_id='mock-003');

INSERT INTO public.oportunidades
  (titulo, cliente_id, etapa, tipo_venda, valor_estimado, probabilidade,
   data_fechamento_prevista, origem, temperatura)
SELECT
  'Químicos WeDo Clean — Rede Fast Food',
  (SELECT id FROM clientes_gc WHERE gc_id='mock-005' LIMIT 1),
  'qualificacao', 'quimicos', 12000.00, 25,
  NOW() + interval '20 days', 'prospeccao_ativa', 'morno'
WHERE EXISTS (SELECT 1 FROM clientes_gc WHERE gc_id='mock-005');

-- Insert motivos de perda
INSERT INTO public.motivos_perda (descricao) VALUES
  ('Preço acima do orçamento'),
  ('Optou pela concorrência'),
  ('Projeto cancelado/adiado'),
  ('Sem resposta do cliente'),
  ('Decidiu não investir agora'),
  ('Comprou usado/recondicionado')
ON CONFLICT DO NOTHING;
