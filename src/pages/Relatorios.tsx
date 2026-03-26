import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL, ETAPAS_KANBAN } from '@/lib/api/oportunidades';
import { exportarCSV, type Periodo } from '@/hooks/useDashboardData';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download, BarChart3, Package, AlertTriangle, ClipboardList, Sparkles } from 'lucide-react';
import { WAICustoCard } from '@/components/WAICustoCard';
import { subMonths, subDays, startOfMonth, endOfMonth, startOfQuarter, startOfYear, format } from 'date-fns';

const PIE_COLORS = ['#3B82F6', '#22C55E', '#EAB308', '#EF4444', '#8B5CF6', '#F97316', '#6B7280', '#EC4899'];

const periodoOpts: { value: string; label: string }[] = [
  { value: 'este_mes', label: 'Este mês' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'semestre', label: 'Semestre' },
  { value: 'ano', label: 'Ano' },
];

function getInicio(periodo: string) {
  const now = new Date();
  switch (periodo) {
    case 'trimestre': return startOfQuarter(now).toISOString();
    case 'semestre': return subMonths(now, 6).toISOString();
    case 'ano': return startOfYear(now).toISOString();
    default: return startOfMonth(now).toISOString();
  }
}

export default function Relatorios() {
  const { perfil } = useAuth();
  const [periodo, setPeriodo] = useState('trimestre');
  const [vendedorId, setVendedorId] = useState('todos');
  const isGestor = perfil === 'gestor' || perfil === 'admin';
  const inicio = getInicio(periodo);

  const { data: vendedores } = useQuery({
    queryKey: ['vendedores_rel'],
    queryFn: async () => {
      const { data } = await supabase.from('usuarios').select('id, nome').eq('ativo', true);
      return data ?? [];
    },
    enabled: isGestor,
  });

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Relatórios 📊</h1>
          <div className="flex gap-2 flex-wrap">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periodoOpts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {isGestor && (
              <Select value={vendedorId} onValueChange={setVendedorId}>
                <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Vendedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {vendedores?.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="performance" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Performance</TabsTrigger>
            <TabsTrigger value="produtos" className="gap-1.5"><Package className="h-3.5 w-3.5" /> Produtos</TabsTrigger>
            <TabsTrigger value="perdas" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Motivos de Perda</TabsTrigger>
            <TabsTrigger value="atividades" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Atividades</TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            <PerformanceReport inicio={inicio} vendedorId={vendedorId} />
          </TabsContent>
          <TabsContent value="produtos">
            <ProdutosReport inicio={inicio} />
          </TabsContent>
          <TabsContent value="perdas">
            <PerdasReport inicio={inicio} vendedorId={vendedorId} />
          </TabsContent>
          <TabsContent value="atividades">
            <AtividadesReport inicio={inicio} vendedorId={vendedorId} isGestor={isGestor} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

/* ========= REPORT 1: Performance ========= */
function PerformanceReport({ inicio, vendedorId }: { inicio: string; vendedorId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['rel_performance', inicio, vendedorId],
    queryFn: async () => {
      let q = supabase.from('propostas').select('status, valor_total, created_at, updated_at, aberto_contagem')
        .gte('created_at', inicio);
      if (vendedorId !== 'todos') q = q.eq('vendedor_id', vendedorId);
      const { data: props } = await q;
      const all = props ?? [];
      const criadas = all.length;
      const enviadas = all.filter(p => ['enviada', 'aprovada', 'recusada', 'expirada'].includes(p.status!)).length;
      const visualizadas = all.filter(p => (p.aberto_contagem || 0) > 0).length;
      const aprovadas = all.filter(p => p.status === 'aprovada').length;
      const recusadas = all.filter(p => p.status === 'recusada').length;
      const expiradas = all.filter(p => p.status === 'expirada').length;
      const conversao = enviadas > 0 ? Math.round(aprovadas / enviadas * 100) : 0;
      const valorAprovado = all.filter(p => p.status === 'aprovada').reduce((s, p) => s + (p.valor_total || 0), 0);
      const ticketMedio = aprovadas > 0 ? valorAprovado / aprovadas : 0;

      // Cycle time
      const ciclos = all.filter(p => p.status === 'aprovada' && p.created_at && p.updated_at)
        .map(p => Math.max(1, Math.round((new Date(p.updated_at!).getTime() - new Date(p.created_at!).getTime()) / 86400000)));
      const cicloMedio = ciclos.length ? Math.round(ciclos.reduce((a, b) => a + b, 0) / ciclos.length) : 0;

      // Pie data
      const statusCounts = [
        { name: 'Rascunho', value: all.filter(p => p.status === 'rascunho').length },
        { name: 'Enviada', value: all.filter(p => p.status === 'enviada').length },
        { name: 'Aprovada', value: aprovadas },
        { name: 'Recusada', value: recusadas },
        { name: 'Expirada', value: expiradas },
      ].filter(s => s.value > 0);

      return { criadas, enviadas, visualizadas, aprovadas, recusadas, expiradas, conversao, valorAprovado, ticketMedio, cicloMedio, statusCounts };
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Performance Comercial</CardTitle>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportarCSV([data], 'performance_comercial')}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { l: 'Criadas', v: data.criadas },
              { l: 'Enviadas', v: data.enviadas },
              { l: 'Visualizadas', v: data.visualizadas },
              { l: 'Aprovadas', v: data.aprovadas },
              { l: 'Recusadas', v: data.recusadas },
              { l: 'Expiradas', v: data.expiradas },
              { l: 'Conversão', v: `${data.conversao}%` },
              { l: 'Ciclo médio', v: `${data.cicloMedio}d` },
            ].map(({ l, v }) => (
              <div key={l} className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className="text-lg font-bold">{v}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Valor Total Aprovado</p>
              <p className="text-2xl font-bold text-emerald-600">{formatBRL(data.valorAprovado)}</p>
              <p className="text-xs text-muted-foreground mt-1">Ticket Médio: {formatBRL(data.ticketMedio)}</p>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.statusCounts} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {data.statusCounts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ========= REPORT 2: Produtos ========= */
function ProdutosReport({ inicio }: { inicio: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['rel_produtos', inicio],
    queryFn: async () => {
      const { data: props } = await supabase.from('propostas').select('produtos').gte('created_at', inicio);
      const counts: Record<string, { nome: string; categoria: string; count: number; valor: number }> = {};
      (props ?? []).forEach((p: any) => {
        const items = Array.isArray(p.produtos) ? p.produtos : [];
        items.forEach((item: any) => {
          const key = item.name || item.nome || 'Desconhecido';
          if (!counts[key]) counts[key] = { nome: key, categoria: item.category || item.categoria || 'Outros', count: 0, valor: 0 };
          counts[key].count += item.quantity || item.quantidade || 1;
          counts[key].valor += (item.unitPrice || item.valor_unitario || 0) * (item.quantity || item.quantidade || 1);
        });
      });
      const top = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10);

      // By category
      const cats: Record<string, number> = {};
      Object.values(counts).forEach(c => {
        cats[c.categoria] = (cats[c.categoria] || 0) + c.valor;
      });
      const catData = Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

      return { top, catData };
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Top 10 Produtos em Propostas</CardTitle>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportarCSV(data.top, 'produtos_cotados')}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Cotações</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.top.map((p, i) => (
                  <TableRow key={p.nome}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell>{p.nome}</TableCell>
                    <TableCell className="text-center">{p.count}x</TableCell>
                    <TableCell className="text-right">{formatBRL(p.valor)}</TableCell>
                  </TableRow>
                ))}
                {data.top.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum produto encontrado no período</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {data.catData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Valor por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.catData} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [formatBRL(v), 'Valor']} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ========= REPORT 3: Motivos de Perda ========= */
function PerdasReport({ inicio, vendedorId }: { inicio: string; vendedorId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['rel_perdas', inicio, vendedorId],
    queryFn: async () => {
      let q = supabase.from('oportunidades').select('motivo_perda_id, tipo_venda, vendedor_id, valor_estimado')
        .eq('etapa', 'fechado_perdido').not('motivo_perda_id', 'is', null)
        .gte('updated_at', inicio);
      if (vendedorId !== 'todos') q = q.eq('vendedor_id', vendedorId);
      const { data: ops } = await q;
      const { data: motivos } = await supabase.from('motivos_perda').select('id, descricao');

      const motivoMap: Record<string, string> = {};
      (motivos ?? []).forEach(m => { motivoMap[m.id] = m.descricao; });

      const counts: Record<string, number> = {};
      (ops ?? []).forEach(o => {
        const label = motivoMap[o.motivo_perda_id!] || 'Outros';
        counts[label] = (counts[label] || 0) + 1;
      });

      const total = Object.values(counts).reduce((s, v) => s + v, 0);
      const pieData = Object.entries(counts).map(([name, value]) => ({
        name, value, pct: total > 0 ? Math.round(value / total * 100) : 0,
      })).sort((a, b) => b.value - a.value);

      return { pieData, total };
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Motivos de Perda</CardTitle>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportarCSV(data.pieData, 'motivos_perda')}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </CardHeader>
      <CardContent>
        {data.pieData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma oportunidade perdida no período</p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                  label={({ name, pct }) => `${pct}% ${name}`}>
                  {data.pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 w-full sm:w-auto">
              {data.pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="font-medium">{d.pct}%</span>
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ========= REPORT 4: Atividades ========= */
function AtividadesReport({ inicio, vendedorId, isGestor }: { inicio: string; vendedorId: string; isGestor: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ['rel_atividades', inicio, vendedorId],
    queryFn: async () => {
      const { data: vendedores } = await supabase.from('usuarios').select('id, nome').eq('ativo', true);
      let q = supabase.from('atividades').select('vendedor_id, tipo, concluida')
        .eq('concluida', true).gte('data_realizada', inicio);
      if (vendedorId !== 'todos') q = q.eq('vendedor_id', vendedorId);
      const { data: ativs } = await q;

      const porVendedor: Record<string, { nome: string; visita: number; ligacao: number; proposta: number; follow_up: number; outros: number; total: number }> = {};
      (vendedores ?? []).forEach(v => {
        porVendedor[v.id] = { nome: v.nome, visita: 0, ligacao: 0, proposta: 0, follow_up: 0, outros: 0, total: 0 };
      });

      (ativs ?? []).forEach(a => {
        const v = porVendedor[a.vendedor_id!];
        if (!v) return;
        v.total++;
        if (a.tipo === 'visita') v.visita++;
        else if (a.tipo === 'ligacao') v.ligacao++;
        else if (a.tipo === 'proposta') v.proposta++;
        else if (a.tipo === 'follow_up') v.follow_up++;
        else v.outros++;
      });

      return Object.values(porVendedor).filter(v => vendedorId === 'todos' || v.total > 0).sort((a, b) => b.total - a.total);
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Atividades dos Vendedores</CardTitle>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportarCSV(data, 'atividades_vendedores')}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-center">Visitas</TableHead>
                <TableHead className="text-center">Ligações</TableHead>
                <TableHead className="text-center">Propostas</TableHead>
                <TableHead className="text-center">Follow-up</TableHead>
                <TableHead className="text-center">Outros</TableHead>
                <TableHead className="text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(v => (
                <TableRow key={v.nome}>
                  <TableCell className="font-medium">{v.nome}</TableCell>
                  <TableCell className="text-center">{v.visita}</TableCell>
                  <TableCell className="text-center">{v.ligacao}</TableCell>
                  <TableCell className="text-center">{v.proposta}</TableCell>
                  <TableCell className="text-center">{v.follow_up}</TableCell>
                  <TableCell className="text-center">{v.outros}</TableCell>
                  <TableCell className="text-center font-bold">{v.total}</TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma atividade concluída no período</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
