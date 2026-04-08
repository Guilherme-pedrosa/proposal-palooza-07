
CREATE TABLE public.insumos_referencia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL,
  nome TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  preco_kg_referencia DECIMAL NOT NULL,
  preco_kg_min DECIMAL,
  preco_kg_max DECIMAL,
  rendimento_bruto DECIMAL NOT NULL,
  rendimento_coccao DECIMAL NOT NULL,
  rendimento_final DECIMAL GENERATED ALWAYS AS (rendimento_bruto * rendimento_coccao) STORED,
  porcao_padrao_g INTEGER NOT NULL,
  custo_por_porcao DECIMAL GENERATED ALWAYS AS (
    (porcao_padrao_g::decimal / 1000.0 / (rendimento_bruto * rendimento_coccao)) * preco_kg_referencia
  ) STORED,
  tipo_coccao TEXT[] DEFAULT '{}',
  usa_oleo BOOLEAN DEFAULT false,
  qtd_oleo_ml_porcao INTEGER DEFAULT 0,
  energia_kwh_porcao DECIMAL DEFAULT 0,
  tempo_preparo_min INTEGER DEFAULT 0,
  fonte_preco TEXT,
  ativo BOOLEAN DEFAULT true,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.insumos_referencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem insumos" ON public.insumos_referencia
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin gestor gerencia insumos" ON public.insumos_referencia
  FOR ALL TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()))
  WITH CHECK (public.is_admin_or_gestor(auth.uid()));

INSERT INTO public.insumos_referencia (categoria, nome, aliases, preco_kg_referencia, preco_kg_min, preco_kg_max, rendimento_bruto, rendimento_coccao, porcao_padrao_g, tipo_coccao, usa_oleo, qtd_oleo_ml_porcao, energia_kwh_porcao, tempo_preparo_min, fonte_preco) VALUES
('carne_bovina','Costela bovina', ARRAY['costela','costela de vaca','costelão','costela no bafo','costela fogo de chão','costela assada','costela defumada','costela barreado'], 21.00, 18.00, 25.00, 0.70, 0.60, 400, ARRAY['brasa','forno','defumado'], false, 0, 0.65, 180, 'Scot/Varejo GO'),
('carne_bovina','Picanha', ARRAY['picanha','picanha na brasa','picanha fatiada','picanha grelhada','picanha ao ponto','picanha na chapa'], 82.00, 70.00, 100.00, 0.95, 0.80, 300, ARRAY['grelha','brasa','chapa'], false, 0, 0.30, 15, 'CEPEA'),
('carne_bovina','Fraldinha', ARRAY['fraldinha','fraldinha grelhada','fraldinha na brasa','fraldinha ao molho','fraldinha recheada'], 45.00, 42.00, 50.00, 0.90, 0.72, 350, ARRAY['grelha','brasa','forno'], false, 0, 0.35, 20, 'Varejo GO'),
('carne_bovina','Alcatra', ARRAY['alcatra','alcatra grelhada','bife de alcatra','alcatra acebolada','baby beef'], 50.00, 45.00, 58.00, 0.92, 0.75, 300, ARRAY['grelha','chapa','frigideira'], true, 15, 0.25, 12, 'CEPEA'),
('carne_bovina','Filé mignon', ARRAY['filé mignon','filé','filet','mignon','medalhão','tournedos','steak'], 100.00, 85.00, 130.00, 0.98, 0.82, 250, ARRAY['grelha','chapa','frigideira'], true, 20, 0.20, 10, 'CEPEA'),
('carne_bovina','Maminha', ARRAY['maminha','maminha grelhada','maminha assada','maminha na brasa'], 53.00, 48.00, 60.00, 0.92, 0.75, 300, ARRAY['grelha','brasa','forno'], false, 0, 0.30, 18, 'Varejo GO'),
('carne_bovina','Cupim', ARRAY['cupim','cupim assado','cupim defumado','cupim na brasa','cupim recheado'], 40.00, 35.00, 48.00, 0.80, 0.58, 350, ARRAY['forno','brasa','defumado'], false, 0, 0.80, 240, 'Varejo GO'),
('carne_bovina','Acém', ARRAY['acém','carne de panela','carne cozida','carne de segunda','guisado','carne moída','músculo','carne ensopada'], 32.00, 28.00, 38.00, 0.85, 0.65, 300, ARRAY['cozido','panela_pressao','ensopado'], false, 0, 0.50, 90, 'Varejo GO'),
('carne_bovina','Contrafilé', ARRAY['contrafilé','bife','entrecôte','bife acebolado','bife a cavalo'], 55.00, 48.00, 65.00, 0.93, 0.78, 300, ARRAY['grelha','chapa','frigideira'], true, 15, 0.25, 10, 'CEPEA'),
('carne_bovina','Linguiça bovina', ARRAY['linguiça','linguiça bovina','linguiça artesanal','linguiça toscana','calabresa'], 22.00, 18.00, 28.00, 1.00, 0.80, 200, ARRAY['grelha','brasa','chapa'], false, 0, 0.20, 12, 'Varejo'),
('carne_suina','Costela suína', ARRAY['costela suína','costelinha','ribs','costela de porco','costelinha ao molho barbecue'], 25.00, 22.00, 30.00, 0.75, 0.62, 350, ARRAY['forno','brasa','defumado'], false, 0, 0.60, 120, 'Varejo'),
('carne_suina','Lombo suíno', ARRAY['lombo','lombo suíno','lombo recheado','lombo assado','lombo à milanesa'], 32.00, 28.00, 38.00, 0.90, 0.75, 300, ARRAY['forno','grelha','fritura'], true, 30, 0.40, 45, 'Varejo'),
('carne_suina','Pernil suíno', ARRAY['pernil','pernil assado','pernil desfiado','pernil de porco'], 18.00, 15.00, 22.00, 0.80, 0.65, 350, ARRAY['forno','cozido'], false, 0, 0.55, 150, 'Varejo'),
('frango','Peito de frango', ARRAY['peito de frango','filé de frango','frango grelhado','frango','peito','frango à parmegiana','frango empanado'], 20.00, 18.00, 24.00, 0.90, 0.74, 250, ARRAY['grelha','forno','chapa','fritura'], true, 30, 0.20, 12, 'CEPEA'),
('frango','Coxa e sobrecoxa', ARRAY['coxa','sobrecoxa','coxa e sobrecoxa','frango assado','coxinha da asa','frango caipira','galinhada'], 14.00, 12.00, 18.00, 0.75, 0.70, 300, ARRAY['forno','brasa','fritura','cozido'], true, 20, 0.25, 25, 'CEPEA'),
('peixe','Tilápia', ARRAY['tilápia','filé de tilápia','peixe grelhado','peixe frito','tilápia empanada'], 36.00, 30.00, 45.00, 0.95, 0.85, 250, ARRAY['grelha','forno','fritura'], true, 50, 0.20, 10, 'CEAGESP'),
('peixe','Salmão', ARRAY['salmão','salmão grelhado','salmão ao molho','sashimi','salmão defumado'], 65.00, 55.00, 80.00, 0.95, 0.83, 200, ARRAY['grelha','forno'], true, 10, 0.18, 10, 'CEAGESP'),
('peixe','Camarão', ARRAY['camarão','camarão alho e óleo','camarão empanado','bobó de camarão','moqueca de camarão'], 75.00, 55.00, 100.00, 0.80, 0.80, 200, ARRAY['frigideira','forno','cozido'], true, 30, 0.20, 15, 'CEAGESP'),
('graos','Arroz', ARRAY['arroz','arroz branco','arroz integral','arroz carreteiro','arroz à grega','arroz de forno'], 5.50, 4.50, 7.00, 1.00, 2.50, 150, ARRAY['cozido'], false, 0, 0.08, 25, 'Varejo'),
('graos','Feijão', ARRAY['feijão','feijão tropeiro','feijoada','feijão preto','feijão carioca','feijão gordo'], 9.00, 7.00, 12.00, 1.00, 2.30, 150, ARRAY['cozido','panela_pressao'], false, 0, 0.12, 60, 'Varejo'),
('vegetal','Batata frita', ARRAY['batata frita','fritas','french fries','batata palito','batata rústica'], 6.00, 4.50, 8.00, 0.80, 0.75, 200, ARRAY['fritura'], true, 200, 0.15, 8, 'CEAGESP'),
('vegetal','Mandioca frita', ARRAY['mandioca frita','macaxeira frita','aipim frito','mandioca'], 5.00, 3.50, 7.00, 0.70, 0.70, 200, ARRAY['fritura','cozido'], true, 200, 0.15, 15, 'CEAGESP'),
('vegetal','Salada', ARRAY['salada','salada verde','salada mista','salada caesar','salada tropical'], 8.00, 5.00, 12.00, 0.70, 1.00, 150, ARRAY['cru'], false, 0, 0.00, 5, 'CEAGESP'),
('massa','Massa/Macarrão', ARRAY['macarrão','espaguete','penne','lasanha','nhoque','massa','talharim','fettuccine'], 8.00, 5.00, 12.00, 1.00, 2.20, 250, ARRAY['cozido','forno'], false, 0, 0.15, 20, 'Varejo'),
('carne_bovina','Hambúrguer artesanal', ARRAY['hambúrguer','burger','smash','smash burger','blend','hambúrguer artesanal','cheeseburger'], 38.00, 30.00, 50.00, 0.95, 0.75, 180, ARRAY['chapa','grelha'], true, 15, 0.15, 8, 'Varejo'),
('oleo','Óleo de soja', ARRAY['óleo','óleo de soja','óleo de fritura','óleo vegetal'], 8.50, 7.00, 10.00, 1.00, 1.00, 0, ARRAY['fritura'], true, 0, 0.00, 0, 'Varejo');
