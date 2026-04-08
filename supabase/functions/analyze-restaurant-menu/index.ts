import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_MODEL = "sonar-pro";
const PERPLEXITY_MAX_TOKENS = 16000;

const sanitizeSecret = (value?: string | null) =>
  value?.replace(/[\u0000-\u001F\u007F]/g, "").trim();

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: jsonHeaders });

const extractJsonObject = (content: string) => {
  const cleanedBase = String(content ?? "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();

  const tryParse = (value: string) => {
    const repaired = value
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .trim();
    return JSON.parse(repaired);
  };

  try {
    return tryParse(cleanedBase);
  } catch {
    // continue
  }

  const codeBlockMatch = cleanedBase.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) {
    try {
      return tryParse(codeBlockMatch[1]);
    } catch {
      // continue
    }
  }

  const objectStart = cleanedBase.search(/[\{\[]/);
  if (objectStart !== -1) {
    const opening = cleanedBase[objectStart];
    const closing = opening === "[" ? "]" : "}";
    const objectEnd = cleanedBase.lastIndexOf(closing);

    if (objectEnd > objectStart) {
      try {
        return tryParse(cleanedBase.slice(objectStart, objectEnd + 1));
      } catch {
        // continue
      }
    }
  }

  const objectMatches = cleanedBase.match(/\{[\s\S]*\}/g) ?? [];
  const arrayMatches = cleanedBase.match(/\[[\s\S]*\]/g) ?? [];
  const candidates = [...objectMatches, ...arrayMatches].sort((a, b) => b.length - a.length);

  for (const candidate of candidates) {
    try {
      return tryParse(candidate);
    } catch {
      // continue
    }
  }

  const rawPreview = cleanedBase.substring(0, 300);
  console.error("JSON parse falhou. Resposta raw:", rawPreview);
  throw new Error(`Nenhum JSON válido encontrado na resposta da IA. Preview: ${rawPreview}`);
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getDishCount = (
  payload: any,
  key: "pratos_detectados" | "pratos_analisados",
) => Array.isArray(payload?.[key]) ? payload[key].length : 0;

const getDeclaredCount = (payload: any) => {
  const value = Number(payload?.restaurante?.qtd_pratos_cardapio ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const isTruncated = (finishReason?: string | null) =>
  finishReason === "length" || finishReason === "max_tokens";

const REFUSAL_PATTERNS = [
  /n[aã]o consigo acessar/i,
  /n[aã]o posso acessar/i,
  /n[aã]o tenho acesso/i,
  /cannot access/i,
  /can'?t access/i,
  /unable to access/i,
  /n[aã]o consigo navegar/i,
  /n[aã]o posso navegar/i,
];

const isRefusal = (text: string) =>
  REFUSAL_PATTERNS.some((p) => p.test(text));

const callPerplexity = async (
  apiKey: string,
  messages: Array<{ role: "system" | "user"; content: string }>,
  stage: string,
  extraBody?: Record<string, unknown>,
) => {
  const response = await fetch(PERPLEXITY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages,
      max_tokens: PERPLEXITY_MAX_TOKENS,
      temperature: 0.1,
      ...extraBody,
    }),
  });

  const rawText = await response.text();

  if (!response.ok) {
    console.error(`Perplexity ${stage} error:`, response.status, rawText);

    if (response.status === 429) {
      throw new Error(
        "Rate limit excedido, tente novamente em alguns segundos.",
      );
    }

    throw new Error(`Erro na etapa ${stage}: API retornou ${response.status}`);
  }

  let responseJson: any;
  try {
    responseJson = JSON.parse(rawText);
  } catch {
    throw new Error(
      `A IA retornou uma resposta HTTP inválida na etapa ${stage}`,
    );
  }

  const content = responseJson?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`A IA não retornou conteúdo na etapa ${stage}`);
  }

  if (isRefusal(content)) {
    console.error(`Perplexity recusou acessar a URL na etapa ${stage}:`, content.substring(0, 300));
    throw new Error(
      `A IA não conseguiu acessar o cardápio online. Verifique se a URL está correta e acessível publicamente. Cardápios em apps como Goomer/iFood podem não ser acessíveis para análise automática.`,
    );
  }

  return {
    parsed: extractJsonObject(content),
    finishReason: responseJson?.choices?.[0]?.finish_reason ?? null,
    content,
  };
};

const buildDiscoverySystemPrompt = () =>
  `Você é um auditor de cardápio de restaurantes.

Sua única tarefa é ACESSAR a URL informada e LISTAR EXAUSTIVAMENTE todos os itens do cardápio que envolvem preparo em cozinha.

REGRA ABSOLUTA — NÃO INVENTAR PRATOS:
- Você DEVE listar SOMENTE pratos que encontrou NA URL FORNECIDA.
- Se um prato não aparece no cardápio da URL, NÃO INCLUA.
- NÃO completar o cardápio com pratos "típicos" do segmento.
- NÃO inferir que "toda churrascaria tem cupim/maminha/fraldinha".
- NÃO renomear pratos. Se no cardápio é "Costela ao Bafo", retornar "Costela ao Bafo" — não "Costela na brasa".
- Para CADA prato, incluir o campo "preco_cardapio" com o preço EXATO que aparece no site.
- Se retornar QUALQUER prato que não existe na URL, a análise inteira será descartada.

REGRAS DE COBERTURA:
- Você DEVE percorrer TODAS as categorias, seções, abas e blocos do cardápio.
- NÃO resumir. NÃO agrupar. NÃO retornar só os pratos principais.
- Se existirem tamanhos/versões diferentes de um prato, cada uma é uma linha separada.
- Se o cardápio tiver 45 pratos com preparo, retorne os 45.

Itens que DEVEM entrar SE EXISTIREM NO CARDÁPIO:
- Petiscos/entradas (bolinhos, croquetas, iscas, caldos)
- Pratos executivos
- Pratos completos/compartilhar
- Pratos individuais/arrumadinhos
- Porções de carne
- Peixes e frutos do mar (tilápia, camarão, lambari)
- Frango
- Suínos (costelinha, torresmo, pururuca)
- Guarnições vendidas separadas (batata, mandioca, banana, feijão)
- Sobremesas com preparo

Ignorar APENAS:
- bebidas prontas
- molhos avulsos
- itens sem preparo em cozinha

RETORNAR EXCLUSIVAMENTE JSON válido neste formato:
{
  "restaurante": {
    "nome": "...",
    "qtd_pratos_cardapio": 45,
    "categorias": ["Carnes", "Petiscos", "Executivos"],
    "ticket_medio": 55,
    "tipo_operacao_inferido": "churrascaria",
    "metodo_coccao_predominante": "brasa"
  },
  "pratos_detectados": [
    {
      "prato": "Costela ao bafo 500g",
      "preco_cardapio": 124.9,
      "descricao": "...",
      "categoria_menu": "Carnes"
    }
  ]

FORMATO DE RESPOSTA: Retorne APENAS o JSON, sem texto antes, sem texto depois, sem markdown, sem \`\`\`json\`\`\`, sem explicação. Comece a resposta com { e termine com }. NADA MAIS.`;

const buildDiscoveryAuditPrompt = (
  cardapioUrl: string,
  previousResult: any,
  previousCount: number,
  declaredCount: number,
) =>
  `Sua extração anterior deste cardápio ficou INCOMPLETA.

URL: ${cardapioUrl}

Contagem declarada no próprio resultado anterior: ${declaredCount}
Itens efetivamente listados: ${previousCount}

RESULTADO PARCIAL ANTERIOR:
${JSON.stringify(previousResult)}

TAREFA:
- Revisite a URL inteira.
- Procure categorias/abas/blocos não listados.
- Retorne novamente o JSON COMPLETO, corrigido, com TODOS os pratos com preparo.
- O array pratos_detectados precisa conter a lista completa, não parcial.`;

const buildAnalysisSystemPrompt = (
  insumos: any[],
  refeicoesDia: number,
  diasMes: number,
  discoveredMenu: any,
) =>
  `Você é um consultor financeiro especialista em food service.

Você recebeu uma LISTA-FONTE EXAUSTIVA dos pratos do cardápio. Use essa lista como VERDADE ABSOLUTA.
NÃO remova pratos. NÃO agrupe pratos. NÃO omita pratos.
NÃO INVENTE pratos que não estão na lista-fonte.
O array pratos_analisados DEVE ter EXATAMENTE ${
    getDishCount(discoveredMenu, "pratos_detectados")
  } linhas, uma para cada item listado em pratos_detectados.

REGRA ABSOLUTA — FIDELIDADE AO CARDÁPIO:
- Use o NOME EXATO de cada prato como aparece na lista-fonte.
- Use o preco_cardapio EXATO da lista-fonte como preco_venda.
- NÃO adicionar pratos que não estão na lista-fonte.
- NÃO renomear pratos.
- Se retornar QUALQUER prato que não existe na lista-fonte, a análise será descartada.

LISTA-FONTE OBRIGATÓRIA:
${JSON.stringify(discoveredMenu)}

BASE DE CUSTOS DE INSUMOS (usar obrigatoriamente):
${JSON.stringify(insumos)}

VOLUME INFORMADO: ${refeicoesDia} refeições/dia × ${diasMes} dias/mês

REGRAS:
1. Para CADA prato da lista-fonte:
   - identificar insumo principal da base (match por nome/aliases)
   - se não encontrar match exato, usar o insumo mais próximo
   - usar custo_por_porcao da base
   - estimar participação nas vendas
   - calcular custo_mensal = custo_porcao × ${refeicoesDia} × participacao × ${diasMes}
2. Cada prato da lista-fonte vira UMA linha separada em pratos_analisados
3. A soma de todas as participações deve dar 100%
4. Ser conservador nas estimativas
5. Não inventar pratos fora da lista-fonte

SEPARAR MATÉRIAS-PRIMAS EM 4 CATEGORIAS (igual calculadora Rational):
1. CARNES: toda carne bovina e suína (costela, picanha, filé, carne de sol, calabresa, costelinha, torresmo, linguiça etc)
2. AVES: frango, peru, chester (peito, coxa, passarinho, milanesa de frango)
3. LEGUMES/GUARNIÇÕES: batata, mandioca, banana, legumes, arroz, feijão, farofa e vegetais em geral
4. PESCADOS: tilápia, camarão, salmão, lambari, peixe em geral

Para cada categoria retornar:
- kg_mes: total de kg consumidos no mês (baseado no volume e participação dos pratos que usam esse insumo)
- preco_medio_kg: média ponderada do preço/kg dos insumos da categoria
- custo_mensal: kg_mes × preco_medio_kg
- itens: lista dos insumos incluídos

RETORNAR EXCLUSIVAMENTE JSON válido neste formato:
{
  "restaurante": {
    "nome": "...",
    "nota_ifood": 0,
    "qtd_pratos_cardapio": ${getDishCount(discoveredMenu, "pratos_detectados")},
    "ticket_medio": 55.00,
    "tipo_operacao_inferido": "churrascaria",
    "metodo_coccao_predominante": "brasa",
    "categorias": ["Carnes", "Petiscos", "Executivos", "Peixes"]
  },
  "pratos_analisados": [
    {
      "prato": "Costela ao bafo 500g",
      "preco_cardapio": 124.90,
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
  "materias_primas": {
    "carnes": {
      "kg_mes": 1200,
      "preco_medio_kg": 35.00,
      "custo_mensal": 42000,
      "itens": ["Costela bovina", "Carne de sol", "Picanha"]
    },
    "aves": {
      "kg_mes": 300,
      "preco_medio_kg": 18.00,
      "custo_mensal": 5400,
      "itens": ["Peito de frango"]
    },
    "legumes_guarnicoes": {
      "kg_mes": 500,
      "preco_medio_kg": 6.00,
      "custo_mensal": 3000,
      "itens": ["Batata", "Mandioca"]
    },
    "pescados": {
      "kg_mes": 200,
      "preco_medio_kg": 45.00,
      "custo_mensal": 9000,
      "itens": ["Tilápia", "Camarão"]
    }
  },
  "totais_mensais": {
    "energia_kwh": 0,
    "custo_kwh_usado": 0.80,
    "energia_reais": 0,
    "gordura_litros": 0,
    "gordura_reais": 0,
    "horas_cozinha": 0,
    "custo_hora": 23,
    "mao_obra_reais": 0,
    "agua_descalcificacao_reais": 0,
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
}

FORMATO DE RESPOSTA: Retorne APENAS o JSON, sem texto antes, sem texto depois, sem markdown, sem \`\`\`json\`\`\`, sem explicação. Comece a resposta com { e termine com }. NADA MAIS.`;

const buildAnalysisAuditPrompt = (
  discoveredMenu: any,
  partialAnalysis: any,
  missingDishNames: string[],
) =>
  `Sua análise anterior ficou INCOMPLETA.

LISTA-FONTE COMPLETA OBRIGATÓRIA:
${JSON.stringify(discoveredMenu)}

ANÁLISE PARCIAL ANTERIOR:
${JSON.stringify(partialAnalysis)}

PRATOS AUSENTES QUE PRECISAM APARECER NA NOVA RESPOSTA:
${JSON.stringify(missingDishNames)}

Retorne NOVAMENTE o JSON COMPLETO no formato final, agora com TODOS os pratos da lista-fonte.
O array pratos_analisados precisa ter EXATAMENTE ${
    getDishCount(discoveredMenu, "pratos_detectados")
  } itens.
Inclua também o objeto materias_primas com as 4 categorias (carnes, aves, legumes_guarnicoes, pescados).`;

const chooseBestDiscovery = (current: any, candidate: any) => {
  const currentCount = getDishCount(current, "pratos_detectados");
  const candidateCount = getDishCount(candidate, "pratos_detectados");
  return candidateCount > currentCount ? candidate : current;
};

const chooseBestAnalysis = (current: any, candidate: any) => {
  const currentCount = getDishCount(current, "pratos_analisados");
  const candidateCount = getDishCount(candidate, "pratos_analisados");
  return candidateCount > currentCount ? candidate : current;
};

const getMissingDishNames = (discoveredMenu: any, analysis: any) => {
  const analyzed = new Set(
    (analysis?.pratos_analisados ?? []).map((item: any) =>
      normalizeText(String(item?.prato ?? ""))
    ),
  );

  return (discoveredMenu?.pratos_detectados ?? [])
    .map((item: any) => String(item?.prato ?? "").trim())
    .filter(Boolean)
    .filter((dishName: string) => !analyzed.has(normalizeText(dishName)));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cardapio_url, refeicoes_dia, dias_mes = 26 } = await req.json();

    if (!cardapio_url || !refeicoes_dia) {
      return jsonResponse({
        error: "cardapio_url e refeicoes_dia são obrigatórios",
      }, 400);
    }

    const PERPLEXITY_API_KEY = sanitizeSecret(
      Deno.env.get("PERPLEXITY_API_KEY"),
    );
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;

    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY não configurada");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: insumos, error: insumosError } = await supabase
      .from("insumos_referencia")
      .select(
        "nome, categoria, preco_kg_referencia, rendimento_bruto, rendimento_coccao, porcao_padrao_g, custo_por_porcao, tipo_coccao, usa_oleo, qtd_oleo_ml_porcao, energia_kwh_porcao, tempo_preparo_min, aliases",
      )
      .eq("ativo", true);

    if (insumosError) {
      throw new Error(`Erro ao buscar insumos: ${insumosError.message}`);
    }

    console.log(
      `Analisando cardápio: ${cardapio_url} (${refeicoes_dia} ref/dia × ${dias_mes} dias)`,
    );

    // Extract domain from URL for search filtering
    let searchDomain: string | undefined;
    try {
      searchDomain = new URL(cardapio_url).hostname;
    } catch { /* ignore */ }

    const discoveryExtra: Record<string, unknown> = {};
    if (searchDomain) {
      discoveryExtra.search_domain_filter = [searchDomain];
    }

    let discoveryCall: { parsed: any; finishReason: string | null; content: string } | null = null;
    let discoveredMenu: any = { pratos_detectados: [] };
    let discoveredCount = 0;
    let declaredCount = 0;

    try {
      discoveryCall = await callPerplexity(
        PERPLEXITY_API_KEY,
        [
          { role: "system", content: buildDiscoverySystemPrompt() },
          {
            role: "user",
            content: `Pesquise e extraia o cardápio completo do restaurante nesta URL: ${cardapio_url}

Busque TODAS as informações disponíveis sobre o cardápio deste restaurante, incluindo pratos, preços e categorias.
Retorne SOMENTE o JSON no formato especificado. Nenhum texto fora do JSON.`,
          },
        ],
        "descoberta inicial",
        discoveryExtra,
      );

      discoveredMenu = discoveryCall.parsed;
      discoveredCount = getDishCount(discoveredMenu, "pratos_detectados");
      declaredCount = getDeclaredCount(discoveredMenu);
    } catch (initialError) {
      console.log("Primeira tentativa falhou (possivelmente recusa de acesso). Seguindo para busca ampla...", (initialError as Error).message?.substring(0, 200));
    }

    // If first attempt returned 0 dishes, try a broader web search approach
    if (discoveredCount === 0) {
      console.log("Primeira tentativa retornou 0 pratos. Tentando busca ampla pelo nome do restaurante...");

      // Extract restaurant name from URL or from partial result
      const restaurantName = discoveredMenu?.restaurante?.nome ||
        cardapio_url.replace(/https?:\/\//, "").split(/[./]/)[0].replace(/-/g, " ");

      const broadSearchCall = await callPerplexity(
        PERPLEXITY_API_KEY,
        [
          { role: "system", content: buildDiscoverySystemPrompt() },
          {
            role: "user",
            content: `Pesquise o cardápio completo do restaurante "${restaurantName}".

URL de referência: ${cardapio_url}

Busque em TODAS as fontes disponíveis na internet: site oficial, Google Maps, iFood, Rappi, TripAdvisor, redes sociais, blogs de gastronomia, avaliações de clientes que mencionam pratos.

Liste TODOS os pratos com preparo em cozinha que encontrar, com preço quando disponível.
Se não encontrar preço exato, estime com base no tipo de restaurante e região.

Retorne SOMENTE o JSON no formato especificado. Nenhum texto fora do JSON.`,
          },
        ],
        "descoberta ampla",
      );

      discoveredMenu = chooseBestDiscovery(discoveredMenu, broadSearchCall.parsed);
      discoveredCount = getDishCount(discoveredMenu, "pratos_detectados");
      declaredCount = getDeclaredCount(discoveredMenu);
    }

    if (
      discoveredCount > 0 && (
        (discoveryCall && isTruncated(discoveryCall.finishReason)) ||
        (declaredCount > 0 && discoveredCount < declaredCount) ||
        discoveredCount < 15
      )
    ) {
      console.log(
        `Auditoria de descoberta acionada: listados=${discoveredCount}, declarados=${declaredCount}, finish_reason=${discoveryCall.finishReason}`,
      );

      const auditDiscoveryCall = await callPerplexity(
        PERPLEXITY_API_KEY,
        [
          { role: "system", content: buildDiscoverySystemPrompt() },
          {
            role: "user",
            content: buildDiscoveryAuditPrompt(
              cardapio_url,
              discoveredMenu,
              discoveredCount,
              declaredCount,
            ),
          },
        ],
        "auditoria de descoberta",
      );

      discoveredMenu = chooseBestDiscovery(
        discoveredMenu,
        auditDiscoveryCall.parsed,
      );
    }

    const finalDiscoveredCount = getDishCount(
      discoveredMenu,
      "pratos_detectados",
    );
    if (finalDiscoveredCount === 0) {
      return jsonResponse({
        error: "A IA não conseguiu identificar pratos no cardápio informado",
      }, 422);
    }

    let analysisCall = await callPerplexity(
      PERPLEXITY_API_KEY,
      [
        {
          role: "system",
          content: buildAnalysisSystemPrompt(
            insumos ?? [],
            Number(refeicoes_dia),
            Number(dias_mes),
            discoveredMenu,
          ),
        },
        {
          role: "user",
          content: `Analise financeiramente TODOS os pratos da lista-fonte acima sem omitir nenhum item. Inclua obrigatoriamente o objeto materias_primas com as 4 categorias separadas. Retorne SOMENTE o JSON, nenhum texto fora do JSON.`,
        },
      ],
      "análise principal",
    );

    let analysis = analysisCall.parsed;
    let missingDishNames = getMissingDishNames(discoveredMenu, analysis);

    if (isTruncated(analysisCall.finishReason) || missingDishNames.length > 0) {
      console.log(
        `Auditoria de análise acionada: faltando=${missingDishNames.length}, finish_reason=${analysisCall.finishReason}`,
      );

      const auditAnalysisCall = await callPerplexity(
        PERPLEXITY_API_KEY,
        [
          {
            role: "system",
            content: buildAnalysisSystemPrompt(
              insumos ?? [],
              Number(refeicoes_dia),
              Number(dias_mes),
              discoveredMenu,
            ),
          },
          {
            role: "user",
            content: buildAnalysisAuditPrompt(
              discoveredMenu,
              analysis,
              missingDishNames,
            ),
          },
        ],
        "auditoria de análise",
      );

      analysis = chooseBestAnalysis(analysis, auditAnalysisCall.parsed);
      missingDishNames = getMissingDishNames(discoveredMenu, analysis);
    }

    const analyzedCount = getDishCount(analysis, "pratos_analisados");
    const finalExpectedCount = Math.max(
      getDeclaredCount(discoveredMenu),
      finalDiscoveredCount,
      analyzedCount,
    );

    analysis.restaurante = {
      ...(discoveredMenu?.restaurante ?? {}),
      ...(analysis?.restaurante ?? {}),
      qtd_pratos_cardapio: finalExpectedCount,
    };

    if (missingDishNames.length > 0) {
      console.error(
        `Análise incompleta detectada: ${analyzedCount}/${finalDiscoveredCount} pratos`,
        missingDishNames,
      );
    }

    console.log(
      `Análise concluída: ${analyzedCount} pratos (esperado: ${finalDiscoveredCount})`,
    );

    return jsonResponse({
      success: true,
      data: analysis,
      completeness: {
        expected_dishes: finalDiscoveredCount,
        analyzed_dishes: analyzedCount,
        missing_dishes: missingDishNames,
        is_complete: missingDishNames.length === 0,
      },
    });
  } catch (e) {
    console.error("analyze-restaurant-menu error:", e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Erro interno" },
      500,
    );
  }
});
