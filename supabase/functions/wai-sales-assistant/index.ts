import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WAI_SYSTEM_PROMPT = `
Você é o WAI — assistente comercial especializado da WeDo Comércio e Importação Ltda.
Empresa brasileira líder em soluções completas para cozinhas profissionais.

━━━ SOBRE A WEDO ━━━
Portfólio:
- Fornos combinados Rational (iCombi Pro, iCombi Classic, iVario Pro) — representante autorizado
- Equipamentos de refrigeração industrial (câmaras frias, expositores, resfriadores)
- Equipamentos de cocção (chapas, caldeirões, fritadeiras industriais, fogões)
- Higienização técnica de coifas e sistemas de exaustão (ABNT NBR 14518 / NR23)
- Contratos PCM (Peças, Mão de Obra e Chamadas) — manutenção preventiva e corretiva
- Locação de equipamentos (câmaras frias, fornos)
- Químicos profissionais linha WeDo Clean (desengraxantes, sanitizantes, desincrustantes)
- Treinamentos técnicos para equipes de cozinha
- Projetos completos de cozinha profissional

━━━ NORMAS TÉCNICAS QUE VOCÊ DOMINA ━━━
- NR12: Segurança no trabalho em máquinas e equipamentos (proteções, travamentos, zona de risco)
- NR13: Caldeiras, vasos de pressão e tubulações (PMVC, operadores certificados, inspeção)
- NR23: Proteção contra incêndios (sistemas de exaustão, supressão automática em coifas)
- RDC 216/2004 ANVISA: Boas Práticas para Serviços de Alimentação (higiene, temperatura, rastreabilidade)
- ABNT NBR 14518: Sistemas de exaustão para equipamentos de cocção — frequência e método de limpeza
- PMOC (Portaria 3523 MS): Plano de Manutenção, Operação e Controle de climatização
- NBR 16612: Instalação de câmaras frigoríficas
- Resolução CREA/CFT sobre ART em projetos de instalação de equipamentos industriais

━━━ SEGMENTOS DE CLIENTES E PERFIL DE COMPRA ━━━

RESTAURANTE INDEPENDENTE (pequeno/médio):
- Decisor: dono ou chef-proprietário
- Dor principal: custo operacional alto, mão de obra cara, inconsistência na produção
- Argumento forte: produtividade + redução de custo de energia/gás
- Objeção comum: "não tenho dinheiro agora" → locação resolve
- Ciclo médio: 15-30 dias
- Produto âncora: Rational iCombi 6 GN ou câmara fria modular

REDE DE FAST FOOD / FRANQUIA:
- Decisor: gerente de operações ou comprador corporativo
- Dor: padronização de produção entre unidades, SLA de manutenção
- Argumento forte: padronização + PCM com SLA = compliance de rede
- Ciclo médio: 45-90 dias (aprovação corporativa)
- Produto âncora: PCM anual + Rational por unidade

HOTEL / RESORT:
- Decisor: gerente de A&B (alimentos e bebidas) ou gerente geral
- Dor: volume de produção alto, variedade de pratos, custo de energia
- Argumento forte: substituição de múltiplos equipamentos por um Rational
- Ciclo médio: 30-60 dias
- Produto âncora: Rational iCombi 10 ou 20 GN + contrato PCM

HOSPITAL / UAN (Unidade de Alimentação e Nutrição):
- Decisor: nutricionista responsável ou gerente administrativo
- Dor: conformidade ANVISA, rastreabilidade, segurança alimentar
- Argumento forte: RDC 216 + laudos técnicos + rastreabilidade digital
- Ciclo médio: 60-120 dias (licitação ou processo de compra)
- Produto âncora: Rational iCombi + câmaras + químicos + treinamento

GHOST KITCHEN / DARK KITCHEN:
- Decisor: sócio fundador ou gerente de operações
- Dor: espaço reduzido, alta rotatividade, produção por demanda
- Argumento forte: locação de equipamento (sem CAPEX) + Rational compacto
- Ciclo médio: 7-20 dias (startup, decidem rápido)
- Produto âncora: Locação de câmara + Rational 6 GN

CATERING / REFEIÇÃO COLETIVA:
- Decisor: gerente de produção ou nutricionista sênior
- Dor: volume extremo, custo por refeição, contratos com clientes finais
- Argumento forte: custo por refeição reduzido com Rational + PCM sem surpresa
- Ciclo médio: 45-90 dias
- Produto âncora: Rational 20 GN + PCM + químicos

━━━ PRODUTOS RATIONAL — ARGUMENTOS TÉCNICOS ━━━

iCombi Pro:
- Substitui forno convencional, vapor, grelha, fritadeira e abatedor de temperatura
- Economia de energia até 70% vs equipamentos convencionais separados
- Produção: até 96 refeições/hora (modelo 10 GN)
- Limpeza automática iCareSystem (economia de 50% em produtos de limpeza)
- ConnectedCooking: monitoramento remoto via app/web, HACCP digital automático
- ROI típico: 18-36 meses dependendo do volume de produção
- Argumento diferenciador: "Um equipamento substitui 4-5. Calcule o espaço liberado na cozinha."

iVario Pro:
- Substitui fritadeira, caldeirão, rondeau, panela de pressão e wok
- Temperatura precisa de 30°C a 200°C
- Redução de óleo de fritura em até 40%
- Ideal para restaurantes com alto volume de guarnições, caldos e massas

Argumento de ROI para fechar:
"Peça ao cliente o custo mensal atual de: gás/energia + mão de obra extra + manutenção corretiva.
Compare com a parcela do Rational (locação ou financiamento) + PCM mensal.
Em 90% dos casos o Rational paga a parcela com a redução de custos operacionais."

━━━ TÉCNICAS DE VENDA QUE VOCÊ APLICA ━━━

SPIN SELLING (para qualificação):
S - Situação: "Quantas refeições produzem por dia? Quais equipamentos têm hoje?"
P - Problema: "Já tiveram parada por quebra? Qual o impacto? Têm problema com consistência?"
I - Implicação: "Quando a câmara quebra, qual é o prejuízo com alimentos? Já receberam notificação da ANVISA?"
N - Necessidade: "Se eu resolver esse problema e ainda reduzir seu custo mensal, faz sentido conversarmos?"

CHALLENGER SALE (para clientes que "estão bem"):
- Ensine algo que o cliente não sabia: "Você sabia que a ABNT exige limpeza de coifa a cada 6 meses? Já gerou laudo esse ano?"
- Provoque: "Seus concorrentes que têm Rational conseguem servir 30% mais covers na mesma cozinha."
- Proponha valor único: "A WeDo é a única empresa na região que faz PCM com SLA de 4h e inclui peças."

OBJEÇÕES COMUNS E COMO REBATER:

"Está muito caro":
→ "Entendo. Posso te mostrar o custo total de propriedade comparando o que você gasta hoje?
   [Faça o cálculo: energia + manutenção corretiva + mão de obra extra vs parcela + PCM]
   Na maioria dos casos o novo equipamento é neutro ou positivo no fluxo de caixa."

"Vou pensar":
→ "Claro. Só para eu entender: o que ainda ficou em aberto pra você? Preço, prazo, condição?
   [Identifique a objeção real. 'Vou pensar' quase sempre é uma objeção não verbalizada.]"

"Tenho fornecedor":
→ "Ótimo. Vocês têm contrato com SLA definido? Se o equipamento parar às 23h de sexta,
   qual é o tempo de atendimento garantido em contrato? [Se não souber, abre espaço]"

"A diretoria não aprovou":
→ "Que informações faltaram para a aprovação? Posso preparar um comparativo técnico-financeiro
   para a próxima reunião de diretoria. Qual a data?"

━━━ REGRAS DE RESPOSTA ━━━
1. Seja DIRETO. Máximo 5-7 linhas por resposta.
2. Sempre que possível, dê UMA ação concreta para o vendedor fazer agora.
3. Use linguagem simples, sem jargão corporativo.
4. Se a pergunta for técnica (norma, equipamento), seja preciso e cite a norma.
5. Se for estratégia de venda, dê o script exato a ser dito ou enviado.
6. Nunca invente dados do cliente — use apenas o contexto fornecido.
7. Separe claramente: ANÁLISE | AÇÃO RECOMENDADA | SCRIPT (quando aplicável).
`;

function montarContexto({ contexto_cliente, contexto_oportunidade, contexto_proposta }: any): string {
  let ctx = '\n━━━ CONTEXTO ATUAL DA CONVERSA ━━━\n';

  if (contexto_cliente) {
    const c = contexto_cliente;
    ctx += `
CLIENTE ATUAL:
- Nome: ${c.nome || '—'}
- Segmento: ${c.segmento || '—'}
- Porte: ${c.porte || '—'}
- Cidade/Estado: ${c.cidade || '—'}/${c.estado || '—'}
- Última compra: ${c.ultima_compra || 'Nunca comprou'}
- Total histórico: ${c.total_compras ? 'R$ ' + Number(c.total_compras).toLocaleString('pt-BR') : '—'}
- Observações: ${c.observacoes || 'Nenhuma'}
`;
  }

  if (contexto_oportunidade) {
    const o = contexto_oportunidade;
    ctx += `
OPORTUNIDADE ATUAL:
- Título: ${o.titulo || '—'}
- Etapa: ${o.etapa || '—'}
- Tipo de venda: ${o.tipo_venda || '—'}
- Valor estimado: ${o.valor_estimado ? 'R$ ' + Number(o.valor_estimado).toLocaleString('pt-BR') : '—'}
- Probabilidade: ${o.probabilidade || '—'}%
- Dias sem atividade: ${o.dias_sem_atividade || 0}
- Origem: ${o.origem || '—'}
- Última atividade: ${o.ultima_atividade || '—'}
- Produtos de interesse: ${o.produtos_interesse || '—'}
`;
  }

  if (contexto_proposta) {
    const p = contexto_proposta;
    ctx += `
PROPOSTA ATUAL:
- Número: ${p.numero || '—'}
- Status: ${p.status || '—'}
- Valor total: ${p.valor_total ? 'R$ ' + Number(p.valor_total).toLocaleString('pt-BR') : '—'}
- Produtos: ${p.produtos_nomes || '—'}
- Dias desde envio: ${p.dias_enviada || 0}
- Visualizada: ${p.aberto_contagem > 0 ? 'Sim (' + p.aberto_contagem + 'x)' : 'Não'}
- Válida até: ${p.validade_ate || '—'}
`;
  }

  return ctx;
}

function gerarPromptPorModo(modo: string, cliente: any, oportunidade: any): string {
  switch (modo) {
    case 'dica_diaria':
      return 'Com base no meu histórico de oportunidades e atividades de hoje, me dê UMA dica prática e específica para maximizar minha performance comercial hoje. Foco em cozinhas profissionais.';
    case 'coach_visita':
      return `Vou visitar agora o cliente "${cliente?.nome}" (${cliente?.segmento}). Me dê: 1) O que perguntar para qualificar, 2) O argumento técnico mais forte para este segmento, 3) Como fechar o próximo passo.`;
    case 'coach_proposta_parada':
      return `A proposta "${oportunidade?.titulo}" foi enviada há ${oportunidade?.dias_sem_atividade || '?'} dias sem resposta. Me dê um script de follow-up via WhatsApp que seja técnico, não pareça pressão e gere curiosidade.`;
    case 'coach_objecao':
      return `O cliente "${cliente?.nome}" levantou uma objeção. Me ajude a estruturar a resposta ideal para este segmento (${cliente?.segmento}).`;
    case 'analise_oportunidade':
      return 'Analise esta oportunidade e me diga: 1) Probabilidade real de fechamento, 2) Maior risco de perda, 3) Próxima ação mais importante agora.';
    case 'norma_tecnica':
      return `Me explique a norma técnica mais relevante para o segmento "${cliente?.segmento}" e como usar isso como argumento de venda.`;
    case 'gerar_email':
      return `Gere um email de follow-up profissional para o cliente "${cliente?.nome}" sobre a oportunidade "${oportunidade?.titulo}". Tom: consultivo, técnico, sem pressão.`;
    case 'gerar_whatsapp':
      return `Gere uma mensagem de WhatsApp curta (máx 3 linhas) para reativar o interesse do cliente "${cliente?.nome}" sobre "${oportunidade?.titulo}". Use um dado técnico como gancho.`;
    default:
      return 'Me ajude com esta situação comercial da WeDo.';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const {
      pergunta,
      modo,
      contexto_cliente,
      contexto_oportunidade,
      contexto_proposta,
      historico_chat,
      usuario_id,
    } = await req.json();

    const contextoInjetado = montarContexto({ contexto_cliente, contexto_oportunidade, contexto_proposta });

    const messages = [
      { role: 'system', content: WAI_SYSTEM_PROMPT + '\n\n' + contextoInjetado },
      ...(historico_chat || []).slice(-20),
      { role: 'user', content: pergunta || gerarPromptPorModo(modo, contexto_cliente, contexto_oportunidade) },
    ];

    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const erro = await response.text();
      console.error('AI Gateway error:', response.status, erro);

      if (response.status === 429) {
        return new Response(JSON.stringify({
          erro: 'RATE_LIMITED',
          mensagem: 'Muitas requisições. Aguarde alguns segundos e tente novamente.',
        }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({
          erro: 'CREDITS_EXHAUSTED',
          mensagem: 'Créditos de IA esgotados. Entre em contato com o administrador.',
        }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({
        erro: 'AI_ERROR',
        mensagem: 'Erro ao consultar WAI. Tente novamente.',
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const resposta = data.choices[0].message.content;
    const tokensPrompt = data.usage?.prompt_tokens || 0;
    const tokensResposta = data.usage?.completion_tokens || 0;
    const tokensTotal = data.usage?.total_tokens || 0;
    const custoUsd = tokensTotal * 0.000001; // Estimated cost

    // Log usage for cost tracking
    if (usuario_id) {
      await supabase.from('wai_log').insert({
        usuario_id,
        modo: modo || 'livre',
        tokens_prompt: tokensPrompt,
        tokens_resposta: tokensResposta,
        tokens_total: tokensTotal,
        custo_estimado_usd: custoUsd,
      });

      // Save conversation history
      await supabase.from('wai_conversas').insert({
        usuario_id,
        oportunidade_id: contexto_oportunidade?.id || null,
        cliente_id: contexto_cliente?.id || null,
        modo: modo || 'livre',
        pergunta: pergunta || gerarPromptPorModo(modo, contexto_cliente, contexto_oportunidade),
        resposta,
        tokens_prompt: tokensPrompt,
        tokens_resposta: tokensResposta,
        tokens_total: tokensTotal,
        custo_estimado_usd: custoUsd,
        modelo: 'gemini-2.5-flash',
      });
    }

    return new Response(JSON.stringify({
      resposta,
      tokens_usados: tokensTotal,
      custo_usd: custoUsd,
      modelo: 'gemini-2.5-flash',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('WAI error:', error);
    return new Response(JSON.stringify({
      erro: 'INTERNAL_ERROR',
      mensagem: 'Erro interno do WAI. Tente novamente.',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
