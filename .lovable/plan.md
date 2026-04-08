## Plano de Implementação — Simulador ROI Rational

### Pré-requisito: Secrets
- ❌ `OPENAI_API_KEY` — **não encontrada**, preciso pedir
- ❌ `GECKO_API_KEY` — **não encontrada**, preciso pedir
- Vou pedir as duas antes de criar a Edge Function

### Fase 1: Banco de dados
- Criar tabela `insumos_referencia` com 25+ insumos, preços, rendimentos, campos calculados
- Seed com dados de preços atacado GO/SP
- RLS: leitura para autenticados, escrita para admin/gestor

### Fase 2: Edge Function `analyze-restaurant-menu`
- Extrai cardápio do iFood via GeckoAPI
- Busca insumos do banco
- Envia para OpenAI (GPT-4o-mini) analisar prato a prato
- Retorna projeção de custos estruturada em JSON

### Fase 3: Nova página `/roi` (substituir o SimuladorROI atual)
- **Bloco A**: Seleção de cliente + proposta (autocomplete)
- **Bloco B**: Campo para colar link iFood + botão Analisar
- **Bloco C**: Custos operacionais auto-preenchidos pela IA (editáveis)
- **Bloco D**: Sliders de percentuais de economia
- **Bloco E**: Preview em tempo real (economia, payback, ROI)
- Tudo reativo, mobile-friendly

### Fase 4: PDF de 2 páginas
- **Página 1**: Tabela de economia + 3 cards (payback, anual, 5 anos)
- **Página 2**: Gráfico de payback (AreaChart recharts) + argumentos
- Estilo similar a relatórios de energia solar
- html2canvas + jspdf, A4 portrait

### Fase 5: Admin de preços
- Aba "Base de Insumos" na tela de configurações
- Tabela editável com todos os insumos
- CRUD completo

### Rota
- `/roi` (protegida) — substituir o `/simulador-roi` atual
