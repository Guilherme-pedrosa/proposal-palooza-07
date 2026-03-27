import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchVisitasVendedor, formatDuracao, type VisitaComCliente } from '@/lib/api/visitas';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin, Clock, Star, Search, Filter, Calendar,
  CheckCircle2, Loader2, AlertCircle, ChevronRight
} from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  concluida: { label: 'Concluída', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle2 className="h-3 w-3" /> },
  em_andamento: { label: 'Em andamento', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  agendada: { label: 'Agendada', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Calendar className="h-3 w-3" /> },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <AlertCircle className="h-3 w-3" /> },
};

const resultadoLabels: Record<string, string> = {
  positivo: '✅ Positivo',
  neutro: '🔄 Neutro',
  negativo: '❌ Negativo',
  ausente: '🚫 Ausente',
  demo_realizada: '🍳 Demo realizada',
  proposta_entregue: '📄 Proposta entregue',
  vistoria_tecnica: '🔧 Vistoria técnica',
};

export default function Visitas() {
  const navigate = useNavigate();
  const { usuario: user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [periodoFilter, setPeriodoFilter] = useState('todos');

  const { data: visitas = [], isLoading } = useQuery({
    queryKey: ['visitas', user?.id],
    queryFn: () => fetchVisitasVendedor(user!.id),
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    let list = [...visitas];

    // Sort by most recent first
    list.sort((a, b) => {
      const dateA = a.checkin_at || a.data_agendada || a.created_at;
      const dateB = b.checkin_at || b.data_agendada || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    if (statusFilter !== 'todos') {
      list = list.filter(v => v.status === statusFilter);
    }

    if (periodoFilter !== 'todos') {
      list = list.filter(v => {
        const date = v.checkin_at || v.data_agendada || v.created_at;
        if (!date) return false;
        const d = parseISO(date);
        if (periodoFilter === 'hoje') return isToday(d);
        if (periodoFilter === 'semana') return isThisWeek(d, { locale: ptBR });
        if (periodoFilter === 'mes') return isThisMonth(d);
        return true;
      });
    }

    if (search.length >= 2) {
      const q = search.toLowerCase();
      list = list.filter(v => {
        const nome = (v.cliente as any)?.nome?.toLowerCase() || '';
        const obs = v.observacoes?.toLowerCase() || '';
        return nome.includes(q) || obs.includes(q);
      });
    }

    return list;
  }, [visitas, statusFilter, periodoFilter, search]);

  // KPIs
  const kpis = useMemo(() => {
    const concluidas = visitas.filter(v => v.status === 'concluida');
    const emAndamento = visitas.filter(v => v.status === 'em_andamento');
    const agendadas = visitas.filter(v => v.status === 'agendada');
    const totalDuracao = concluidas.reduce((sum, v) => sum + (v.duracao_minutos || 0), 0);
    const mediaMinutos = concluidas.length > 0 ? Math.round(totalDuracao / concluidas.length) : 0;
    return { concluidas: concluidas.length, emAndamento: emAndamento.length, agendadas: agendadas.length, mediaMinutos };
  }, [visitas]);

  const getVisitaDate = (v: VisitaComCliente) => v.checkin_at || v.data_agendada || v.created_at;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">📋 Log de Visitas</h1>
            <p className="text-sm text-muted-foreground">{visitas.length} visitas registradas</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{kpis.concluidas}</p>
              <p className="text-[10px] text-muted-foreground">Concluídas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{kpis.emAndamento}</p>
              <p className="text-[10px] text-muted-foreground">Em andamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{kpis.agendadas}</p>
              <p className="text-[10px] text-muted-foreground">Agendadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{formatDuracao(kpis.mediaMinutos)}</p>
              <p className="text-[10px] text-muted-foreground">Duração média</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente ou observação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="concluida">✅ Concluída</SelectItem>
              <SelectItem value="em_andamento">🔵 Em andamento</SelectItem>
              <SelectItem value="agendada">📅 Agendada</SelectItem>
              <SelectItem value="cancelada">❌ Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
            <SelectTrigger className="w-full sm:w-40 h-9">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo período</SelectItem>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">Nenhuma visita encontrada</p>
            <p className="text-xs mt-1">Ajuste os filtros ou faça check-in em um cliente no mapa</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((v) => {
              const cliente = v.cliente as any;
              const cfg = statusConfig[v.status] || statusConfig.agendada;
              const date = getVisitaDate(v);

              return (
                <Card
                  key={v.id}
                  className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                  onClick={() => navigate(`/visita/${v.id}`)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      v.status === 'concluida' ? 'bg-green-500' :
                      v.status === 'em_andamento' ? 'bg-blue-500' :
                      v.status === 'agendada' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">{cliente?.nome || 'Cliente'}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 shrink-0 ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(date), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        )}
                        {v.duracao_minutos && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatDuracao(v.duracao_minutos)}
                          </span>
                        )}
                        {v.satisfacao && (
                          <span className="flex items-center gap-0.5">
                            {Array.from({ length: v.satisfacao }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </span>
                        )}
                        {v.resultado && (
                          <span>{resultadoLabels[v.resultado] || v.resultado}</span>
                        )}
                      </div>

                      {v.observacoes && (
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 italic">"{v.observacoes}"</p>
                      )}
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
