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
    const { ifood_url, refeicoes_dia, dias_mes = 26 } = await req.json();

    if (!ifood_url || !refeicoes_dia) {
      return new Response(
        JSON.stringify({ error: "URL do cardápio e refeicoes_dia são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GECKO_API_KEY = Deno.env.get("GECKO_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");

    // ── 1. EXTRAIR CARDÁPIO — decide pela fonte ──
    let cardapioData: unknown;
    let fonte: string;
    const url = ifood_url.trim();

    if (url.includes("ifood.com.br")) {
      // iFood → GeckoAPI (necessário pq iFood é client-side rendered)
      if (!GECKO_API_KEY) throw new Error("GECKO_API_KEY não configurada");

      console.log("Extraindo cardápio do iFood via GeckoAPI...");
      const geckoResponse = await fetch("https://api.geckoapi.com.br/v1/extract", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GECKO_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          target: "ifood.com.br",
          type: "pdp",
        }),
      });

      if (!geckoResponse.ok) {
        const errText = await geckoResponse.text();
        console.error("GeckoAPI error:", geckoResponse.status, errText);
        return new Response(
          JSON.stringify({
            error: "Erro ao extrair cardápio do iFood",
            details: `GeckoAPI retornou ${geckoResponse.status}`,
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      cardapioData = await geckoResponse.json();
      fonte = "ifood_gecko";
    } else {
      // Qualquer outra URL → fetch direto do HTML (páginas públicas)
      console.log("Extraindo cardápio via fetch direto:", url);
      const htmlResponse = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WeDo-ROI/1.0)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!htmlResponse.ok) {
        return new Response(
          JSON.stringify({
            error: "Erro ao acessar o site do restaurante",
            details: `O site retornou status ${htmlResponse.status}`,
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const html = await htmlResponse.text();

      // Limpar HTML pesado (tirar scripts, styles, imagens base64)
      const cleanHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/data:image[^"']*/gi, "")
        .replace(/<img[^>]*>/gi, "")
        .replace(/\s{2,}/g, " ")
        .substring(0, 50000); // Limitar a 50k chars pro token da OpenAI

      cardapioData = cleanHtml;
      fonte = "html_direto";
    }

    console.log(`Cardápio extraído com sucesso (fonte: ${fonte})`);

    // ── 2. Buscar base de insumos do Supabase ──
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: insumos, error: insumosError } = await supabase
      .from("insumos_referencia")
      .select("*")
      .eq("ativo", true);

    if (insumosError) throw new Error(`Erro ao buscar insumos: ${insumosError.message}`);

    // ── 3. Enviar para OpenAI analisar prato a prato ──
    const cardapioStr = typeof cardapioData === "string" ? cardapioData : JSON.stringify(cardapioData);

    const systemPrompt = `Você é um consultor financeiro especialista em food service.

O cardápio do restaurante foi extraído automaticamente e pode estar em um destes formatos:
- JSON estruturado (se veio do iFood via API)
- HTML de página web (se veio de Goomer, site próprio ou outra plataforma)

Em QUALQUER formato, sua tarefa é:
1. Extrair TODOS os pratos que envolvem preparo em cozinha
   (ignorar apenas bebidas prontas: refrigerantes, cervejas, águas, vinhos)
2. Para cada prato: identificar nome, preço, descrição e o insumo principal
3. Calcular o custo operacional mensal PRATO A PRATO

CARDÁPIO DO RESTAURANTE (extraído automaticamente, fonte: ${fonte}):
${cardapioStr}

VOLUME INFORMADO:
- Refeições/dia: ${refeicoes_dia}
- Dias operação/mês: ${dias_mes}

BASE DE CUSTOS DE INSUMOS (use OBRIGATORIAMENTE estes valores de referência):
${JSON.stringify(insumos)}

INSTRUÇÕES OBRIGATÓRIAS:

1. Para CADA prato do cardápio:
   a. Identificar qual insumo da base corresponde (match por nome/aliases)
   b. Usar o custo_por_porcao calculado da base
   c. Estimar participação nas vendas (% dos pedidos totais)
   d. Calcular: custo_porcao × refeicoes_dia × participacao × dias_mes

2. Regras de participação nas vendas:
   - Pratos principais de carne: 50-65% dos pedidos (distribuir entre eles)
   - Acompanhamentos: 20-30%
   - Sobremesas/bebidas: 5-15%
   - O prato mais barato e mais popular geralmente lidera as vendas
   - Pratos premium (mais caros) têm menor participação

3. Para óleo: somar qtd_oleo_ml_porcao de cada prato que usa_oleo=true, ponderar pela participação, converter para litros/mês, multiplicar pelo preço do óleo da base

4. Para energia: somar energia_kwh_porcao de cada prato, ponderar pela participação, × refeicoes_dia × dias_mes

5. Para mão de obra: somar tempo_preparo_min, ponderar, converter em horas/mês

6. IMPORTANTE: Ser CONSERVADOR. Na dúvida, projetar pra baixo. É melhor o cliente descobrir que economiza MAIS do que o projetado.

7. Se o cardápio veio em HTML e não conseguiu identificar preços, use 0 para preco_venda e foque nos custos operacionais.

RETORNAR EXCLUSIVAMENTE este JSON:
{
  "restaurante": {
    "nome": "...",
    "nota_ifood": 0,
    "qtd_pratos_cardapio": 45,
    "ticket_medio_ifood": 55.00,
    "tipo_operacao_inferido": "churrascaria",
    "metodo_coccao_predominante": "brasa",
    "categorias": ["Carnes", "Acompanhamentos", "Bebidas"]
  },
  "pratos_analisados": [
    {
      "prato_ifood": "Costela no bafo 500g",
      "preco_venda": 79.90,
      "insumo_match": "Costela bovina",
      "custo_insumo_kg": 21.00,
      "rendimento_final": 0.42,
      "porcao_g": 400,
      "kg_bruto_necessario": 0.95,
      "custo_proteina_porcao": 19.95,
      "participacao_vendas": 0.45,
      "porcoes_dia": 90,
      "custo_mensal": 46683,
      "tipo_coccao": "brasa",
      "usa_oleo": false
    }
  ],
  "totais_mensais": {
    "proteinas_reais": 84240,
    "energia_kwh": 6760,
    "custo_kwh_usado": 0.80,
    "energia_reais": 5408,
    "gordura_litros": 156,
    "gordura_reais": 1326,
    "horas_cozinha": 1200,
    "custo_hora": 23,
    "mao_obra_reais": 27600,
    "agua_descalcificacao_reais": 270,
    "custo_total_operacional": 118844
  },
  "resumo_economia_rational": {
    "economia_proteina_20pct": 16848,
    "economia_energia_50pct": 2704,
    "economia_gordura_80pct": 1061,
    "economia_mao_obra_40pct": 11040,
    "economia_agua_100pct": 270,
    "economia_mensal_total": 31923,
    "economia_anual": 383076
  }
}`;

    console.log("Enviando para OpenAI...");
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error("OpenAI error:", openaiResponse.status, errText);

      if (openaiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit da OpenAI excedido, tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro na análise pela IA", details: `OpenAI retornou ${openaiResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await openaiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "IA não retornou conteúdo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("JSON inválido da IA:", content);
      return new Response(
        JSON.stringify({ error: "IA retornou JSON inválido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Análise concluída com sucesso");

    return new Response(
      JSON.stringify({ success: true, data: parsed, fonte }),
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
