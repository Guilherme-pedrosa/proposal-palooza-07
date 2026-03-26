import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, startOfDay, addDays, getDay, format, isToday, isTomorrow, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AtividadeRow } from './oportunidades';

export interface AtividadeComCliente extends AtividadeRow {
  oportunidade?: { id: string; titulo: string; valor_estimado: number | null } | null;
  cliente?: { id: string; nome: string; telefone: string | null } | null;
}

export async function fetchAtividadesVendedor(vendedorId: string): Promise<AtividadeComCliente[]> {
  const { data, error } = await supabase
    .from('atividades')
    .select('*, oportunidade:oportunidades(id, titulo, valor_estimado), cliente:clientes_gc(id, nome, telefone)')
    .eq('vendedor_id', vendedorId)
    .eq('concluida', false)
    .order('data_prevista', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as AtividadeComCliente[];
}

export async function fetchMetaVendedor(vendedorId: string, mes: number, ano: number) {
  const { data } = await supabase
    .from('metas')
    .select('*')
    .eq('vendedor_id', vendedorId)
    .eq('mes', mes)
    .eq('ano', ano)
    .maybeSingle();

  return data;
}

export async function fetchOpsGanhasNoMes(vendedorId: string, mes: number, ano: number) {
  const inicio = new Date(ano, mes - 1, 1).toISOString();
  const fim = new Date(ano, mes, 0, 23, 59, 59).toISOString();

  const { data } = await supabase
    .from('oportunidades')
    .select('valor_estimado')
    .eq('vendedor_id', vendedorId)
    .eq('etapa', 'fechado_ganho')
    .gte('updated_at', inicio)
    .lte('updated_at', fim);

  return (data ?? []).reduce((s, o) => s + (o.valor_estimado ?? 0), 0);
}

export async function concluirAtividade(id: string, resultado: string) {
  const { error } = await supabase
    .from('atividades')
    .update({ concluida: true, data_realizada: new Date().toISOString(), resultado })
    .eq('id', id);
  if (error) throw error;
}

export async function adiarAtividade(id: string, novaData: string) {
  const { error } = await supabase
    .from('atividades')
    .update({ data_prevista: novaData })
    .eq('id', id);
  if (error) throw error;
}

export function proximoDiaUtil(data: Date): Date {
  const d = addDays(data, 1);
  const dia = getDay(d);
  if (dia === 0) return addDays(d, 1);
  if (dia === 6) return addDays(d, 2);
  return d;
}

export type GrupoAtividade = 'atrasada' | 'hoje' | 'amanha' | 'proximos';

export function grupoAtividade(dataPrevista: string | null): GrupoAtividade {
  if (!dataPrevista) return 'proximos';
  const d = startOfDay(new Date(dataPrevista));
  const hoje = startOfDay(new Date());
  if (isBefore(d, hoje)) return 'atrasada';
  if (isToday(d)) return 'hoje';
  if (isTomorrow(d)) return 'amanha';
  return 'proximos';
}

export const tipoAtividadeIcons: Record<string, string> = {
  ligacao: '📞',
  visita_tecnica: '🏃',
  demo_produto: '🍳',
  envio_proposta: '📄',
  followup: '🔁',
  email: '📧',
  whatsapp: '💬',
  reuniao_online: '🖥️',
  tarefa: '✅',
  nota: '📝',
};

export function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
