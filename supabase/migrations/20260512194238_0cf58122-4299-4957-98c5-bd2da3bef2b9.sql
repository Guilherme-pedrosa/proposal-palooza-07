
ALTER TABLE public.tabelas_preco
  ADD COLUMN IF NOT EXISTS markup_padrao numeric NOT NULL DEFAULT 30;

UPDATE public.tabelas_preco SET markup_padrao = 58 WHERE gc_tipo_id = '576894';
UPDATE public.tabelas_preco SET markup_padrao = 105 WHERE gc_tipo_id = '509609';
UPDATE public.tabelas_preco SET markup_padrao = 70 WHERE gc_tipo_id = '509605';
UPDATE public.tabelas_preco SET markup_padrao = 37 WHERE gc_tipo_id = '596115';
UPDATE public.tabelas_preco SET markup_padrao = 28 WHERE gc_tipo_id = '596116';
UPDATE public.tabelas_preco SET markup_padrao = 23 WHERE gc_tipo_id = '596118';
UPDATE public.tabelas_preco SET markup_padrao = 50 WHERE gc_tipo_id = '509606';
UPDATE public.tabelas_preco SET markup_padrao = 13 WHERE gc_tipo_id = '596109';
UPDATE public.tabelas_preco SET markup_padrao = 35 WHERE gc_tipo_id = '590124';
UPDATE public.tabelas_preco SET markup_padrao = 23 WHERE gc_tipo_id = '596111';
UPDATE public.tabelas_preco SET markup_padrao = 129 WHERE gc_tipo_id = '585751';
UPDATE public.tabelas_preco SET markup_padrao = 135 WHERE gc_tipo_id = '509604';
