import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cardapio_url, refeicoes_dia, dias_mes = 26 } = await req.json();

    if (!cardapio_url || !refeicoes_dia) {
      return new Response(
        JSON.stringify({ error: "cardapio_url e refeicoes_dia são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY")?.trim();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY não configurada");

    // 1. Buscar base de insumos do Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: insumos, error: insumosError } = await supabase
      .from("insumos_referencia")
      .select("nome, categoria, preco_kg_referencia, rendimento_bruto, rendimento_coccao, porcao_padrao_g, custo_por_porcao, tipo_coccao, usa_oleo, qtd_oleo_ml_porcao, energia_kwh_porcao, tempo_preparo_min, aliases")
      .eq("ativo", true);

    if (insumosError) throw new Error(`Erro ao buscar insumos: ${insumosError.message}`);

    console.log(`Analisando cardápio: ${cardapio_url} (${refeicoes_dia} ref/dia × ${dias_mes} dias)`);

    // 2. UMA chamada ao Perplexity — ele acessa a URL e faz tudo
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: `Você é um consultor financeiro especialista em food service. 
Sua tarefa: acessar a URL do cardápio, extrair TODOS os pratos, 
e calcular custos operacionais mensais prato a prato.

BASE DE CUSTOS DE INSUMOS (usar obrigatoriamente):
${JSON.stringify(insumos)}

VOLUME INFORMADO: ${refeicoes_dia} refeições/dia × ${dias_mes} dias/mês

REGRA CRÍTICA: Extrair e analisar TODOS os pratos do cardápio que 
envolvem preparo em cozinha. NÃO resumir. NÃO agrupar. NÃO pegar 
só os principais. Cada prato é uma linha separada.

Lista MÍNIMA de categorias que devem aparecer se existirem no cardápio:
- Petiscos/entradas (bolinhos, croquetas, iscas, caldos, escondidinho)
- Pratos executivos (todos)
- Pratos completos/compartilhar (todos)
- Pratos individuais (todos)
- Porções de carne (costela, picanha, carne de sol, filé mignon na chapa)
- Peixes e frutos do mar (tilápia, camarão, lambari)
- Frango (passarinho, parmegiana, iscas)
- Suínos (costelinha, torresmo, lombo)
- Guarnições com preparo (batata frita, mandioca frita, banana milanesa, feijão tropeiro)
- Sobremesas com preparo

Ignorar APENAS: bebidas prontas (refrigerante, cerveja, água, suco, 
vinho, café cápsula), molhos avulsos e itens sem preparo em cozinha.

Se retornar menos de 15 pratos de um cardápio com 40+, sua resposta está ERRADA.

PARA CADA PRATO:
1. Identificar o insumo principal da base (match por nome/aliases)
2. Se não encontrar match exato, usar o insumo mais próximo
3. Usar custo_por_porcao da base
4. Estimar participação nas vendas (% dos pedidos)
5. Calcular: custo_porcao × ${refeicoes_dia} × participacao × ${dias_mes}

REGRAS DE PARTICIPAÇÃO:
- Pratos carro-chefe (mais baratos e populares): 15-25% cada
- Pratos premium (mais caros): 5-10% cada  
- Executivos/individuais: 5-10% cada
- Petiscos e entradas: 2-5% cada
- Guarnições (batata, mandioca, banana): 3-5% cada
- A soma de todas as participações deve dar 100%

Para óleo: somar qtd_oleo_ml_porcao de cada prato que usa_oleo=true, ponderar pela participação, converter para litros/mês, multiplicar pelo preço do óleo da base.
Para energia: somar energia_kwh_porcao de cada prato, ponderar pela participação, × ${refeicoes_dia} × ${dias_mes}.
Para mão de obra: somar tempo_preparo_min, ponderar, converter em horas/mês.

IMPORTANTE: Ser CONSERVADOR. Na dúvida, projetar pra baixo.

RETORNAR EXCLUSIVAMENTE JSON válido neste formato:
{
  "restaurante": {
    "nome": "...",
    "nota_ifood": 0,
    "qtd_pratos_cardapio": 45,
    "ticket_medio": 55.00,
    "tipo_operacao_inferido": "churrascaria",
    "metodo_coccao_predominante": "brasa",
    "categorias": ["Carnes", "Petiscos", "Executivos", "Peixes"]
  },
  "pratos_analisados": [
    {
      "prato": "Costela ao bafo 500g",
      "preco_venda": 124.90,
      "insumo_match": "Costela bovina",
      "custo_porcao": 19.95,
      "participacao_vendas": 0.15,
      "porcoes_dia": 30,
      "custo_mensal": 15561.00,
      "tipo_coccao": "brasa",
      "usa_oleo": false
    }
  ],
  "totais_mensais": {
    "proteinas_reais": 0,
    "energia_kwh": 0,
    "custo_kwh_usado": 0.80,
    "energia_reais": 0,
    "gordura_litros": 0,
    "gordura_reais": 0,
    "horas_cozinha": 0,
    "custo_hora": 23,
    "mao_obra_reais": 0,
    "agua_descalcificacao_reais": 270,
    "custo_total_operacional": 0
  },
  "resumo_economia_rational": {
    "economia_proteina_20pct": 0,
    "economia_energia_50pct": 0,
    "economia_gordura_80pct": 0,
    "economia_mao_obra_40pct": 0,
    "economia_agua_100pct": 0,
    "economia_mensal_total": 0,
    "economia_anual": 0
  }
}`
          },
          {
            role: "user",
            content: `Acesse esta URL do cardápio e analise TODOS os pratos: ${cardapio_url}`
          }
        ],
        max_tokens: 16000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Perplexity error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido, tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro na análise do cardápio", details: `API retornou ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "IA não retornou conteúdo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extrair JSON da resposta (Perplexity pode incluir texto ao redor)
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Nenhum JSON encontrado na resposta");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("JSON parse error:", content);
      return new Response(
        JSON.stringify({ error: "IA retornou formato inválido", raw: content?.substring(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Análise concluída: ${parsed.pratos_analisados?.length ?? 0} pratos`);

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-restaurant-menu error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
