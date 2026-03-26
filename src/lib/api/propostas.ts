import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from './oportunidades';

export interface PropostaRow {
  id: string;
  numero: string;
  titulo: string;
  descricao: string | null;
  cliente_id: string | null;
  oportunidade_id: string | null;
  vendedor_id: string | null;
  template_id: string | null;
  status: string | null;
  produtos: any[];
  termos_condicoes: any[];
  imagens: any[] | null;
  valor_total: number | null;
  desconto_total: number | null;
  validade_ate: string | null;
  validade_dias: number | null;
  versao: number;
  historico_versoes: any[] | null;
  observacoes_internas: string | null;
  link_publico_uuid: string | null;
  aberto_em: string | null;
  aberto_contagem: number | null;
  aberto_por_ip: string | null;
  pdf_url: string | null;
  gc_orcamento_id: string | null;
  gc_orcamento_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined
  cliente?: { id: string; nome: string; cnpj: string | null; razao_social: string | null; email: string | null; telefone: string | null; cidade: string | null; segmento: string | null } | null;
}

export const STATUS_PROPOSTA = {
  rascunho: { label: 'Rascunho', emoji: '🟡', bg: 'bg-yellow-100 text-yellow-800' },
  enviada: { label: 'Enviada', emoji: '🔵', bg: 'bg-blue-100 text-blue-800' },
  visualizada: { label: 'Visualizada', emoji: '👁️', bg: 'bg-purple-100 text-purple-800' },
  aprovada: { label: 'Aprovada', emoji: '🟢', bg: 'bg-green-100 text-green-800' },
  recusada: { label: 'Recusada', emoji: '🔴', bg: 'bg-red-100 text-red-800' },
  expirada: { label: 'Expirada', emoji: '⚫', bg: 'bg-gray-100 text-gray-800' },
} as const;

export type StatusProposta = keyof typeof STATUS_PROPOSTA;

export async function fetchPropostas(): Promise<PropostaRow[]> {
  const { data, error } = await supabase
    .from('propostas')
    .select('*, cliente:clientes_gc(id, nome, cnpj, razao_social, email, telefone, cidade, segmento)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PropostaRow[];
}

export async function fetchPropostaById(id: string): Promise<PropostaRow | null> {
  const { data, error } = await supabase
    .from('propostas')
    .select('*, cliente:clientes_gc(id, nome, cnpj, razao_social, email, telefone, cidade, segmento)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as unknown as PropostaRow;
}

export async function fetchPropostaByUuid(uuid: string): Promise<PropostaRow | null> {
  const { data, error } = await supabase
    .from('propostas')
    .select('*, cliente:clientes_gc(id, nome, cnpj, razao_social, email, telefone, cidade, segmento)')
    .eq('link_publico_uuid', uuid)
    .single();

  if (error) return null;
  return data as unknown as PropostaRow;
}

export async function getNextPropostaNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count, error } = await supabase
    .from('propostas')
    .select('*', { count: 'exact', head: true });

  const num = (count ?? 0) + 1;
  return `WeDo-${year}-${String(num).padStart(4, '0')}`;
}

export async function createProposta(proposta: Partial<PropostaRow>): Promise<PropostaRow> {
  const uuid = crypto.randomUUID();
  const { data, error } = await supabase
    .from('propostas')
    .insert({
      numero: proposta.numero!,
      titulo: proposta.titulo!,
      descricao: proposta.descricao ?? null,
      cliente_id: proposta.cliente_id ?? null,
      oportunidade_id: proposta.oportunidade_id ?? null,
      vendedor_id: proposta.vendedor_id ?? null,
      template_id: proposta.template_id ?? null,
      status: proposta.status ?? 'rascunho',
      produtos: proposta.produtos ?? [],
      termos_condicoes: proposta.termos_condicoes ?? [],
      imagens: proposta.imagens ?? [],
      valor_total: proposta.valor_total ?? 0,
      desconto_total: proposta.desconto_total ?? 0,
      validade_dias: proposta.validade_dias ?? 10,
      validade_ate: proposta.validade_ate ?? null,
      observacoes_internas: proposta.observacoes_internas ?? null,
      link_publico_uuid: uuid,
      versao: 1,
    } as any)
    .select('*, cliente:clientes_gc(id, nome, cnpj, razao_social, email, telefone, cidade, segmento)')
    .single();

  if (error) throw error;
  return data as unknown as PropostaRow;
}

export async function updateProposta(id: string, updates: Partial<PropostaRow>): Promise<PropostaRow> {
  const { data, error } = await supabase
    .from('propostas')
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq('id', id)
    .select('*, cliente:clientes_gc(id, nome, cnpj, razao_social, email, telefone, cidade, segmento)')
    .single();

  if (error) throw error;
  return data as unknown as PropostaRow;
}

export async function deleteProposta(id: string) {
  const { error } = await supabase.from('propostas').delete().eq('id', id);
  if (error) throw error;
}

export async function registrarVisualizacao(id: string, proposta: PropostaRow) {
  await supabase.from('propostas').update({
    aberto_em: proposta.aberto_em || new Date().toISOString(),
    aberto_contagem: (proposta.aberto_contagem ?? 0) + 1,
    status: proposta.status === 'enviada' ? 'visualizada' : proposta.status,
  } as any).eq('id', id);
}

export async function aprovarProposta(id: string) {
  await supabase.from('propostas').update({
    status: 'aprovada',
    updated_at: new Date().toISOString(),
  } as any).eq('id', id);
}

export { formatBRL };
