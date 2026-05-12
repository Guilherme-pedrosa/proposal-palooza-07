// Recebe callbacks do app "Todoist Sync Calendar" quando uma tarefa é
// concluída/reaberta lá fora, e atualiza a atividade correspondente no CRM.
// Público (sem JWT), autenticado via header x-callback-key.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-callback-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const expected = Deno.env.get('CRM_CALLBACK_KEY');
  if (!expected) return json({ error: 'Server misconfigured' }, 500);

  const provided = req.headers.get('x-callback-key');
  if (provided !== expected) return json({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  // Aceita formato { external_ref, status, completed_at, comment } OU { external_ref, completed, ... }
  const externalRef: string | undefined = body.external_ref;
  if (!externalRef) return json({ error: 'external_ref required' }, 400);

  const m = String(externalRef).match(/^wedo-crm:atividade:([0-9a-f-]{36})$/i);
  if (!m) {
    console.log('[receive-task-update] external_ref ignorado (não é do CRM):', externalRef);
    return json({ ok: true, skipped: true });
  }
  const atividadeId = m[1];

  const completed =
    typeof body.completed === 'boolean'
      ? body.completed
      : body.status === 'done' || body.status === 'completed' || body.status === 'concluida';

  const completedAt: string | null = body.completed_at ?? body.completedAt ?? (completed ? new Date().toISOString() : null);

  // Comment pode vir como string única ou lista
  let comentario: string | null = null;
  if (typeof body.comment === 'string' && body.comment.trim()) comentario = body.comment.trim();
  else if (typeof body.comments === 'string' && body.comments.trim()) comentario = body.comments.trim();
  else if (Array.isArray(body.comments)) {
    comentario = body.comments
      .map((c: any) => (typeof c === 'string' ? c : c?.text ?? c?.body ?? c?.content ?? ''))
      .filter(Boolean)
      .join('\n---\n') || null;
  } else if (typeof body.resultado === 'string') {
    comentario = body.resultado;
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const update: Record<string, unknown> = {
    concluida: completed,
    data_realizada: completed ? completedAt : null,
  };
  if (comentario != null) update.resultado = comentario;

  const { data, error } = await admin
    .from('atividades')
    .update(update)
    .eq('id', atividadeId)
    .select('id, concluida, data_realizada, resultado')
    .maybeSingle();

  if (error) {
    console.error('[receive-task-update] update error', error);
    return json({ error: error.message }, 500);
  }

  if (!data) return json({ ok: true, skipped: 'atividade not found', atividade_id: atividadeId });

  console.log('[receive-task-update] OK', atividadeId, { completed, hasComment: !!comentario });
  return json({ ok: true, atividade: data });
});
