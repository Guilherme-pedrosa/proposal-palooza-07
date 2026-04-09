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
    console.log(`Perplexity recusou acessar a URL na etapa ${stage}:`, content.substring(0, 200));
    return {
      parsed: { pratos_detectados: [], restaurante: {} },
      finishReason: "refusal",
      content,
    };
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

LISTA-FONTE OBRIGATÓRIA:
${JSON.stringify(discoveredMenu)}

BASE DE CUSTOS DE INSUMOS (usar obrigatoriamente):
${JSON.stringify(insumos)}

VOLUME INFORMADO: ${refeicoesDia} refeições/dia × ${diasMes} dias/mês

IMPORTANTE: NÃO calcule participação, kg_mes ou matérias_primas. Isso será calculado no servidor.
Apenas identifique o insumo principal e custo por porção de cada prato.

REGRAS:
1. Para CADA prato da lista-fonte:
   - identificar insumo principal da base (match por nome/aliases)
   - se não encontrar match exato, usar o insumo mais próximo
   - usar custo_por_porcao da base
   - identificar tipo_coccao e se usa_oleo
2. Cada prato da lista-fonte vira UMA linha separada em pratos_analisados

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
      "tipo_coccao": "brasa",
      "usa_oleo": false
    }
  ]
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

// ══════════════════════════════════════════════════════════════
// PER CAPITA OFICIAL (SEBRAE/CRD, Sec. Educação SP) — gramas brutas
// ══════════════════════════════════════════════════════════════
const PER_CAPITA: Record<string, number> = {
  // Proteína principal (pessoa come UMA por refeição) — gramas brutas
  carne_bovina_sem_osso: 200,
  carne_bovina_com_osso: 300,
  frango_sem_osso: 180,
  frango_com_osso: 300,
  peixe_file: 150,
  peixe_posta: 200,
  carne_suina: 200,
  linguica: 150,
  camarao: 200,
  // Acompanhamentos (todos comem junto)
  arroz_cru: 80,
  feijao_cru: 40,
  batata_frita: 180,
  mandioca: 190,
  salada: 60,
  farofa: 40,
  legumes_cozidos: 120,
  banana_milanesa: 100,
};

type ClassResult = { tipo: 'proteina' | 'guarnicao' | 'petisco' | 'sobremesa'; sub: string; categoria: 'carnes' | 'aves' | 'pescados' | 'legumes_guarnicoes' } | null;

const classificarPratoPerCapita = (nome: string, descricao?: string): ClassResult => {
  const texto = ((nome || '') + ' ' + (descricao || '')).toLowerCase();

  // Proteínas
  if (/costela(?!.*su[ií]n)|caranha/.test(texto)) return { tipo: 'proteina', sub: 'carne_bovina_com_osso', categoria: 'carnes' };
  if (/picanha|fil[ée]\s*mignon|alcatra|fraldinha|maminha|contrafil[ée]|chuleta|carne de sol|carne seca|ac[ée]m|m[úu]sculo|estrogonofe(?!.*frango)|bife|carne mo[ií]da|picadinho/.test(texto)) return { tipo: 'proteina', sub: 'carne_bovina_sem_osso', categoria: 'carnes' };
  if (/hamb[úu]rguer|burger|smash|blend/.test(texto)) return { tipo: 'proteina', sub: 'carne_bovina_sem_osso', categoria: 'carnes' };
  if (/calabresa|lingui[çc]a|toscana/.test(texto)) return { tipo: 'proteina', sub: 'linguica', categoria: 'carnes' };
  if (/costelinha.*su[ií]n|costelinha.*porco|pernil|lombo.*su[ií]n|torresmo|panceta|pururuca/.test(texto)) return { tipo: 'proteina', sub: 'carne_suina', categoria: 'carnes' };
  if (/frango.*passarinho|frango.*assado|coxa|sobrecoxa/.test(texto)) return { tipo: 'proteina', sub: 'frango_com_osso', categoria: 'aves' };
  if (/frango|fil[ée]\s*de\s*frango|estrogonofe.*frango|parmegiana.*frango|milanesa.*frango/.test(texto)) return { tipo: 'proteina', sub: 'frango_sem_osso', categoria: 'aves' };
  if (/til[aá]pia|peixe|lambari/.test(texto)) return { tipo: 'proteina', sub: 'peixe_file', categoria: 'pescados' };
  if (/camar[aã]o/.test(texto)) return { tipo: 'proteina', sub: 'camarao', categoria: 'pescados' };
  if (/salm[aã]o/.test(texto)) return { tipo: 'proteina', sub: 'peixe_file', categoria: 'pescados' };

  // Guarnições
  if (/arroz/.test(texto)) return { tipo: 'guarnicao', sub: 'arroz_cru', categoria: 'legumes_guarnicoes' };
  if (/feij[aã]o|tropeiro|feijoada/.test(texto)) return { tipo: 'guarnicao', sub: 'feijao_cru', categoria: 'legumes_guarnicoes' };
  if (/batata.*frita|fritas/.test(texto)) return { tipo: 'guarnicao', sub: 'batata_frita', categoria: 'legumes_guarnicoes' };
  if (/mandioca|macaxeira|aipim/.test(texto)) return { tipo: 'guarnicao', sub: 'mandioca', categoria: 'legumes_guarnicoes' };
  if (/salada/.test(texto)) return { tipo: 'guarnicao', sub: 'salada', categoria: 'legumes_guarnicoes' };
  if (/farofa|farinha/.test(texto)) return { tipo: 'guarnicao', sub: 'farofa', categoria: 'legumes_guarnicoes' };
  if (/banana.*milanesa/.test(texto)) return { tipo: 'guarnicao', sub: 'banana_milanesa', categoria: 'legumes_guarnicoes' };

  // Petiscos (proteína em porção menor)
  if (/bolinho|croqueta|quibe|pastel|disco|isca|moela|dadinho|escondidinho|coxinha|empada/.test(texto)) return { tipo: 'petisco', sub: 'carne_bovina_sem_osso', categoria: 'carnes' };

  // Sobremesas
  if (/mousse|sorvete|sobremesa|pudim|brownie|bolo|torta.*doce|petit gateau|churros|bombom/.test(texto)) return { tipo: 'sobremesa', sub: 'carne_bovina_sem_osso', categoria: 'carnes' };

  // Default: proteína bovina sem osso
  return { tipo: 'proteina', sub: 'carne_bovina_sem_osso', categoria: 'carnes' };
};

const calcularPerCapita = (
  pratos: any[],
  insumos: any[],
  refeicoesDia: number,
  diasMes: number,
) => {
  if (!pratos?.length) return { materias_primas: null, pratosAnotados: pratos };

  const totalRefeicoesMes = refeicoesDia * diasMes;

  // Map insumo names
  const insumoMap = new Map<string, any>();
  for (const ins of insumos) {
    insumoMap.set(normalizeText(ins.nome), ins);
    if (ins.aliases) {
      for (const alias of ins.aliases) {
        insumoMap.set(normalizeText(alias), ins);
      }
    }
  }
  const findInsumo = (name: string) => {
    const norm = normalizeText(name || '');
    for (const [key, ins] of insumoMap.entries()) {
      if (norm.includes(key) || key.includes(norm)) return ins;
    }
    return null;
  };

  // 1. Classify every dish
  const classificados: Array<{ prato: any; class: ClassResult }> = [];
  for (const p of pratos) {
    const c = classificarPratoPerCapita(p.prato || '', p.descricao || '');
    classificados.push({ prato: p, class: c });
  }

  // 2. Count protein dishes per category to determine distribution
  const proteinasCount: Record<string, number> = {};
  const proteinasSubCount: Record<string, Record<string, number>> = {};
  for (const { class: c } of classificados) {
    if (c && c.tipo === 'proteina') {
      proteinasCount[c.categoria] = (proteinasCount[c.categoria] || 0) + 1;
      if (!proteinasSubCount[c.categoria]) proteinasSubCount[c.categoria] = {};
      proteinasSubCount[c.categoria][c.sub] = (proteinasSubCount[c.categoria]?.[c.sub] || 0) + 1;
    }
  }
  const totalProteinas = Object.values(proteinasCount).reduce((a, b) => a + b, 0) || 1;

  // Distribution = proportion of protein dishes in each category
  const distribuicao: Record<string, number> = {};
  for (const [cat, qtd] of Object.entries(proteinasCount)) {
    distribuicao[cat] = qtd / totalProteinas;
  }

  console.log("Distribuição proteínas:", JSON.stringify(distribuicao));
  console.log("Contagem sub-tipos:", JSON.stringify(proteinasSubCount));

  // 3. Calculate kg/month per protein category using per capita
  const resultado: Record<string, { kg: number; custo: number; preco_medio_kg: number; itens: Set<string>; kgEntries: Array<{kg: number; precoKg: number}> }> = {
    carnes: { kg: 0, custo: 0, preco_medio_kg: 0, itens: new Set(), kgEntries: [] },
    aves: { kg: 0, custo: 0, preco_medio_kg: 0, itens: new Set(), kgEntries: [] },
    pescados: { kg: 0, custo: 0, preco_medio_kg: 0, itens: new Set(), kgEntries: [] },
    legumes_guarnicoes: { kg: 0, custo: 0, preco_medio_kg: 0, itens: new Set(), kgEntries: [] },
  };

  // For each protein category, calculate weighted per capita and kg
  for (const [categoria, percentual] of Object.entries(distribuicao)) {
    const refeicoesCat = totalRefeicoesMes * percentual;
    const subCounts = proteinasSubCount[categoria] || {};
    const totalSubPratos = Object.values(subCounts).reduce((a, b) => a + b, 0) || 1;

    // Weighted per capita by sub-type proportion within category
    let perCapitaMedio = 0;
    let custoKgPonderado = 0;
    let pesoTotal = 0;

    for (const [sub, count] of Object.entries(subCounts)) {
      const proporcao = count / totalSubPratos;
      const perCapitaG = PER_CAPITA[sub] || 200;
      perCapitaMedio += perCapitaG * proporcao;

      // Find matching insumo for price — use category-aware search terms
      const searchTerms: Record<string, string> = {
        carne_bovina_sem_osso: 'carne bovina',
        carne_bovina_com_osso: 'costela bovina',
        frango_sem_osso: 'peito de frango',
        frango_com_osso: 'frango inteiro',
        peixe_file: 'tilapia',
        peixe_posta: 'peixe',
        carne_suina: 'carne suina',
        linguica: 'linguica',
        camarao: 'camarao',
      };
      const insumo = findInsumo(searchTerms[sub] || sub.replace(/_/g, ' '));
      const precoKg = insumo?.preco_kg_referencia || 30;

      const kgSub = (refeicoesCat * proporcao * perCapitaG) / 1000;
      custoKgPonderado += kgSub * precoKg;
      pesoTotal += kgSub;

      if (insumo) resultado[categoria].itens.add(insumo.nome);
      resultado[categoria].kgEntries.push({ kg: kgSub, precoKg });
    }

    resultado[categoria].kg = Math.round(pesoTotal);
    resultado[categoria].custo = Math.round(custoKgPonderado);
    resultado[categoria].preco_medio_kg = pesoTotal > 0
      ? Number((custoKgPonderado / pesoTotal).toFixed(2))
      : 0;
  }

  // 4. Garnish: EVERYONE eats these with every meal
  // Check which garnishes appear on the menu
  const guarnicoesPresentes = new Set<string>();
  for (const { class: c } of classificados) {
    if (c && c.tipo === 'guarnicao') guarnicoesPresentes.add(c.sub);
  }

  // Default garnishes always present (arroz + feijão)
  const guarnicaoCalc: Array<{ sub: string; fator: number }> = [
    { sub: 'arroz_cru', fator: 1.0 },    // 100% comem
    { sub: 'feijao_cru', fator: 1.0 },   // 100% comem
  ];
  // Conditional garnishes (only if on menu)
  if (guarnicoesPresentes.has('batata_frita')) guarnicaoCalc.push({ sub: 'batata_frita', fator: 0.40 });
  if (guarnicoesPresentes.has('mandioca')) guarnicaoCalc.push({ sub: 'mandioca', fator: 0.30 });
  if (guarnicoesPresentes.has('salada')) guarnicaoCalc.push({ sub: 'salada', fator: 0.50 });
  if (guarnicoesPresentes.has('farofa')) guarnicaoCalc.push({ sub: 'farofa', fator: 0.60 });
  if (guarnicoesPresentes.has('banana_milanesa')) guarnicaoCalc.push({ sub: 'banana_milanesa', fator: 0.25 });

  let kgGuarnicoes = 0;
  for (const { sub, fator } of guarnicaoCalc) {
    const perCapita = PER_CAPITA[sub] || 80;
    kgGuarnicoes += (totalRefeicoesMes * fator * perCapita) / 1000;
  }

  // Average garnish price ~R$ 6.50/kg
  const precoGuarnicao = 6.50;
  resultado.legumes_guarnicoes.kg = Math.round(kgGuarnicoes);
  resultado.legumes_guarnicoes.custo = Math.round(kgGuarnicoes * precoGuarnicao);
  resultado.legumes_guarnicoes.preco_medio_kg = precoGuarnicao;
  resultado.legumes_guarnicoes.itens = new Set(['Arroz', 'Feijão', ...Array.from(guarnicoesPresentes).map(s => s.replace(/_/g, ' '))]);

  // 5. Build final materias_primas
  const materias_primas: Record<string, any> = {};
  for (const [key, data] of Object.entries(resultado)) {
    materias_primas[key] = {
      kg_mes: data.kg,
      preco_medio_kg: data.preco_medio_kg,
      custo_mensal: data.custo,
      itens: Array.from(data.itens),
    };
  }

  // 6. Annotate each dish with participation + porcoes_dia
  for (const { prato, class: c } of classificados) {
    if (!c) continue;
    if (c.tipo === 'proteina') {
      const catPratos = classificados.filter(x => x.class?.categoria === c.categoria && x.class?.tipo === 'proteina');
      prato.participacao_vendas = Number((distribuicao[c.categoria]! / catPratos.length).toFixed(4));
      prato.porcoes_dia = Math.round(refeicoesDia * prato.participacao_vendas);
      prato.custo_mensal = Math.round((prato.custo_porcao || 0) * totalRefeicoesMes * prato.participacao_vendas);
    } else if (c.tipo === 'petisco') {
      // Petiscos: ~5% split among them
      const petiscos = classificados.filter(x => x.class?.tipo === 'petisco');
      prato.participacao_vendas = Number((0.05 / petiscos.length).toFixed(4));
      prato.porcoes_dia = Math.round(refeicoesDia * prato.participacao_vendas);
      prato.custo_mensal = Math.round((prato.custo_porcao || 0) * totalRefeicoesMes * prato.participacao_vendas);
    } else if (c.tipo === 'guarnicao') {
      // Garnish dishes on menu don't add to protein cost, per capita already counted
      prato.participacao_vendas = 0;
      prato.porcoes_dia = 0;
      prato.custo_mensal = 0;
    } else if (c.tipo === 'sobremesa') {
      const sobremesas = classificados.filter(x => x.class?.tipo === 'sobremesa');
      prato.participacao_vendas = Number((0.03 / sobremesas.length).toFixed(4));
      prato.porcoes_dia = Math.round(refeicoesDia * prato.participacao_vendas);
      prato.custo_mensal = Math.round((prato.custo_porcao || 0) * totalRefeicoesMes * prato.participacao_vendas);
    }
    prato._classificacao = `${c.tipo}/${c.sub}/${c.categoria}`;
  }

  return { materias_primas, pratosAnotados: pratos };
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

    // ── PASSO 1: Baixar conteúdo da URL (Firecrawl para SPAs, fetch para sites normais) ──
    let conteudoCardapio = '';
    const isSPADomain = /goomer|ifood|rappi|aiqfome/i.test(cardapio_url);

    if (isSPADomain) {
      // Usar Firecrawl para renderizar JavaScript e extrair conteúdo
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      if (FIRECRAWL_API_KEY) {
        try {
          console.log("SPA detectado. Usando Firecrawl para renderizar JS...");
          const fcResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: cardapio_url,
              formats: ["markdown"],
              waitFor: 5000,
              onlyMainContent: true,
            }),
          });
          const fcData = await fcResponse.json();
          if (fcResponse.ok && (fcData?.data?.markdown || fcData?.markdown)) {
            conteudoCardapio = (fcData?.data?.markdown || fcData?.markdown || "").substring(0, 30000);
            console.log(`Firecrawl OK: ${conteudoCardapio.length} chars`);
          } else {
            console.error("Firecrawl falhou:", fcResponse.status, JSON.stringify(fcData).substring(0, 300));
          }
        } catch (fcErr) {
          console.error("Firecrawl error:", fcErr);
        }
      } else {
        console.log("FIRECRAWL_API_KEY não configurada, pulando renderização SPA");
      }
    }

    // Fallback: fetch HTML direto (funciona para sites normais)
    if (!conteudoCardapio || conteudoCardapio.length < 200) {
      try {
        console.log("Baixando HTML da URL...");
        const htmlResponse = await fetch(cardapio_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        const html = await htmlResponse.text();
        console.log(`HTML baixado: ${html.length} chars, status ${htmlResponse.status}`);

        const cleaned = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<img[^>]*>/gi, '')
          .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
          .replace(/data:[^"'\s]*/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#[0-9]+;/gi, '')
          .replace(/\s{2,}/g, '\n')
          .trim()
          .substring(0, 30000);

        if (cleaned.length > conteudoCardapio.length) {
          conteudoCardapio = cleaned;
        }
        console.log(`Conteúdo limpo: ${conteudoCardapio.length} chars`);
      } catch (fetchErr) {
        console.error('Fetch HTML falhou:', fetchErr);
      }
    }

    const hasHtmlContent = conteudoCardapio.length > 500;

    // ── PASSO 2: Descoberta de pratos ──
    let discoveredMenu: any = { pratos_detectados: [] };
    let discoveredCount = 0;
    let declaredCount = 0;

    // Build discovery system prompt for text-based extraction
    const textDiscoverySystemPrompt = `Você extrai cardápios de restaurantes a partir de texto.
Receba o conteúdo de texto de uma página de cardápio e retorne
SOMENTE um JSON com TODOS os pratos que envolvem preparo em cozinha.

REGRA ABSOLUTA — NÃO INVENTAR PRATOS:
- Listar SOMENTE pratos que aparecem NO TEXTO fornecido.
- NÃO completar com pratos "típicos" do segmento.
- NÃO renomear pratos. Usar o nome EXATO.
- Para CADA prato, incluir o preco_cardapio EXATO se disponível.

REGRAS DE COBERTURA:
- Percorrer TODAS as categorias e seções do texto.
- NÃO resumir. NÃO agrupar. Cada tamanho/versão é uma linha separada.

Incluir SE EXISTIREM:
- Petiscos/entradas (bolinhos, croquetas, iscas, caldos)
- Pratos executivos, completos, compartilhar, individuais
- Porções de carne, peixes, frango, suínos
- Guarnições com preparo (batata frita, mandioca, banana milanesa, feijão tropeiro)
- Sobremesas com preparo

Ignorar APENAS: bebidas prontas, molhos avulsos, itens sem preparo.

RETORNAR EXCLUSIVAMENTE JSON:
{
  "restaurante": {
    "nome": "...",
    "qtd_pratos_cardapio": 45,
    "categorias": ["Carnes", "Petiscos"],
    "ticket_medio": 55,
    "tipo_operacao_inferido": "churrascaria",
    "metodo_coccao_predominante": "brasa"
  },
  "pratos_detectados": [
    {"prato": "Costela ao bafo 500g", "preco_cardapio": 124.9, "descricao": "...", "categoria_menu": "Carnes"}
  ]
}
Começar com { e terminar com }. NADA MAIS.`;

    if (hasHtmlContent) {
      // ── Estratégia A: Mandar o TEXTO extraído (não a URL) ──
      console.log("Usando estratégia de texto extraído (HTML pre-fetched)");
      try {
        const textDiscoveryCall = await callPerplexity(
          PERPLEXITY_API_KEY,
          [
            { role: "system", content: textDiscoverySystemPrompt },
            {
              role: "user",
              content: `Extraia TODOS os pratos deste cardápio:\n\n${conteudoCardapio}`,
            },
          ],
          "descoberta por texto",
          { web_search: false } as any,
        );

        discoveredMenu = textDiscoveryCall.parsed;
        discoveredCount = getDishCount(discoveredMenu, "pratos_detectados");
        declaredCount = getDeclaredCount(discoveredMenu);
        console.log(`Descoberta por texto: ${discoveredCount} pratos`);
      } catch (textErr) {
        console.error("Descoberta por texto falhou:", (textErr as Error).message?.substring(0, 200));
      }
    }

    // ── Estratégia B: Fallback - Perplexity busca ampla na web ──
    if (discoveredCount < 5) {
      console.log(`Poucos pratos (${discoveredCount}). Tentando busca ampla na web...`);

      const restaurantName = discoveredMenu?.restaurante?.nome ||
        cardapio_url.replace(/https?:\/\//, "").split(/[./]/)[0].replace(/-/g, " ");

      try {
        const broadSearchCall = await callPerplexity(
          PERPLEXITY_API_KEY,
          [
            { role: "system", content: buildDiscoverySystemPrompt() },
            {
              role: "user",
              content: `Pesquise o cardápio completo do restaurante "${restaurantName}".

URL de referência: ${cardapio_url}

Busque em TODAS as fontes disponíveis: site oficial, Google Maps, iFood, Rappi, TripAdvisor, redes sociais, blogs de gastronomia.

Liste TODOS os pratos com preparo em cozinha que encontrar, com preço quando disponível.

Retorne SOMENTE o JSON no formato especificado. Nenhum texto fora do JSON.`,
            },
          ],
          "descoberta ampla",
        );

        discoveredMenu = chooseBestDiscovery(discoveredMenu, broadSearchCall.parsed);
        discoveredCount = getDishCount(discoveredMenu, "pratos_detectados");
        declaredCount = getDeclaredCount(discoveredMenu);
        console.log(`Descoberta ampla: ${discoveredCount} pratos`);
      } catch (broadError) {
        console.log("Busca ampla falhou:", (broadError as Error).message?.substring(0, 200));
      }
    }

    if (
      discoveredCount > 0 && (
        (declaredCount > 0 && discoveredCount < declaredCount) ||
        discoveredCount < 15
      )
    ) {
      console.log(
        `Auditoria de descoberta acionada: listados=${discoveredCount}, declarados=${declaredCount}`,
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

    // ── PASSO PÓS-PROCESSAMENTO: Per capita oficial (SEBRAE/CRD) ──
    if (analysis?.pratos_analisados?.length > 0) {
      console.log("Pós-processamento: calculando com per capita oficial...");
      
      const { materias_primas, pratosAnotados } = calcularPerCapita(
        analysis.pratos_analisados,
        insumos ?? [],
        Number(refeicoes_dia),
        Number(dias_mes),
      );
      
      analysis.pratos_analisados = pratosAnotados;
      if (materias_primas) {
        console.log("Matérias-primas (per capita):", JSON.stringify(materias_primas));
        analysis.materias_primas = materias_primas;
      }
    }

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
