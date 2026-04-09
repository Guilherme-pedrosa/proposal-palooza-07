import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

// ═══════════════════════════════════════════════════════════
// EDGE FUNCTION: analyze-restaurant-menu (v2 — reescrita limpa)
// ═══════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ─── PER CAPITA OFICIAL (SEBRAE/CRD) — gramas brutas por refeição ───
const PER_CAPITA: Record<string, number> = {
  costela_bovina: 300,
  carne_bovina: 200,
  carne_sol: 200,
  frango_sem_osso: 180,
  frango_com_osso: 300,
  peixe: 150,
  camarao: 200,
  carne_suina: 200,
  linguica: 150,
  arroz: 80,
  feijao: 40,
  batata_frita: 180,
  mandioca: 190,
  salada: 60,
  farofa: 40,
  banana_milanesa: 100,
};

// ─── CLASSIFICADOR DE PRATOS ───
// Retorna: { proteina, sub, categoria } ou null
interface ClassResult {
  tipo: "proteina" | "guarnicao" | "petisco" | "sobremesa";
  sub: string;           // chave do PER_CAPITA
  categoria: "carnes" | "aves" | "pescados" | "legumes";
  insumo_busca: string;  // termo pra buscar na tabela insumos_referencia
}

function classificar(nome: string, desc = ""): ClassResult | null {
  const t = (nome + " " + desc).toLowerCase();

  // BOVINAS COM OSSO
  if (/costela(?!.*su[ií]n)|caranha/.test(t))
    return { tipo: "proteina", sub: "costela_bovina", categoria: "carnes", insumo_busca: "Costela bovina" };

  // CARNE DE SOL / CARNE SECA (corte específico, preço diferente)
  if (/carne de sol|carne seca|charque/.test(t))
    return { tipo: "proteina", sub: "carne_sol", categoria: "carnes", insumo_busca: "Carne de sol" };

  // BOVINAS SEM OSSO — cada corte com seu nome pra buscar preço certo
  if (/picanha/.test(t))
    return { tipo: "proteina", sub: "carne_bovina", categoria: "carnes", insumo_busca: "Picanha" };
  if (/fil[ée]\s*mignon|filet\s*mignon/.test(t))
    return { tipo: "proteina", sub: "carne_bovina", categoria: "carnes", insumo_busca: "Filé mignon" };
  if (/contrafil[ée]|chuleta/.test(t))
    return { tipo: "proteina", sub: "carne_bovina", categoria: "carnes", insumo_busca: "Contrafilé" };
  if (/alcatra/.test(t))
    return { tipo: "proteina", sub: "carne_bovina", categoria: "carnes", insumo_busca: "Alcatra" };
  if (/fraldinha/.test(t))
    return { tipo: "proteina", sub: "carne_bovina", categoria: "carnes", insumo_busca: "Fraldinha" };
  if (/maminha/.test(t))
    return { tipo: "proteina", sub: "carne_bovina", categoria: "carnes", insumo_busca: "Maminha" };
  if (/cupim/.test(t))
    return { tipo: "proteina", sub: "carne_bovina", categoria: "carnes", insumo_busca: "Cupim" };
  if (/ac[ée]m|m[úu]sculo|carne\s*(mo[ií]da|de\s*panela|cozida|ensopada)/.test(t))
    return { tipo: "proteina", sub: "carne_bovina", categoria: "carnes", insumo_busca: "Acém" };
  if (/hamb[úu]rguer|burger|smash|blend/.test(t))
    return { tipo: "proteina", sub: "carne_bovina", categoria: "carnes", insumo_busca: "Hambúrguer artesanal" };
  if (/calabresa|lingui[çc]a|toscana/.test(t))
    return { tipo: "proteina", sub: "linguica", categoria: "carnes", insumo_busca: "Linguiça bovina" };
  if (/estrogonofe(?!.*frango)|bife|parmegiana(?!.*frango)/.test(t))
    return { tipo: "proteina", sub: "carne_bovina", categoria: "carnes", insumo_busca: "Alcatra" };

  // SUÍNOS
  if (/costelinha.*su[ií]n|costelinha.*porco|porco/.test(t))
    return { tipo: "proteina", sub: "carne_suina", categoria: "carnes", insumo_busca: "Costela suína" };
  if (/pernil/.test(t))
    return { tipo: "proteina", sub: "carne_suina", categoria: "carnes", insumo_busca: "Pernil suíno" };
  if (/lombo.*su[ií]n/.test(t))
    return { tipo: "proteina", sub: "carne_suina", categoria: "carnes", insumo_busca: "Lombo suíno" };
  if (/torresmo|panceta|pururuca/.test(t))
    return { tipo: "proteina", sub: "carne_suina", categoria: "carnes", insumo_busca: "Costela suína" };

  // FRANGO
  if (/frango.*passarinho|coxa|sobrecoxa/.test(t))
    return { tipo: "proteina", sub: "frango_com_osso", categoria: "aves", insumo_busca: "Coxa e sobrecoxa" };
  if (/frango|fil[ée]\s*de\s*frango|estrogonofe.*frango|parmegiana.*frango|milanesa.*frango/.test(t))
    return { tipo: "proteina", sub: "frango_sem_osso", categoria: "aves", insumo_busca: "Peito de frango" };

  // PESCADOS
  if (/til[áa]pia/.test(t))
    return { tipo: "proteina", sub: "peixe", categoria: "pescados", insumo_busca: "Tilápia" };
  if (/camar[ãa]o/.test(t))
    return { tipo: "proteina", sub: "camarao", categoria: "pescados", insumo_busca: "Camarão" };
  if (/salm[ãa]o/.test(t))
    return { tipo: "proteina", sub: "peixe", categoria: "pescados", insumo_busca: "Salmão" };
  if (/peixe|lambari|pescado/.test(t))
    return { tipo: "proteina", sub: "peixe", categoria: "pescados", insumo_busca: "Tilápia" };

  // GUARNIÇÕES
  if (/arroz/.test(t))
    return { tipo: "guarnicao", sub: "arroz", categoria: "legumes", insumo_busca: "Arroz" };
  if (/feij[ãa]o|tropeiro|feijoada/.test(t))
    return { tipo: "guarnicao", sub: "feijao", categoria: "legumes", insumo_busca: "Feijão" };
  if (/batata.*frita|fritas/.test(t))
    return { tipo: "guarnicao", sub: "batata_frita", categoria: "legumes", insumo_busca: "Batata frita" };
  if (/mandioca|macaxeira|aipim/.test(t))
    return { tipo: "guarnicao", sub: "mandioca", categoria: "legumes", insumo_busca: "Mandioca frita" };
  if (/salada/.test(t))
    return { tipo: "guarnicao", sub: "salada", categoria: "legumes", insumo_busca: "Salada" };
  if (/farofa|farinha/.test(t))
    return { tipo: "guarnicao", sub: "farofa", categoria: "legumes", insumo_busca: "Arroz" };
  if (/banana.*milanesa/.test(t))
    return { tipo: "guarnicao", sub: "banana_milanesa", categoria: "legumes", insumo_busca: "Batata frita" };

  // PETISCOS
  if (/bolinho|croqueta|quibe|pastel|disco|isca.*f[ií]gado|moela|dadinho|escondidinho|coxinha|empada/.test(t))
    return { tipo: "petisco", sub: "carne_bovina", categoria: "carnes", insumo_busca: "Acém" };

  // SOBREMESAS
  if (/mousse|sorvete|sobremesa|pudim|brownie|bolo|torta|petit|churros|bombom/.test(t))
    return { tipo: "sobremesa", sub: "carne_bovina", categoria: "legumes", insumo_busca: "Arroz" };

  return null;
}

// ─── BUSCAR INSUMO NA BASE POR NOME EXATO ───
function buscarInsumo(termoBusca: string, insumos: any[]): any | null {
  const norm = termoBusca.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Match exato pelo nome
  for (const ins of insumos) {
    const nomeNorm = (ins.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (nomeNorm === norm) return ins;
  }

  // Match por aliases
  for (const ins of insumos) {
    if (!ins.aliases) continue;
    for (const alias of ins.aliases) {
      const aliasNorm = alias.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (aliasNorm === norm || norm.includes(aliasNorm) || aliasNorm.includes(norm)) return ins;
    }
  }

  // Match parcial pelo nome
  for (const ins of insumos) {
    const nomeNorm = (ins.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (norm.includes(nomeNorm) || nomeNorm.includes(norm)) return ins;
  }

  return null;
}

// ─── EXTRAIR JSON DO PERPLEXITY ───
function extrairJson(content: string): any {
  if (!content) throw new Error("Resposta vazia da IA");

  // Log raw content for debugging
  console.log("Perplexity raw (primeiros 300 chars):", content.substring(0, 300));
  console.log("Perplexity raw (últimos 200 chars):", content.substring(content.length - 200));

  // 1. Limpar markdown, referências, texto extra
  let limpo = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/\[\d+\]/g, "")          // remover referências [1] [2] etc
    .replace(/\*\*[^*]*\*\*/g, "")     // remover **bold**
    .trim();

  // 2. Tentar parse direto
  try { return JSON.parse(limpo); } catch {}

  // 3. Encontrar o primeiro { e o último } — extrair o bloco JSON
  const firstBrace = limpo.indexOf("{");
  const lastBrace = limpo.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const bloco = limpo.substring(firstBrace, lastBrace + 1);
    const reparado = bloco
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]");
    try { return JSON.parse(reparado); } catch {}
  }

  // 4. Tentar encontrar qualquer {} grande na string
  const matches = limpo.match(/\{[\s\S]*\}/g);
  if (matches) {
    const sorted = matches.sort((a, b) => b.length - a.length);
    for (const m of sorted) {
      try {
        return JSON.parse(m.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]"));
      } catch {}
    }
  }

  // 5. Último recurso: tentar reparar JSON truncado (fechar chaves/colchetes faltantes)
  if (firstBrace !== -1) {
    let partial = limpo.substring(firstBrace);
    // Remover propriedade incompleta no final
    partial = partial.replace(/,\s*"[^"]*"?\s*:?\s*[^,}\]]*$/, "");
    const openBraces = (partial.match(/{/g) || []).length;
    const closeBraces = (partial.match(/}/g) || []).length;
    const openBrackets = (partial.match(/\[/g) || []).length;
    const closeBrackets = (partial.match(/\]/g) || []).length;
    for (let i = 0; i < openBrackets - closeBrackets; i++) partial += "]";
    for (let i = 0; i < openBraces - closeBraces; i++) partial += "}";
    try { return JSON.parse(partial); } catch {}
  }

  // 6. Logar e falhar
  console.error("Parse falhou. Primeiros 500 chars:", content.substring(0, 500));
  console.error("Últimos 500 chars:", content.substring(content.length - 500));
  throw new Error("JSON inválido na resposta da IA");
}

// ═══════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cardapio_url, refeicoes_dia, dias_mes = 26 } = await req.json();
    if (!cardapio_url || !refeicoes_dia) {
      return json({ error: "cardapio_url e refeicoes_dia são obrigatórios" }, 400);
    }

    const PERPLEXITY_KEY = (Deno.env.get("PERPLEXITY_API_KEY") || "").trim();
    if (!PERPLEXITY_KEY) throw new Error("PERPLEXITY_API_KEY não configurada");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── 1. BUSCAR INSUMOS DA BASE ──
    const { data: insumos } = await supabase
      .from("insumos_referencia")
      .select("nome, categoria, preco_kg_referencia, rendimento_bruto, rendimento_coccao, porcao_padrao_g, custo_por_porcao, tipo_coccao, usa_oleo, qtd_oleo_ml_porcao, energia_kwh_porcao, tempo_preparo_min, aliases")
      .eq("ativo", true);

    if (!insumos?.length) throw new Error("Base de insumos vazia");

    // ── 2. BAIXAR HTML DO CARDÁPIO ──
    let textoCardapio = "";
    try {
      const res = await fetch(cardapio_url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html",
        },
      });
      const html = await res.text();
      textoCardapio = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "")
        .replace(/<img[^>]*>/gi, "")
        .replace(/data:[^"'\s]*/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&#\d+;/gi, "")
        .replace(/\s{2,}/g, "\n")
        .trim()
        .substring(0, 40000);
    } catch (e) {
      console.error("Fetch HTML falhou:", e);
    }

    // ── 3. UMA CHAMADA AO PERPLEXITY: EXTRAIR PRATOS ──
    const usarTexto = textoCardapio.length > 500;

    const systemPrompt = `Você extrai cardápios de restaurantes.
${usarTexto ? "Receba o texto de uma página de cardápio." : "Acesse a URL informada."}
Retorne SOMENTE um JSON com TODOS os pratos que envolvem preparo em cozinha.

REGRAS:
- Listar SOMENTE pratos que existem ${usarTexto ? "no texto" : "na URL"}. NÃO INVENTAR.
- NÃO renomear pratos. Nome e preço EXATOS.
- Cada tamanho/versão = linha separada.
- Incluir: petiscos, executivos, pratos completos, individuais, porções, peixes, frango, suínos, guarnições com preparo, sobremesas com preparo.
- Ignorar: bebidas prontas, molhos avulsos, cafés de cápsula.

Retornar APENAS:
{"restaurante":{"nome":"...","qtd_pratos_cardapio":0,"tipo_operacao":"...","coccao_predominante":"..."},"pratos":[{"nome":"...","preco":0.00,"descricao":"..."}]}

Começar com { e terminar com }. NADA MAIS.`;

    const userMsg = usarTexto
      ? `Extraia TODOS os pratos:\n\n${textoCardapio}`
      : `Acesse e extraia TODOS os pratos: ${cardapio_url}`;

    console.log(`Chamando Perplexity (${usarTexto ? "texto" : "url"})...`);

    const ppxRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        max_tokens: 32000,
        temperature: 0.1,
      }),
    });

    if (!ppxRes.ok) {
      const err = await ppxRes.text();
      console.error("Perplexity erro:", ppxRes.status, err);
      return json({ error: `Perplexity retornou ${ppxRes.status}` }, 502);
    }

    const ppxData = await ppxRes.json();
    const content = ppxData?.choices?.[0]?.message?.content;
    if (!content) return json({ error: "IA não retornou conteúdo" }, 500);

    const menu = extrairJson(content);
    const pratos: any[] = menu?.pratos || menu?.pratos_detectados || [];

    console.log(`Pratos extraídos: ${pratos.length}`);
    if (!pratos.length) {
      return json({ error: "Nenhum prato encontrado", raw: content.substring(0, 300) }, 500);
    }

    // ── 4. CLASSIFICAR CADA PRATO E BUSCAR INSUMO ──
    const pratosAnalisados: any[] = [];
    const proteinasPorCategoria: Record<string, any[]> = {
      carnes: [], aves: [], pescados: [],
    };
    const guarnicoesPresentes = new Set<string>();

    for (const prato of pratos) {
      const c = classificar(prato.nome, prato.descricao);
      if (!c) continue;

      const insumo = buscarInsumo(c.insumo_busca, insumos);

      const item: any = {
        prato: prato.nome,
        preco_cardapio: prato.preco,
        insumo_match: insumo?.nome || c.insumo_busca,
        preco_kg: insumo?.preco_kg_referencia || 30,
        custo_porcao: insumo?.custo_por_porcao || 15,
        tipo_coccao: (insumo?.tipo_coccao || [])[0] || "grelha",
        usa_oleo: insumo?.usa_oleo || false,
        classificacao: c,
      };

      pratosAnalisados.push(item);

      if (c.tipo === "proteina") {
        if (!proteinasPorCategoria[c.categoria]) proteinasPorCategoria[c.categoria] = [];
        proteinasPorCategoria[c.categoria].push(item);
      }

      if (c.tipo === "guarnicao") {
        guarnicoesPresentes.add(c.sub);
      }
    }

    // ── 5. CALCULAR KG/MÊS POR CATEGORIA (per capita × distribuição) ──
    const totalRefeicoesMes = refeicoes_dia * dias_mes;
    const totalPratosProteina = Object.values(proteinasPorCategoria)
      .reduce((sum, arr) => sum + arr.length, 0) || 1;

    const materias_primas: Record<string, any> = {};

    for (const [categoria, pratosArr] of Object.entries(proteinasPorCategoria)) {
      if (!pratosArr.length) continue;

      // Distribuição: proporção de pratos proteína nessa categoria
      const distribuicao = pratosArr.length / totalPratosProteina;
      const refeicoesCat = totalRefeicoesMes * distribuicao;

      // Calcular kg e custo PRATO A PRATO (cada prato com SEU preço/kg)
      let kgTotal = 0;
      let custoTotal = 0;
      const itens = new Set<string>();

      for (const item of pratosArr) {
        const c = item.classificacao as ClassResult;
        const perCapitaG = PER_CAPITA[c!.sub] || 200;
        const proporcaoPrato = 1 / pratosArr.length; // divisão igual dentro da categoria
        const refeicoesPrato = refeicoesCat * proporcaoPrato;
        const kgPrato = (refeicoesPrato * perCapitaG) / 1000;
        const custoPrato = kgPrato * (item.preco_kg || 30);

        kgTotal += kgPrato;
        custoTotal += custoPrato;
        itens.add(item.insumo_match);

        // Anotar no prato
        item.kg_mes = Math.round(kgPrato);
        item.custo_mensal = Math.round(custoPrato);
        item.participacao = Number((distribuicao * proporcaoPrato).toFixed(4));
        item.porcoes_dia = Math.round(refeicoes_dia * item.participacao);
      }

      materias_primas[categoria] = {
        kg_mes: Math.round(kgTotal),
        preco_medio_kg: kgTotal > 0 ? Number((custoTotal / kgTotal).toFixed(2)) : 0,
        custo_mensal: Math.round(custoTotal),
        itens: Array.from(itens),
        distribuicao_pct: Number((distribuicao * 100).toFixed(1)),
      };
    }

    // ── 6. GUARNIÇÕES: per capita fixo (todos comem) ──
    const guarnicaoItems: Array<{ sub: string; fator: number }> = [
      { sub: "arroz", fator: 1.0 },
      { sub: "feijao", fator: 0.9 },
    ];
    if (guarnicoesPresentes.has("batata_frita")) guarnicaoItems.push({ sub: "batata_frita", fator: 0.35 });
    if (guarnicoesPresentes.has("mandioca")) guarnicaoItems.push({ sub: "mandioca", fator: 0.25 });
    if (guarnicoesPresentes.has("salada")) guarnicaoItems.push({ sub: "salada", fator: 0.40 });
    if (guarnicoesPresentes.has("farofa")) guarnicaoItems.push({ sub: "farofa", fator: 0.50 });
    if (guarnicoesPresentes.has("banana_milanesa")) guarnicaoItems.push({ sub: "banana_milanesa", fator: 0.20 });

    let kgLeg = 0;
    for (const { sub, fator } of guarnicaoItems) {
      kgLeg += (totalRefeicoesMes * fator * (PER_CAPITA[sub] || 80)) / 1000;
    }

    materias_primas["legumes"] = {
      kg_mes: Math.round(kgLeg),
      preco_medio_kg: 6.50,
      custo_mensal: Math.round(kgLeg * 6.50),
      itens: guarnicaoItems.map(g => g.sub),
      distribuicao_pct: 100,
    };

    // ── 7. ENERGIA, GORDURA, MÃO DE OBRA ──
    const energiaKwh = Math.round(totalRefeicoesMes * 1.3); // 1.3 kWh/refeição (Univ. Coimbra)

    let oleoLitros = 0;
    for (const item of pratosAnalisados) {
      if (item.usa_oleo && item.participacao) {
        oleoLitros += (totalRefeicoesMes * item.participacao * 15) / 1000; // 15ml por porção frita
      }
    }

    const horasCozinha = Math.round(totalRefeicoesMes * 0.1); // ~6min por refeição média

    // ── 8. MONTAR RESULTADO ──
    const resultado = {
      restaurante: {
        nome: menu?.restaurante?.nome || "Restaurante",
        qtd_pratos_cardapio: pratos.length,
        qtd_pratos_analisados: pratosAnalisados.length,
        tipo_operacao: menu?.restaurante?.tipo_operacao || menu?.restaurante?.tipo_operacao_inferido || "restaurante",
        coccao_predominante: menu?.restaurante?.coccao_predominante || menu?.restaurante?.metodo_coccao_predominante || "grelha",
        ticket_medio: pratos.length > 0
          ? Number((pratos.reduce((s: number, p: any) => s + (p.preco || 0), 0) / pratos.length).toFixed(2))
          : 0,
      },
      pratos_analisados: pratosAnalisados.map(p => ({
        prato: p.prato,
        preco_cardapio: p.preco_cardapio,
        insumo_match: p.insumo_match,
        preco_kg: p.preco_kg,
        custo_porcao: p.custo_porcao,
        tipo_coccao: p.tipo_coccao,
        usa_oleo: p.usa_oleo,
        participacao: p.participacao || 0,
        porcoes_dia: p.porcoes_dia || 0,
        custo_mensal: p.custo_mensal || 0,
      })),
      materias_primas,
      totais_mensais: {
        energia_kwh: energiaKwh,
        custo_kwh_usado: 0.80,
        energia_reais: Math.round(energiaKwh * 0.80),
        gordura_litros: Math.round(oleoLitros),
        gordura_reais: Math.round(oleoLitros * 8.50),
        horas_cozinha: horasCozinha,
        custo_hora: 23,
        mao_obra_reais: Math.round(horasCozinha * 23),
      },
    };

    console.log("Resultado:", JSON.stringify({
      pratos: resultado.restaurante.qtd_pratos_analisados,
      carnes: materias_primas["carnes"],
      aves: materias_primas["aves"],
      pescados: materias_primas["pescados"],
      legumes: materias_primas["legumes"],
    }));

    return json({ success: true, data: resultado });

  } catch (e: any) {
    console.error("ERRO:", e);
    return json({ error: e.message || "Erro desconhecido" }, 500);
  }
});
