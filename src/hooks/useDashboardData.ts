import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, startOfQuarter, startOfYear, subDays, differenceInDays, format } from 'date-fns';

export type Periodo = 'este_mes' | 'mes_anterior' | 'trimestre' | 'semestre' | 'ano';

function getRange(periodo: Periodo): { inicio: string; fim: string; inicioAnterior: string; fimAnterior: string } {
  const now = new Date();
  let inicio: Date, fim: Date, inicioAnterior: Date, fimAnterior: Date;

  switch (periodo) {
    case 'mes_anterior': {
      const prev = subMonths(now, 1);
      inicio = startOfMonth(prev);
      fim = endOfMonth(prev);
      const prev2 = subMonths(now, 2);
      inicioAnterior = startOfMonth(prev2);
      fimAnterior = endOfMonth(prev2);
      break;
    }
    case 'trimestre': {
      inicio = startOfQuarter(now);
      fim = now;
      const diff = differenceInDays(fim, inicio);
      inicioAnterior = subDays(inicio, diff + 1);
      fimAnterior = subDays(inicio, 1);
      break;
    }
    case 'semestre': {
      inicio = subMonths(now, 6);
      fim = now;
      inicioAnterior = subMonths(now, 12);
      fimAnterior = subMonths(now, 6);
      break;
    }
    case 'ano': {
      inicio = startOfYear(now);
      fim = now;
      const diff = differenceInDays(fim, inicio);
      inicioAnterior = subDays(inicio, diff + 1);
      fimAnterior = subDays(inicio, 1);
      break;
    }
    default: { // este_mes
      inicio = startOfMonth(now);
      fim = now;
      const prev = subMonths(now, 1);
      inicioAnterior = startOfMonth(prev);
      fimAnterior = endOfMonth(prev);
      break;
    }
  }

  return {
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    inicioAnterior: inicioAnterior.toISOString(),
    fimAnterior: fimAnterior.toISOString(),
  };
}

export function calcularDelta(atual: number, anterior: number): string {
  if (anterior === 0) return atual > 0 ? '+100%' : '0%';
  const pct = ((atual - anterior) / anterior * 100).toFixed(0);
  return `${Number(pct) >= 0 ? '↑ +' : '↓ '}${Math.abs(Number(pct))}%`;
}

export function useDashboardData(periodo: Periodo, vendedorId?: string) {
  const range = getRange(periodo);

  const addVendedorFilter = (query: any, field = 'vendedor_id') => {
    if (vendedorId && vendedorId !== 'todos') {
      return query.eq(field, vendedorId);
    }
    return query;
  };

  // KPI 1: Receita (propostas aprovadas)
  const receita = useQuery({
    queryKey: ['dash_receita', periodo, vendedorId],
    queryFn: async () => {
      let q = supabase.from('propostas').select('valor_total, updated_at').eq('status', 'aprovada');
      q = addVendedorFilter(q);
      const { data } = await q;
      const all = data ?? [];
      const atual = all.filter(p => p.updated_at! >= range.inicio && p.updated_at! <= range.fim);
      const anterior = all.filter(p => p.updated_at! >= range.inicioAnterior && p.updated_at! <= range.fimAnterior);
      const totalAtual = atual.reduce((s, p) => s + (p.valor_total || 0), 0);
      const totalAnterior = anterior.reduce((s, p) => s + (p.valor_total || 0), 0);
      return { total: totalAtual, count: atual.length, delta: calcularDelta(totalAtual, totalAnterior) };
    },
  });

  // KPI 2: Propostas
  const propostas = useQuery({
    queryKey: ['dash_propostas', periodo, vendedorId],
    queryFn: async () => {
      let q = supabase.from('propostas').select('status, aberto_contagem, created_at');
      q = addVendedorFilter(q);
      const { data } = await q;
      const all = (data ?? []).filter(p => p.created_at! >= range.inicio && p.created_at! <= range.fim);
      const total = all.length;
      const aprovadas = all.filter(p => p.status === 'aprovada').length;
      const enviadas = all.filter(p => ['enviada', 'aprovada', 'recusada'].includes(p.status!)).length;
      const visualizadas = all.filter(p => (p.aberto_contagem || 0) > 0).length;
      const conversao = enviadas > 0 ? Math.round(aprovadas / enviadas * 100) : 0;
      return { total, aprovadas, enviadas, visualizadas, conversao };
    },
  });

  // KPI 3: Oportunidades ativas
  const oportunidades = useQuery({
    queryKey: ['dash_oportunidades', vendedorId],
    queryFn: async () => {
      let q = supabase.from('oportunidades').select('etapa, valor_estimado, temperatura')
        .not('etapa', 'in', '(fechado_ganho,fechado_perdido)');
      q = addVendedorFilter(q);
      const { data } = await q;
      const all = data ?? [];
      const total = all.length;
      const valorTotal = all.reduce((s, o) => s + (o.valor_estimado || 0), 0);
      const quentes = all.filter(o => o.temperatura === 'quente').length;
      const mornas = all.filter(o => o.temperatura === 'morno').length;
      const frias = all.filter(o => o.temperatura === 'frio').length;
      return { total, valorTotal, quentes, mornas, frias };
    },
  });

  // KPI 4: Novos clientes
  const novosClientes = useQuery({
    queryKey: ['dash_novos_clientes', periodo],
    queryFn: async () => {
      const { data } = await supabase.from('clientes_gc').select('segmento, created_at')
        .gte('created_at', range.inicio).lte('created_at', range.fim);
      const all = data ?? [];
      const porSegmento: Record<string, number> = {};
      all.forEach(c => {
        const seg = c.segmento || 'Outros';
        porSegmento[seg] = (porSegmento[seg] || 0) + 1;
      });
      return { total: all.length, porSegmento };
    },
  });

  // Funil
  const funil = useQuery({
    queryKey: ['dash_funil', vendedorId],
    queryFn: async () => {
      let q = supabase.from('oportunidades').select('etapa, valor_estimado');
      q = addVendedorFilter(q);
      const { data } = await q;
      const all = data ?? [];
      const etapas = ['prospeccao', 'qualificacao', 'visita_tecnica', 'proposta_enviada', 'negociacao', 'fechado_ganho'];
      return etapas.map(etapa => {
        const ops = all.filter(o => o.etapa === etapa);
        return { etapa, count: ops.length, valor: ops.reduce((s, o) => s + (o.valor_estimado || 0), 0) };
      });
    },
  });

  // Propostas por mês (últimos 6 meses)
  const propostasPorMes = useQuery({
    queryKey: ['dash_propostas_mes', vendedorId],
    queryFn: async () => {
      let q = supabase.from('propostas').select('status, created_at')
        .gte('created_at', subMonths(new Date(), 6).toISOString());
      q = addVendedorFilter(q);
      const { data } = await q;
      const all = data ?? [];
      const meses: Record<string, { enviadas: number; aprovadas: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(new Date(), i);
        const key = format(m, 'yyyy-MM');
        meses[key] = { enviadas: 0, aprovadas: 0 };
      }
      all.forEach(p => {
        const key = format(new Date(p.created_at!), 'yyyy-MM');
        if (meses[key]) {
          meses[key].enviadas++;
          if (p.status === 'aprovada') meses[key].aprovadas++;
        }
      });
      return Object.entries(meses).map(([mes, vals]) => ({
        mes: format(new Date(mes + '-01'), 'MMM'),
        ...vals,
      }));
    },
  });

  // Saúde da carteira
  const saudeCarteira = useQuery({
    queryKey: ['dash_saude'],
    queryFn: async () => {
      const { data } = await supabase.from('clientes_gc').select('id, nome, ultima_compra_gc, total_compras_gc')
        .eq('ativo', true);
      const all = data ?? [];
      const hoje = new Date();
      const grupos = { ativo: [] as any[], morno: [] as any[], risco: [] as any[], inativo: [] as any[] };
      all.forEach(c => {
        const dias = c.ultima_compra_gc ? differenceInDays(hoje, new Date(c.ultima_compra_gc)) : 999;
        const item = { ...c, diasSemCompra: dias };
        if (dias <= 30) grupos.ativo.push(item);
        else if (dias <= 60) grupos.morno.push(item);
        else if (dias <= 90) grupos.risco.push(item);
        else grupos.inativo.push(item);
      });
      return grupos;
    },
  });

  // Ranking vendedores
  const ranking = useQuery({
    queryKey: ['dash_ranking', periodo],
    queryFn: async () => {
      const { data: vendedores } = await supabase.from('usuarios').select('id, nome').eq('ativo', true);
      if (!vendedores?.length) return [];

      const { data: ops } = await supabase.from('oportunidades').select('vendedor_id, etapa, valor_estimado');
      const { data: props } = await supabase.from('propostas').select('vendedor_id, status, created_at')
        .gte('created_at', range.inicio);
      const mes = new Date().getMonth() + 1;
      const ano = new Date().getFullYear();
      const { data: metas } = await supabase.from('metas').select('vendedor_id, meta_valor').eq('mes', mes).eq('ano', ano);

      return vendedores.map(v => {
        const vOps = (ops ?? []).filter(o => o.vendedor_id === v.id);
        const ativas = vOps.filter(o => !['fechado_ganho', 'fechado_perdido'].includes(o.etapa)).length;
        const vProps = (props ?? []).filter(p => p.vendedor_id === v.id);
        const enviadas = vProps.length;
        const aprovadas = vProps.filter(p => p.status === 'aprovada').length;
        const valorFechado = vOps.filter(o => o.etapa === 'fechado_ganho').reduce((s, o) => s + (o.valor_estimado || 0), 0);
        const conversao = enviadas > 0 ? Math.round(aprovadas / enviadas * 100) : 0;
        const meta = (metas ?? []).find(m => m.vendedor_id === v.id);
        const metaPct = meta ? Math.round(valorFechado / meta.meta_valor * 100) : 0;
        return { id: v.id, nome: v.nome, ativas, enviadas, aprovadas, valorFechado, conversao, metaPct };
      }).sort((a, b) => b.valorFechado - a.valorFechado);
    },
  });

  // Alertas
  const alertas = useQuery({
    queryKey: ['dash_alertas', vendedorId],
    queryFn: async () => {
      const items: { tipo: 'red' | 'yellow' | 'black'; texto: string; link: string }[] = [];

      // Oportunidades paradas >7 dias
      const { data: opsParadas } = await supabase.from('oportunidades').select('id, ultima_atividade_em')
        .not('etapa', 'in', '(fechado_ganho,fechado_perdido)');
      const paradas = (opsParadas ?? []).filter(o => {
        if (!o.ultima_atividade_em) return true;
        return differenceInDays(new Date(), new Date(o.ultima_atividade_em)) > 7;
      });
      if (paradas.length) items.push({ tipo: 'red', texto: `${paradas.length} oportunidades paradas há mais de 7 dias sem atividade`, link: '/pipeline' });

      // Propostas enviadas >10 dias sem resposta
      const { data: propsEnviadas } = await supabase.from('propostas').select('id, created_at')
        .eq('status', 'enviada');
      const semResposta = (propsEnviadas ?? []).filter(p => differenceInDays(new Date(), new Date(p.created_at!)) > 10);
      if (semResposta.length) items.push({ tipo: 'yellow', texto: `${semResposta.length} propostas enviadas há mais de 10 dias sem resposta`, link: '/propostas' });

      // Propostas expirando em <3 dias
      const { data: propsExp } = await supabase.from('propostas').select('id, validade_ate')
        .eq('status', 'enviada').not('validade_ate', 'is', null);
      const expirando = (propsExp ?? []).filter(p => {
        const dias = differenceInDays(new Date(p.validade_ate!), new Date());
        return dias >= 0 && dias <= 3;
      });
      if (expirando.length) items.push({ tipo: 'red', texto: `${expirando.length} propostas expiram em menos de 3 dias`, link: '/propostas' });

      // Clientes inativos >90 dias
      const { data: inativos } = await supabase.from('clientes_gc').select('id').eq('ativo', true);
      const { data: inativosAll } = await supabase.from('clientes_gc').select('id, ultima_compra_gc, total_compras_gc')
        .eq('ativo', true);
      const inatCount = (inativosAll ?? []).filter(c => {
        if (!c.ultima_compra_gc) return false;
        return differenceInDays(new Date(), new Date(c.ultima_compra_gc)) > 90 && (c.total_compras_gc || 0) > 10000;
      });
      if (inatCount.length) items.push({ tipo: 'black', texto: `${inatCount.length} clientes inativos há mais de 90 dias com alto ticket histórico`, link: '/clientes' });

      return items;
    },
  });

  // GC sync status
  const gcSync = useQuery({
    queryKey: ['dash_gc_sync'],
    queryFn: async () => {
      const { data } = await supabase.from('gc_sync_log').select('entidade, created_at')
        .eq('acao', 'sync_completo').eq('status', 'sucesso')
        .order('created_at', { ascending: false }).limit(2);
      const result: Record<string, string> = {};
      (data ?? []).forEach((log: any) => {
        if (!result[log.entidade]) result[log.entidade] = log.created_at;
      });
      return result;
    },
  });

  return {
    receita, propostas, oportunidades, novosClientes,
    funil, propostasPorMes, saudeCarteira, ranking, alertas, gcSync,
    isLoading: receita.isLoading || propostas.isLoading || oportunidades.isLoading,
  };
}

export function exportarCSV(dados: Record<string, any>[], nomeArquivo: string) {
  if (!dados.length) return;
  const headers = Object.keys(dados[0]).join(',');
  const linhas = dados.map(d => Object.values(d).map(v => `"${String(v ?? '')}"`).join(','));
  const csv = [headers, ...linhas].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeArquivo}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
