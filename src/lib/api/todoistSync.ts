import { supabase } from '@/integrations/supabase/client';

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
        data_prevista: input.data_prevista ?? null,
        tipo: input.tipo ?? 'tarefa',
        cliente_nome,
      },
    });
  } catch (e) {
    console.warn('[todoist-sync] push falhou (não-bloqueante):', e);
  }
}
