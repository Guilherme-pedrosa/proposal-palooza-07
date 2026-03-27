
CREATE OR REPLACE FUNCTION public.atualizar_segmentos_clientes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE clientes_gc c
  SET segmento = p.cnae_descricao
  FROM prospects_rf p
  WHERE REPLACE(REPLACE(REPLACE(c.cnpj, '.', ''), '/', ''), '-', '') = p.cnpj
    AND c.cnpj IS NOT NULL
    AND p.cnae_descricao IS NOT NULL
    AND (c.segmento IS NULL OR c.segmento = '');
END;
$$;
