import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: vendedores } = await supabase
    .from('usuarios')
    .select('id, nome')
    .in('perfil', ['vendedor', 'gestor'])
    .eq('ativo', true);

  for (const vendedor of (vendedores || [])) {
    const hoje = new Date().toISOString().split('T')[0];

    const [atividadesHoje, oportunidadesQuentes, propostasParadas] = await Promise.all([
      supabase.from('atividades')
        .select('tipo, titulo')
        .eq('vendedor_id', vendedor.id)
        .eq('concluida', false)
        .gte('data_prevista', hoje)
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
    ]);

    const promptDia = `
Vendedor: ${vendedor.nome}
Data: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}

Atividades hoje: ${atividadesHoje.data?.map(a => `${a.tipo}: ${a.titulo}`).join('; ') || 'Nenhuma'}
Oportunidades quentes: ${oportunidadesQuentes.data?.map(o => `${o.titulo} R$${Number(o.valor_estimado).toLocaleString('pt-BR')} (${o.etapa})`).join('; ') || 'Nenhuma'}
Propostas paradas >7d: ${propostasParadas.data?.map(p => `#${p.numero} R$${Number(p.valor_total).toLocaleString('pt-BR')}`).join('; ') || 'Nenhuma'}

Gere: 1) UMA dica de vendas (2 linhas), 2) UMA ação prioritária, 3) UM insight técnico sobre cozinhas profissionais. Seja direto.`;

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

      const data = await response.json();
      const dica = data.choices?.[0]?.message?.content || '';

      if (dica) {
        await supabase.from('notificacoes').insert({
          usuario_id: vendedor.id,
          tipo: 'dica_wai',
          titulo: '💡 Sua dica WAI para hoje',
          descricao: dica,
          link: '/hoje',
          lida: false,
        });
      }
    } catch (e) {
      console.error(`Erro ao gerar dica para ${vendedor.nome}:`, e);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
