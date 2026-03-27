CREATE OR REPLACE FUNCTION marcar_prospects_clientes()
RETURNS void AS $$
BEGIN
  UPDATE prospects_rf SET eh_cliente_wedo = false WHERE eh_cliente_wedo = true;
  
  UPDATE prospects_rf p
  SET eh_cliente_wedo = true
  FROM clientes_gc c
  WHERE p.cnpj = REPLACE(REPLACE(REPLACE(c.cnpj, '.', ''), '/', ''), '-', '')
    AND c.cnpj IS NOT NULL;
END;
$$ LANGUAGE plpgsql;