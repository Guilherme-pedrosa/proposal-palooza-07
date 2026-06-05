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
  anexos?: any[] | null;
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
  forma_pagamento: string | null;
  num_parcelas: number | null;
  entrada_percent: number | null;
  condicoes_pagamento: string | null;
  prazo_entrega: string | null;
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

async function enrichProposalProductPhotos<T extends PropostaRow | PropostaRow[] | null>(input: T): Promise<T> {
  if (!input) return input;

  const rows = Array.isArray(input) ? input : [input];
  const gcIds = Array.from(new Set(
    rows
      .flatMap((row) => ((row.produtos ?? []) as any[]))
      .filter((product) => product?.gcProdutoId && !product?.photoUrl)
      .map((product) => product.gcProdutoId as string)
  ));

  if (gcIds.length === 0) return input;

  const { data, error } = await supabase
    .from('produtos_gc')
    .select('gc_id, foto_url, fotos_urls')
    .in('gc_id', gcIds);

  if (error || !data?.length) return input;

  const photoMap = new Map(
    data.map((product) => [product.gc_id, product.foto_url || product.fotos_urls?.[0] || null])
  );

  const enrichedRows = rows.map((row) => ({
    ...row,
    produtos: ((row.produtos ?? []) as any[]).map((product) => {
      if (!product?.gcProdutoId || product?.photoUrl) return product;
      const resolvedPhoto = photoMap.get(product.gcProdutoId);
      return resolvedPhoto ? { ...product, photoUrl: resolvedPhoto } : product;
    }),
  })) as PropostaRow[];

  return (Array.isArray(input) ? enrichedRows : enrichedRows[0]) as T;
}

export async function fetchPropostas(): Promise<PropostaRow[]> {
  const { data, error } = await supabase
    .from('propostas')
    .select('*, cliente:clientes_gc(id, nome, cnpj, razao_social, email, telefone, cidade, segmento)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return await enrichProposalProductPhotos((data ?? []) as unknown as PropostaRow[]);
}

export async function fetchPropostaById(id: string): Promise<PropostaRow | null> {
  const { data, error } = await supabase
    .from('propostas')
    .select('*, cliente:clientes_gc(id, nome, cnpj, razao_social, email, telefone, cidade, segmento)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return await enrichProposalProductPhotos(data as unknown as PropostaRow);
}

export async function fetchPropostaByUuid(uuid: string): Promise<PropostaRow | null> {
  const { data, error } = await supabase
    .from('propostas')
    .select('*, cliente:clientes_gc(id, nome, cnpj, razao_social, email, telefone, cidade, segmento)')
    .eq('link_publico_uuid', uuid)
    .single();

  if (error) return null;
  return await enrichProposalProductPhotos(data as unknown as PropostaRow);
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
      anexos: proposta.anexos ?? [],
      valor_total: proposta.valor_total ?? 0,
      desconto_total: proposta.desconto_total ?? 0,
      validade_dias: proposta.validade_dias ?? 10,
      validade_ate: proposta.validade_ate ?? null,
      observacoes_internas: proposta.observacoes_internas ?? null,
      forma_pagamento: proposta.forma_pagamento ?? null,
      num_parcelas: proposta.num_parcelas ?? 1,
      entrada_percent: proposta.entrada_percent ?? 0,
      condicoes_pagamento: proposta.condicoes_pagamento ?? null,
      prazo_entrega: proposta.prazo_entrega ?? null,
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

export async function clonarProposta(id: string): Promise<PropostaRow> {
  const original = await fetchPropostaById(id);
  if (!original) throw new Error('Proposta não encontrada');

  const novoNumero = await getNextPropostaNumber();
  const validadeDias = original.validade_dias ?? 10;
  const novaValidade = new Date();
  novaValidade.setDate(novaValidade.getDate() + validadeDias);

  const { data: { session } } = await supabase.auth.getSession();

  return await createProposta({
    numero: novoNumero,
    titulo: `${original.titulo} (Cópia)`,
    descricao: original.descricao,
    cliente_id: original.cliente_id,
    oportunidade_id: original.oportunidade_id,
    vendedor_id: session?.user?.id ?? original.vendedor_id,
    template_id: original.template_id,
    status: 'rascunho',
    produtos: original.produtos ?? [],
    termos_condicoes: original.termos_condicoes ?? [],
    imagens: original.imagens ?? [],
    valor_total: original.valor_total ?? 0,
    desconto_total: original.desconto_total ?? 0,
    validade_dias: validadeDias,
    validade_ate: novaValidade.toISOString().split('T')[0],
    observacoes_internas: original.observacoes_internas,
  });
}

export async function registrarVisualizacao(id: string, proposta: PropostaRow) {
  // 1. ANY authenticated user = internal team → never register as client view
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    return; // Logged-in user — skip entirely
  }

  // 2. Fetch visitor IP
  let ip: string | null = null;
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    ip = data.ip || null;
  } catch {
    ip = null;
  }

  // 3. Same IP as before — just bump counter, don't change status
  if (ip && proposta.aberto_por_ip === ip) {
    await supabase.from('propostas').update({
      aberto_contagem: (proposta.aberto_contagem ?? 0) + 1,
    } as any).eq('id', id);
    return;
  }

  // 4. New visitor — full registration
  await supabase.from('propostas').update({
    aberto_em: proposta.aberto_em || new Date().toISOString(),
    aberto_contagem: (proposta.aberto_contagem ?? 0) + 1,
    aberto_por_ip: ip,
    status: proposta.status === 'enviada' ? 'visualizada' : proposta.status,
  } as any).eq('id', id);
}

export async function aprovarProposta(id: string, dados?: { nome: string; cpf: string }) {
  let ip: string | null = null;
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    ip = (await r.json()).ip;
  } catch {}
  await supabase.from('propostas').update({
    status: 'aprovada',
    aprovador_nome: dados?.nome ?? null,
    aprovador_cpf: dados?.cpf ?? null,
    aprovado_em: new Date().toISOString(),
    aprovado_ip: ip,
    updated_at: new Date().toISOString(),
  } as any).eq('id', id);
}

export { formatBRL };
