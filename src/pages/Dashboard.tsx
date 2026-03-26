import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useGC } from '@/contexts/GCContext';
import { useDashboardData, calcularDelta, type Periodo } from '@/hooks/useDashboardData';
import { formatBRL } from '@/lib/api/oportunidades';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell,
} from 'recharts';
import {
  DollarSign, FileText, Target, Users, AlertTriangle, RefreshCw, Loader2,
  TrendingUp, TrendingDown, ChevronRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ETAPA_LABELS: Record<string, string> = {
  prospeccao: 'Prospecção',
  qualificacao: 'Qualificação',
  visita_tecnica: 'Visita Técnica',
  proposta_enviada: 'Proposta',
  negociacao: 'Negociação',
  fechado_ganho: 'Ganho',
};

const ETAPA_COLORS = ['#3B82F6', '#8B5CF6', '#F97316', '#EAB308', '#EF4444', '#22C55E'];

const periodoLabels: Record<Periodo, string> = {
  este_mes: 'Este mês',
  mes_anterior: 'Mês anterior',
  trimestre: 'Trimestre atual',
  semestre: 'Semestre',
  ano: 'Ano',
};

export default function Dashboard() {
  const { perfil } = useAuth();
  const { syncClientes, syncProdutos, isSyncingClientes, isSyncingProdutos } = useGC();
  const navigate = useNavigate();

  const [periodo, setPeriodo] = useState<Periodo>('este_mes');
  const [vendedorId, setVendedorId] = useState<string>('todos');

  const isGestor = perfil === 'gestor' || perfil === 'admin';

  const { data: vendedores } = useQuery({
    queryKey: ['vendedores_lista'],
    queryFn: async () => {
      const { data } = await supabase.from('usuarios').select('id, nome').eq('ativo', true);
      return data ?? [];
    },
    enabled: isGestor,
  });

  const dash = useDashboardData(periodo, vendedorId);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Dashboard WeDo 📊</h1>
          <div className="flex gap-2 flex-wrap">
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(periodoLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isGestor && (
              <Select value={vendedorId} onValueChange={setVendedorId}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {vendedores?.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={<DollarSign className="h-5 w-5" />}
            label="Receita do Período"
            value={dash.receita.data ? formatBRL(dash.receita.data.total) : '—'}
            delta={dash.receita.data?.delta}
            sub={dash.receita.data ? `Propostas aprovadas: ${dash.receita.data.count}` : ''}
            loading={dash.receita.isLoading}
            color="text-emerald-600"
          />
          <KPICard
            icon={<FileText className="h-5 w-5" />}
            label="Propostas"
            value={dash.propostas.data ? `${dash.propostas.data.total} propostas` : '—'}
            sub={dash.propostas.data ? `${dash.propostas.data.aprovadas} aprovadas (${dash.propostas.data.conversao}% conversão)` : ''}
            sub2={dash.propostas.data ? `${dash.propostas.data.enviadas} enviadas / ${dash.propostas.data.visualizadas} visualizadas` : ''}
            loading={dash.propostas.isLoading}
            color="text-blue-600"
          />
          <KPICard
            icon={<Target className="h-5 w-5" />}
            label="Oportunidades Ativas"
            value={dash.oportunidades.data ? `${dash.oportunidades.data.total} oportunidades` : '—'}
            sub={dash.oportunidades.data ? formatBRL(dash.oportunidades.data.valorTotal) + ' em negociação' : ''}
            sub2={dash.oportunidades.data ? `${dash.oportunidades.data.quentes} 🔥 / ${dash.oportunidades.data.mornas} ☁️ / ${dash.oportunidades.data.frias} 🧊` : ''}
            loading={dash.oportunidades.isLoading}
            color="text-orange-600"
          />
          <KPICard
            icon={<Users className="h-5 w-5" />}
            label="Novos Clientes"
            value={dash.novosClientes.data ? `${dash.novosClientes.data.total} novos` : '—'}
            sub={dash.novosClientes.data ? Object.entries(dash.novosClientes.data.porSegmento).slice(0, 3).map(([k, v]) => `${v} ${k}`).join(' | ') : ''}
            loading={dash.novosClientes.isLoading}
            color="text-violet-600"
          />
        </div>

        {/* Funil + Line chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Funil */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Funil de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              {dash.funil.isLoading ? <Skeleton className="h-64 w-full" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dash.funil.data} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="etapa" width={100} tick={{ fontSize: 11 }}
                      tickFormatter={(v) => ETAPA_LABELS[v] || v} />
                    <Tooltip formatter={(v: number) => [v, 'Ops']}
                      labelFormatter={(v) => ETAPA_LABELS[v] || v} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {dash.funil.data?.map((_, i) => (
                        <Cell key={i} fill={ETAPA_COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Line chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Propostas por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {dash.propostasPorMes.isLoading ? <Skeleton className="h-64 w-full" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dash.propostasPorMes.data} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="enviadas" stroke="hsl(var(--primary))" name="Enviadas" strokeWidth={2} />
                    <Line type="monotone" dataKey="aprovadas" stroke="#22C55E" name="Aprovadas" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Saúde carteira */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saúde da Carteira de Clientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dash.saudeCarteira.isLoading ? <Skeleton className="h-32 w-full" /> : (
              <>
                {[
                  { key: 'ativo', emoji: '🟢', label: 'Ativos (<30 dias)', color: 'bg-green-500' },
                  { key: 'morno', emoji: '🟡', label: 'Mornos (31-60 dias)', color: 'bg-yellow-500' },
                  { key: 'risco', emoji: '🔴', label: 'Em Risco (61-90d)', color: 'bg-red-500' },
                  { key: 'inativo', emoji: '⚫', label: 'Inativos (>90 dias)', color: 'bg-gray-500' },
                ].map(({ key, emoji, label, color }) => {
                  const items = dash.saudeCarteira.data?.[key as keyof typeof dash.saudeCarteira.data] ?? [];
                  const total = items.reduce((s: number, c: any) => s + (c.total_compras_gc || 0), 0);
                  const max = Math.max(...Object.values(dash.saudeCarteira.data ?? {}).map((arr: any) => arr.length), 1);
                  const pct = (items.length / max) * 100;
                  return (
                    <button key={key} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      onClick={() => navigate('/clientes')}>
                      <span className="text-lg">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{label}</span>
                          <span className="text-muted-foreground">{items.length} clientes — {formatBRL(total)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-1">
                          <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
                {(dash.saudeCarteira.data?.risco?.length ?? 0) > 0 && (
                  <Button variant="outline" size="sm" className="w-full mt-2 gap-1.5"
                    onClick={() => navigate('/clientes')}>
                    🚨 Ver clientes em risco <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Ranking vendedores (gestor only) */}
        {isGestor && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ranking de Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              {dash.ranking.isLoading ? <Skeleton className="h-40 w-full" /> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendedor</TableHead>
                        <TableHead className="text-center">Ops Ativas</TableHead>
                        <TableHead className="text-center">Props Enviadas</TableHead>
                        <TableHead className="text-center">Props Aprovadas</TableHead>
                        <TableHead className="text-right">Valor Fechado</TableHead>
                        <TableHead className="text-center">Conversão</TableHead>
                        <TableHead className="w-[120px]">Meta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dash.ranking.data?.map(v => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.nome}</TableCell>
                          <TableCell className="text-center">{v.ativas}</TableCell>
                          <TableCell className="text-center">{v.enviadas}</TableCell>
                          <TableCell className="text-center">{v.aprovadas}</TableCell>
                          <TableCell className="text-right">{formatBRL(v.valorFechado)}</TableCell>
                          <TableCell className="text-center">{v.conversao}%</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-2">
                                <div className={`h-2 rounded-full ${v.metaPct >= 80 ? 'bg-green-500' : v.metaPct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(v.metaPct, 100)}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-9 text-right">{v.metaPct}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Alertas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" /> Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dash.alertas.isLoading ? <Skeleton className="h-24 w-full" /> : (
              <div className="space-y-2">
                {(dash.alertas.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">✅ Nenhum alerta no momento!</p>
                ) : dash.alertas.data?.map((a, i) => (
                  <button key={i} className="w-full text-left flex items-center gap-2 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(a.link)}>
                    <span>{a.tipo === 'red' ? '🔴' : a.tipo === 'yellow' ? '🟡' : '⚫'}</span>
                    <span className="text-sm">{a.texto}</span>
                    <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* GC Sync */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
              <span>GestãoClick</span>
              {dash.gcSync.data && (
                <>
                  <span>Clientes: {dash.gcSync.data.clientes
                    ? `sincronizados ${formatDistanceToNow(new Date(dash.gcSync.data.clientes), { locale: ptBR, addSuffix: true })}`
                    : 'nunca sincronizado'}</span>
                  <span>|</span>
                  <span>Produtos: {dash.gcSync.data.produtos
                    ? `sincronizados ${formatDistanceToNow(new Date(dash.gcSync.data.produtos), { locale: ptBR, addSuffix: true })}`
                    : 'nunca sincronizado'}</span>
                </>
              )}
            </div>
            <Button variant="outline" size="sm" className="gap-1.5"
              onClick={async () => { await syncClientes(); await syncProdutos(); }}
              disabled={isSyncingClientes || isSyncingProdutos}>
              {(isSyncingClientes || isSyncingProdutos) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sincronizar agora
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function KPICard({ icon, label, value, delta, sub, sub2, loading, color }: {
  icon: React.ReactNode; label: string; value: string; delta?: string;
  sub?: string; sub2?: string; loading: boolean; color: string;
}) {
  const isPositive = delta?.includes('+');
  return (
    <Card>
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className={`${color}`}>{icon}</span>
              {delta && (
                <Badge variant="outline" className={`text-[10px] ${isPositive ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}>
                  {delta}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            {sub2 && <p className="text-xs text-muted-foreground">{sub2}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
