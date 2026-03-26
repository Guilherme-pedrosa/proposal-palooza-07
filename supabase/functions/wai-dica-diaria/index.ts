import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { data: vendedores, error: errVend } = await supabase
      .from('usuarios')
      .select('id, nome')
      .in('perfil', ['vendedor', 'gestor'])
      .eq('ativo', true);

    if (errVend || !vendedores?.length) {
      return new Response(JSON.stringify({ ok: false, erro: 'Sem vendedores ativos' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const hoje = new Date().toISOString().split('T')[0];
    let geradas = 0;

    for (const vendedor of vendedores) {
      const [atividadesHoje, oportunidadesQuentes, propostasParadas, metaMes] = await Promise.all([
        supabase.from('atividades')
          .select('tipo, titulo')
          .eq('vendedor_id', vendedor.id)
          .eq('concluida', false)
          .gte('data_prevista', hoje + 'T00:00:00')
          .lte('data_prevista', hoje + 'T23:59:59')
          .limit(5),

        supabase.from('oportunidades')
          .select('titulo, etapa, valor_estimado, temperatura')
          .eq('vendedor_id', vendedor.id)
          .eq('temperatura', 'quente')
          .not('etapa', 'in', '(fechado_ganho,fechado_perdido)')
          .limit(3),

        supabase.from('propostas')
          .select('numero, valor_total, updated_at')
          .eq('vendedor_id', vendedor.id)
          .eq('status', 'enviada')
          .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(3),

        supabase.from('metas')
          .select('meta_valor, meta_propostas, meta_visitas')
          .eq('vendedor_id', vendedor.id)
          .eq('mes', new Date().getMonth() + 1)
          .eq('ano', new Date().getFullYear())
          .maybeSingle(),
      ]);

      const dataFormatada = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long',
      });

      const promptDia = `
Vendedor: ${vendedor.nome}
Data: ${dataFormatada}

Atividades agendadas para hoje:
${atividadesHoje.data?.map((a: any) => `- ${a.tipo}: ${a.titulo}`).join('\n') || 'Nenhuma atividade agendada'}

Oportunidades quentes em andamento:
${oportunidadesQuentes.data?.map((o: any) => `- ${o.titulo}: R$ ${Number(o.valor_estimado || 0).toLocaleString('pt-BR')} — ${o.etapa}`).join('\n') || 'Nenhuma oportunidade quente'}

Propostas paradas há mais de 7 dias sem resposta:
${propostasParadas.data?.map((p: any) => `- #${p.numero}: R$ ${Number(p.valor_total || 0).toLocaleString('pt-BR')}`).join('\n') || 'Nenhuma proposta parada'}

Meta do mês: ${metaMes.data ? `R$ ${Number(metaMes.data.meta_valor || 0).toLocaleString('pt-BR')}` : 'Sem meta definida'}

Com base nesse contexto, gere:
1. UMA dica de vendas para hoje (máx 2 linhas, prática, específica para o contexto)
2. UMA ação prioritária para as próximas 2 horas
3. UM insight técnico sobre cozinhas profissionais para usar em conversa hoje

Seja direto, prático, sem enrolação. Tom: sócio estratégico falando com o vendedor.
Máximo 8 linhas no total.`;

      try {
        const response = await fetch(AI_GATEWAY_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              { role: 'system', content: 'Você é o WAI, assistente comercial da WeDo especializado em cozinhas profissionais. Seja direto e prático.' },
              { role: 'user', content: promptDia },
            ],
            temperature: 0.8,
            max_tokens: 400,
          }),
        });

        if (!response.ok) {
          console.error(`Erro AI para ${vendedor.nome}:`, await response.text());
          continue;
        }

        const data = await response.json();
        const dica = data.choices?.[0]?.message?.content || '';
        const tokensTotal = data.usage?.total_tokens || 0;

        if (!dica) continue;

        // Salvar notificação + log em paralelo
        await Promise.all([
          supabase.from('notificacoes').insert({
            usuario_id: vendedor.id,
            tipo: 'dica_wai',
            titulo: '💡 Sua dica WAI para hoje',
            descricao: dica,
            link: '/hoje',
            lida: false,
          }),
          supabase.from('wai_log').insert({
            usuario_id: vendedor.id,
            modo: 'dica_diaria',
            tokens_prompt: data.usage?.prompt_tokens || 0,
            tokens_resposta: data.usage?.completion_tokens || 0,
            tokens_total: tokensTotal,
            custo_estimado_usd: tokensTotal * 0.000003,
          }),
        ]);

        geradas++;
      } catch (e) {
        console.error(`Erro ao gerar dica para ${vendedor.nome}:`, e);
      }

      // Delay entre vendedores para rate limit
      await new Promise(r => setTimeout(r, 500));
    }

    return new Response(JSON.stringify({
      ok: true,
      vendedores_processados: vendedores.length,
      dicas_geradas: geradas,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na dica diária:', error);
    return new Response(JSON.stringify({
      ok: false,
      erro: (error as Error).message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
