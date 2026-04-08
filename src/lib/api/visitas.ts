import { supabase } from '@/integrations/supabase/client';

export interface VisitaRow {
  id: string;
  cliente_id: string;
  oportunidade_id: string | null;
  vendedor_id: string;
  checkin_at: string | null;
  checkin_lat: number | null;
  checkin_lng: number | null;
  checkout_at: string | null;
  checkout_lat: number | null;
  checkout_lng: number | null;
  duracao_minutos: number | null;
  resultado: string | null;
  proxima_acao: string | null;
  proxima_data: string | null;
  satisfacao: number | null;
  fotos: string[];
  observacoes: string | null;
  status: 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';
  data_agendada: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitaComCliente extends VisitaRow {
  cliente?: { id: string; nome: string; telefone: string | null; endereco: string | null; cidade: string | null } | null;
}

export async function fetchVisitasVendedor(vendedorId: string): Promise<VisitaComCliente[]> {
  const { data, error } = await supabase
    .from('visitas')
    .select('*, cliente:clientes_gc(id, nome, telefone, endereco, cidade)')
    .eq('vendedor_id', vendedorId)
    .order('data_agendada', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as VisitaComCliente[];
}

export async function fetchVisitaEmAndamento(vendedorId: string): Promise<VisitaComCliente | null> {
  const { data, error } = await supabase
    .from('visitas')
    .select('*, cliente:clientes_gc(id, nome, telefone, endereco, cidade)')
    .eq('vendedor_id', vendedorId)
    .eq('status', 'em_andamento')
    .maybeSingle();

  if (error) throw error;
  return data as unknown as VisitaComCliente | null;
}

export async function iniciarCheckin(payload: {
  cliente_id: string;
  vendedor_id: string;
  oportunidade_id?: string;
  lat: number;
  lng: number;
}): Promise<VisitaRow> {
  const { data, error } = await supabase
    .from('visitas')
    .insert({
      cliente_id: payload.cliente_id,
      vendedor_id: payload.vendedor_id,
      oportunidade_id: payload.oportunidade_id || null,
      checkin_at: new Date().toISOString(),
      checkin_lat: payload.lat,
      checkin_lng: payload.lng,
      status: 'em_andamento',
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as VisitaRow;
}

export async function finalizarCheckout(payload: {
  visita_id: string;
  lat: number;
  lng: number;
  resultado: string;
  proxima_acao?: string;
  proxima_data?: string;
  satisfacao?: number;
  fotos?: string[];
  observacoes?: string;
}): Promise<VisitaRow> {
  const checkoutAt = new Date();

  // Fetch checkin time to calculate duration
  const { data: visita } = await supabase
    .from('visitas')
    .select('checkin_at')
    .eq('id', payload.visita_id)
    .single();

  let duracao = null;
  if (visita?.checkin_at) {
    const checkinTime = new Date(visita.checkin_at as string);
    duracao = Math.round((checkoutAt.getTime() - checkinTime.getTime()) / 60000);
  }

  const { data, error } = await supabase
    .from('visitas')
    .update({
      checkout_at: checkoutAt.toISOString(),
      checkout_lat: payload.lat,
      checkout_lng: payload.lng,
      duracao_minutos: duracao,
      resultado: payload.resultado,
      proxima_acao: payload.proxima_acao || null,
      proxima_data: payload.proxima_data || null,
      satisfacao: payload.satisfacao || null,
      fotos: payload.fotos || [],
      observacoes: payload.observacoes || null,
      status: 'concluida',
    })
    .eq('id', payload.visita_id)
    .select('*, cliente:clientes_gc(id, nome)')
    .single();

  if (error) throw error;

  const visitaData = data as any;

  // Auto-create follow-up activity when "próxima ação" is filled
  if (payload.proxima_acao) {
    const { data: visitaFull } = await supabase
      .from('visitas')
      .select('vendedor_id, cliente_id, oportunidade_id')
      .eq('id', payload.visita_id)
      .single();

    if (visitaFull) {
      const clienteNome = visitaData?.cliente?.nome || 'Cliente';
      await supabase.from('atividades').insert({
        vendedor_id: visitaFull.vendedor_id,
        cliente_id: visitaFull.cliente_id,
        oportunidade_id: visitaFull.oportunidade_id,
        tipo: 'tarefa',
        titulo: `📋 ${payload.proxima_acao}`,
        descricao: `Follow-up automático da visita a ${clienteNome}`,
        data_prevista: payload.proxima_data || new Date().toISOString(),
        concluida: false,
      });

      // Update oportunidade.ultima_atividade_em if linked
      if (visitaFull.oportunidade_id) {
        await supabase
          .from('oportunidades')
          .update({ ultima_atividade_em: checkoutAt.toISOString() })
          .eq('id', visitaFull.oportunidade_id);
      }
    }
  }

  return visitaData as unknown as VisitaRow;
}

export async function agendarVisita(payload: {
  cliente_id: string;
  vendedor_id: string;
  oportunidade_id?: string;
  data_agendada: string;
  observacoes?: string;
}): Promise<VisitaRow> {
  const { data, error } = await supabase
    .from('visitas')
    .insert({
      cliente_id: payload.cliente_id,
      vendedor_id: payload.vendedor_id,
      oportunidade_id: payload.oportunidade_id || null,
      data_agendada: payload.data_agendada,
      observacoes: payload.observacoes || null,
      status: 'agendada',
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as VisitaRow;
}

export async function cancelarVisita(visitaId: string): Promise<void> {
  const { error } = await supabase
    .from('visitas')
    .update({ status: 'cancelada' })
    .eq('id', visitaId);
  if (error) throw error;
}

export async function fetchVisitasCliente(clienteId: string): Promise<VisitaRow[]> {
  const { data, error } = await supabase
    .from('visitas')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as unknown as VisitaRow[];
}

export function formatDuracao(minutos: number | null): string {
  if (!minutos) return '-';
  if (minutos < 60) return `${minutos}min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}
