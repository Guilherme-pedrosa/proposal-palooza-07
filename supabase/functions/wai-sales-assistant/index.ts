import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

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
- Químicos profissionais linha WeDo Clean
- Treinamentos técnicos para equipes de cozinha
- Projetos completos de cozinha profissional

━━━ NORMAS TÉCNICAS ━━━
- NR12: Segurança em máquinas e equipamentos
- NR13: Caldeiras, vasos de pressão e tubulações
- NR23: Proteção contra incêndios (exaustão, supressão)
- RDC 216/2004 ANVISA: Boas Práticas para Serviços de Alimentação
- ABNT NBR 14518: Sistemas de exaustão para equipamentos de cocção
- PMOC (Portaria 3523 MS): Plano de Manutenção de climatização
- NBR 16612: Instalação de câmaras frigoríficas

━━━ SEGMENTOS ━━━
RESTAURANTE: dono/chef, dor=custo operacional, âncora=Rational 6GN, ciclo 15-30d
FAST FOOD/FRANQUIA: gerente ops, dor=padronização, âncora=PCM+Rational, ciclo 45-90d
HOTEL/RESORT: gerente A&B, dor=volume+energia, âncora=Rational 10/20GN+PCM, ciclo 30-60d
HOSPITAL/UAN: nutricionista, dor=ANVISA compliance, âncora=combo completo, ciclo 60-120d
GHOST KITCHEN: sócio fundador, dor=espaço+CAPEX, âncora=locação+Rational 6GN, ciclo 7-20d
CATERING: gerente produção, dor=custo/refeição, âncora=Rational 20GN+PCM, ciclo 45-90d

━━━ PRODUTOS RATIONAL ━━━
iCombi Pro: substitui 5 equipamentos, economia energia 70%, até 96 refeições/h (10GN), iCareSystem, ConnectedCooking, ROI 18-36 meses
iVario Pro: substitui fritadeira+caldeirão+panela pressão+wok, 30-200°C, redução óleo 40%

━━━ TÉCNICAS DE VENDA ━━━
SPIN SELLING: Situação→Problema→Implicação→Necessidade
CHALLENGER SALE: Ensine→Provoque→Proponha valor único

OBJEÇÕES:
"Caro" → mostrar custo total propriedade (energia+manutenção vs parcela+PCM)
"Vou pensar" → identificar objeção real não verbalizada
"Tenho fornecedor" → perguntar sobre SLA garantido em contrato
"Diretoria não aprovou" → preparar comparativo técnico-financeiro

━━━ REGRAS ━━━
1. Seja DIRETO. Máximo 5-7 linhas por resposta.
2. Sempre dê UMA ação concreta para o vendedor fazer agora.
3. Linguagem simples, sem jargão corporativo.
4. Perguntas técnicas: seja preciso e cite a norma.
5. Estratégia de venda: dê o script exato.
6. Nunca invente dados do cliente — use apenas o contexto fornecido.
7. Separe: ANÁLISE | AÇÃO RECOMENDADA | SCRIPT (quando aplicável).
`;

function montarContexto({ contexto_cliente, contexto_oportunidade, contexto_proposta }: any): string {
  let ctx = '\n━━━ CONTEXTO ATUAL ━━━\n';

  if (contexto_cliente) {
    ctx += `\nCLIENTE: ${contexto_cliente.nome || '—'} | Segmento: ${contexto_cliente.segmento || '—'} | Porte: ${contexto_cliente.porte || '—'} | ${contexto_cliente.cidade || '—'}/${contexto_cliente.estado || '—'} | Última compra: ${contexto_cliente.ultima_compra || 'Nunca'} | Total: R$ ${contexto_cliente.total_compras?.toLocaleString('pt-BR') || '0'} | Obs: ${contexto_cliente.observacoes || '—'}\n`;
  }

  if (contexto_oportunidade) {
    ctx += `\nOPORTUNIDADE: ${contexto_oportunidade.titulo || '—'} | Etapa: ${contexto_oportunidade.etapa || '—'} | Tipo: ${contexto_oportunidade.tipo_venda || '—'} | Valor: R$ ${Number(contexto_oportunidade.valor_estimado || 0).toLocaleString('pt-BR')} | Prob: ${contexto_oportunidade.probabilidade || '—'}% | Temp: ${contexto_oportunidade.temperatura || '—'} | Dias s/ativ: ${contexto_oportunidade.dias_sem_atividade || 0} | Produtos: ${contexto_oportunidade.produtos_interesse || '—'}\n`;
  }

  if (contexto_proposta) {
    ctx += `\nPROPOSTA: #${contexto_proposta.numero || '—'} | Status: ${contexto_proposta.status || '—'} | Valor: R$ ${Number(contexto_proposta.valor_total || 0).toLocaleString('pt-BR')} | Produtos: ${contexto_proposta.produtos_nomes || '—'} | Dias enviada: ${contexto_proposta.dias_enviada || 0} | Visualizada: ${contexto_proposta.aberto_contagem > 0 ? `Sim (${contexto_proposta.aberto_contagem}x)` : 'Não'} | Válida até: ${contexto_proposta.validade_ate || '—'}\n`;
  }

  return ctx;
}

function gerarPromptPorModo(modo: string, cliente: any, oportunidade: any): string {
  switch (modo) {
    case 'dica_diaria':
      return 'Com base no meu histórico, me dê UMA dica prática para maximizar minha performance comercial hoje em cozinhas profissionais.';
    case 'coach_visita':
      return `Vou visitar o cliente "${cliente?.nome}" (${cliente?.segmento}). Me dê: 1) O que perguntar, 2) Argumento técnico mais forte, 3) Como fechar o próximo passo.`;
    case 'coach_proposta_parada':
      return `A proposta "${oportunidade?.titulo}" foi enviada há ${oportunidade?.dias_sem_atividade || '?'} dias sem resposta. Me dê um script de follow-up WhatsApp técnico que gere curiosidade.`;
    case 'coach_objecao':
      return `O cliente "${cliente?.nome}" levantou uma objeção. Ajude a estruturar a resposta para o segmento "${cliente?.segmento}".`;
    case 'analise_oportunidade':
      return 'Analise esta oportunidade: 1) Probabilidade real, 2) Maior risco de perda, 3) Próxima ação mais importante.';
    case 'norma_tecnica':
      return `Me explique a norma técnica mais relevante para o segmento "${cliente?.segmento}" e como usar como argumento de venda.`;
    case 'gerar_email':
      return `Gere um email de follow-up profissional para "${cliente?.nome}" sobre "${oportunidade?.titulo}". Tom: consultivo, técnico, sem pressão.`;
    case 'gerar_whatsapp':
      return `Gere uma mensagem WhatsApp curta (máx 3 linhas) para reativar "${cliente?.nome}" sobre "${oportunidade?.titulo}". Use um dado técnico como gancho.`;
    default:
      return 'Me ajude com esta situação comercial da WeDo.';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pergunta, modo, contexto_cliente, contexto_oportunidade, contexto_proposta, historico_chat } = await req.json();

    const contextoInjetado = montarContexto({ contexto_cliente, contexto_oportunidade, contexto_proposta });

    const messages = [
      { role: 'system', content: WAI_SYSTEM_PROMPT + contextoInjetado },
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
      console.error('AI Gateway error:', erro);
      return new Response(JSON.stringify({
        erro: 'AI_ERROR',
        mensagem: 'Erro ao consultar WAI. Tente novamente.',
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const resposta = data.choices[0].message.content;
    const tokens_usados = data.usage?.total_tokens || 0;

    return new Response(JSON.stringify({ resposta, tokens_usados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('WAI error:', error);
    return new Response(JSON.stringify({
      erro: 'INTERNAL_ERROR',
      mensagem: 'Erro interno do WAI.',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
