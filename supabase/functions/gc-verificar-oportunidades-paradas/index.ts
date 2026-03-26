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

  // Find stale opportunities (>5 days without activity, not closed)
  const { data: ops, error } = await supabase
    .from('oportunidades')
    .select('id, titulo, vendedor_id, cliente_id, ultima_atividade_em, updated_at')
    .not('etapa', 'in', '(fechado_ganho,fechado_perdido)');

  if (error) {
    return new Response(JSON.stringify({ erro: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const now = new Date();
  const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  let alertasCriados = 0;

  for (const op of (ops ?? [])) {
    const lastActivity = op.ultima_atividade_em || op.updated_at;
    if (!lastActivity) continue;
    const diff = now.getTime() - new Date(lastActivity).getTime();
    if (diff < FIVE_DAYS_MS) continue;

    const dias = Math.floor(diff / (24 * 60 * 60 * 1000));

    // Check if alert already created in last 2 days
    const { data: existing } = await supabase
      .from('atividades')
      .select('id')
      .eq('oportunidade_id', op.id)
      .eq('tipo', 'tarefa')
      .ilike('titulo', '⚠️ Oportunidade parada%')
      .gte('created_at', new Date(now.getTime() - TWO_DAYS_MS).toISOString())
      .limit(1);

    if (existing && existing.length > 0) continue;

    // Create alert activity
    await supabase.from('atividades').insert({
      oportunidade_id: op.id,
      cliente_id: op.cliente_id,
      vendedor_id: op.vendedor_id,
      tipo: 'tarefa',
      titulo: '⚠️ Oportunidade parada — verificar status',
      descricao: `Esta oportunidade está ${dias} dias sem atividade. Entre em contato com o cliente.`,
      data_prevista: now.toISOString(),
      concluida: false,
    });

    // Create notification
    if (op.vendedor_id) {
      await supabase.from('notificacoes').insert({
        usuario_id: op.vendedor_id,
        tipo: 'alerta_oportunidade',
        titulo: `⚠️ "${op.titulo}" parada há ${dias} dias`,
        descricao: 'Entre em contato com o cliente.',
        link: `/oportunidades/${op.id}`,
      });
    }

    alertasCriados++;
  }

  return new Response(JSON.stringify({ sucesso: true, alertas: alertasCriados }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
