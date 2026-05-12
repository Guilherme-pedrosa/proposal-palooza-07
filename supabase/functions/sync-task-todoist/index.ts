// Push de tarefas (atividades) do CRM para o app "Todoist Sync Calendar".
// Fire-and-forget: chamado pelo frontend logo após criar uma tarefa manualmente.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TARGET_URL = 'https://scgcbifmcvazmalqqpju.supabase.co/functions/v1/external-create-task';

const PRIORITY_BY_TIPO: Record<string, string> = {
  ligacao: 'p2',
  visita_tecnica: 'p1',
  demo_produto: 'p1',
  envio_proposta: 'p2',
  followup: 'p3',
  email: 'p3',
  whatsapp: 'p3',
  reuniao_online: 'p2',
  tarefa: 'p3',
  nota: 'p4',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get('TODOIST_SYNC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'TODOIST_SYNC_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { atividade_id, titulo, descricao, data_prevista, tipo, cliente_nome } = body || {};
  if (!atividade_id || !titulo) {
    return new Response(JSON.stringify({ error: 'atividade_id and titulo required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const fullTitle = cliente_nome ? `[${cliente_nome}] ${titulo}` : titulo;

  const payload = {
    title: fullTitle,
    description: descricao || null,
    due_at: data_prevista || null,
    priority: PRIORITY_BY_TIPO[tipo] || 'p3',
    external_ref: `wedo-crm:atividade:${atividade_id}`,
    external_source: 'wedo-crm',
  };

  try {
    const r = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-sync-source': 'wedo-crm',
      },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: r.ok, status: r.status, data }), {
      status: r.ok ? 200 : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
