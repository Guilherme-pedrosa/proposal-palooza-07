import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Find proposals expiring in 3 days
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const targetDate = in3Days.toISOString().split('T')[0];

  const { data: propostas, error } = await supabase
    .from('propostas')
    .select('id, numero, titulo, valor_total, validade_ate, vendedor_id, cliente_id, oportunidade_id')
    .eq('status', 'enviada')
    .eq('validade_ate', targetDate);

  if (error) {
    return new Response(JSON.stringify({ erro: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let alertasCriados = 0;

  for (const proposta of (propostas ?? [])) {
    // Create alert activity
    await supabase.from('atividades').insert({
      oportunidade_id: proposta.oportunidade_id,
      cliente_id: proposta.cliente_id,
      vendedor_id: proposta.vendedor_id,
      tipo: 'tarefa',
      titulo: `⏰ Proposta ${proposta.numero} expira em 3 dias`,
      descricao: `A proposta "${proposta.titulo}" no valor de R$ ${(proposta.valor_total || 0).toLocaleString('pt-BR')} expira em ${targetDate}. Contate o cliente.`,
      data_prevista: now.toISOString(),
      concluida: false,
    });

    // Create notification
    if (proposta.vendedor_id) {
      await supabase.from('notificacoes').insert({
        usuario_id: proposta.vendedor_id,
        tipo: 'alerta_proposta',
        titulo: `⏰ Proposta ${proposta.numero} expira em 3 dias`,
        descricao: `Valor: R$ ${(proposta.valor_total || 0).toLocaleString('pt-BR')}`,
        link: `/propostas/${proposta.id}`,
      });
    }

    alertasCriados++;
  }

  return new Response(JSON.stringify({ sucesso: true, alertas: alertasCriados }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
