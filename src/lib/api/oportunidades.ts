import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, startOfDay } from 'date-fns';

export interface EtapaKanban {
  id: string;
  label: string;
  emoji: string;
  cor: string;
  descricao: string;
  probabilidade_padrao: number;
}

export const ETAPAS_KANBAN: EtapaKanban[] = [
  { id: 'prospeccao', label: 'Prospecção', emoji: '🔵', cor: '#3B82F6', descricao: 'Primeiro contato realizado', probabilidade_padrao: 10 },
  { id: 'qualificacao', label: 'Qualificação', emoji: '🟣', cor: '#8B5CF6', descricao: 'Necessidade confirmada', probabilidade_padrao: 25 },
  { id: 'visita_tecnica', label: 'Visita Técnica', emoji: '🟠', cor: '#F97316', descricao: 'Visitou a cozinha', probabilidade_padrao: 40 },
  { id: 'proposta_enviada', label: 'Proposta Enviada', emoji: '🟡', cor: '#EAB308', descricao: 'Proposta/orçamento enviado', probabilidade_padrao: 60 },
  { id: 'negociacao', label: 'Negociação', emoji: '🔴', cor: '#EF4444', descricao: 'Em negociação de condições', probabilidade_padrao: 80 },
  { id: 'fechado_ganho', label: 'Fechado ✅', emoji: '🟢', cor: '#22C55E', descricao: 'Pedido/contrato confirmado', probabilidade_padrao: 100 },
  { id: 'fechado_perdido', label: 'Perdido ❌', emoji: '⚫', cor: '#6B7280', descricao: 'Oportunidade encerrada', probabilidade_padrao: 0 },
];

export const CHECKLISTS_ETAPA: Record<string, string[]> = {
  qualificacao: ['Telefone do responsável confirmado', 'Segmento da cozinha definido'],
  visita_tecnica: ['Necessidade/dor confirmada', 'Tipo de equipamento de interesse definido'],
  proposta_enviada: ['Visita técnica realizada (atividade concluída)', 'Equipamentos da cozinha levantados'],
  negociacao: ['Proposta enviada (link rastreável gerado)'],
  fechado_ganho: ['Valor final acordado', 'Forma de pagamento definida', 'Orçamento aberto no GestãoClick'],
};

export interface OportunidadeRow {
  id: string;
  numero: number;
  titulo: string;
  cliente_id: string | null;
  vendedor_id: string | null;
  etapa: string;
  tipo_venda: string | null;
  valor_estimado: number | null;
  probabilidade: number | null;
  data_fechamento_prevista: string | null;
  motivo_perda_id: string | null;
  descricao_perda: string | null;
  origem: string | null;
  temperatura: string | null;
  produtos_interesse: string[] | null;
  ultima_atividade_em: string | null;
  checklist_etapa: Record<string, boolean> | null;
  created_at: string | null;
  updated_at: string | null;
  gc_orcamento_id: string | null;
  gc_orcamento_url: string | null;
  // Joined
  cliente?: { id: string; nome: string; telefone: string | null } | null;
}

export interface AtividadeRow {
  id: string;
  oportunidade_id: string | null;
  cliente_id: string | null;
  vendedor_id: string | null;
  tipo: string;
  titulo: string;
  descricao: string | null;
  data_prevista: string | null;
  data_realizada: string | null;
  duracao_minutos: number | null;
  resultado: string | null;
  proxima_acao: string | null;
  proxima_data: string | null;
  concluida: boolean | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
}

export async function fetchOportunidades() {
  const { data, error } = await supabase
    .from('oportunidades')
    .select('*, cliente:clientes_gc(id, nome, telefone)')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as OportunidadeRow[];
}

export async function fetchAtividadesByOportunidades(opIds: string[]) {
  if (opIds.length === 0) return [];
  const { data, error } = await supabase
    .from('atividades')
    .select('*')
    .in('oportunidade_id', opIds);

  if (error) throw error;
  return (data ?? []) as unknown as AtividadeRow[];
}

export async function updateOportunidadeEtapa(id: string, etapa: string, extra?: Record<string, any>) {
  const { error } = await supabase
    .from('oportunidades')
    .update({ etapa, updated_at: new Date().toISOString(), ...extra })
    .eq('id', id);

  if (error) throw error;
}

export async function insertAtividade(atividade: {
  oportunidade_id?: string;
  cliente_id?: string;
  vendedor_id?: string;
  tipo: string;
  titulo: string;
  descricao?: string;
  data_prevista?: string;
  data_realizada?: string;
  resultado?: string;
  concluida?: boolean;
}) {
  const { error } = await supabase.from('atividades').insert(atividade);
  if (error) throw error;
}

export async function fetchMotivosPerda() {
  const { data, error } = await supabase
    .from('motivos_perda')
    .select('*')
    .eq('ativo', true);

  if (error) throw error;
  return data ?? [];
}

export function calcularBadgeAtividade(atividades: AtividadeRow[]) {
  const proxima = atividades
    .filter((a) => !a.concluida && a.data_prevista)
    .sort((a, b) => new Date(a.data_prevista!).getTime() - new Date(b.data_prevista!).getTime())[0];

  if (!proxima) return { tipo: 'sem_atividade', label: '🟡 Sem atividade', cor: 'yellow' as const };

  const hoje = startOfDay(new Date());
  const dataAtiv = startOfDay(new Date(proxima.data_prevista!));
  const diff = differenceInDays(dataAtiv, hoje);

  if (diff < 0) return { tipo: 'atrasada', label: '🔴 Atrasada', cor: 'red' as const };
  if (diff === 0) return { tipo: 'hoje', label: '🟢 Hoje', cor: 'green' as const };
  return { tipo: 'futura', label: `⚫ Em ${diff}d`, cor: 'gray' as const };
}

export function diasNaEtapa(updatedAt: string | null): number {
  if (!updatedAt) return 0;
  return differenceInDays(new Date(), new Date(updatedAt));
}

export const tipoVendaLabels: Record<string, string> = {
  equipamento_novo: '🍳 Equipamento Novo',
  locacao: '🔄 Locação',
  contrato_pcm: '🔧 Contrato PCM',
  manutencao_avulsa: '🛠️ Manutenção Avulsa',
  higienizacao_coifa: '💨 Higienização Coifa',
  quimicos: '🧪 Químicos',
  instalacao: '⚙️ Instalação',
  treinamento: '📚 Treinamento',
  projeto_completo: '🏗️ Projeto Completo',
};

export const temperaturaLabels: Record<string, { label: string; emoji: string }> = {
  quente: { label: 'Quente', emoji: '🔥' },
  morno: { label: 'Morno', emoji: '☁️' },
  frio: { label: 'Frio', emoji: '🧊' },
};

export function formatBRL(value: number | null | undefined): string {
  if (value == null) return 'R$ 0';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
