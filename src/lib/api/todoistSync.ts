import { supabase } from '@/integrations/supabase/client';

/**
 * Converte data_prevista para um ISO "wall-clock" — preserva o horário que o
 * usuário digitou, ignorando fuso. O outro sistema usa due_time = ISO.slice(11,19)
 * direto, então precisamos enviar HH:mm em UTC IGUAL ao relógio local.
 */
function toWallClockISO(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Caso já seja "YYYY-MM-DDTHH:mm" (datetime-local sem TZ)
  const m = String(raw).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (m && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    return `${m[1]}T${m[2]}:${m[3]}:00.000Z`;
  }
  // Caso tenha vindo como ISO UTC, reextrai a hora local do navegador
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00.000Z`;
}

/**
 * Fire-and-forget: envia tarefa criada manualmente para o app Todoist Sync Calendar.
 * Não bloqueia a UI nem dispara erro se falhar.
 */
export async function pushTarefaParaTodoist(input: {
  atividade_id: string;
  titulo: string;
  descricao?: string | null;
  data_prevista?: string | null;
  tipo?: string | null;
  cliente_id?: string | null;
  prioridade?: 'p1' | 'p2' | 'p3' | 'p4' | null;
}) {
  try {
    let cliente_nome: string | null = null;
    if (input.cliente_id) {
      const { data } = await supabase
        .from('clientes_gc')
        .select('nome')
        .eq('id', input.cliente_id)
        .maybeSingle();
      cliente_nome = data?.nome ?? null;
    }
    await supabase.functions.invoke('sync-task-todoist', {
      body: {
        atividade_id: input.atividade_id,
        titulo: input.titulo,
        descricao: input.descricao ?? null,
        data_prevista: toWallClockISO(input.data_prevista ?? null),
        tipo: input.tipo ?? 'tarefa',
        cliente_nome,
      },
    });
  } catch (e) {
    console.warn('[todoist-sync] push falhou (não-bloqueante):', e);
  }
}
