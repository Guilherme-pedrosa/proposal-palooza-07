import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckSquare, Search, Plus, Calendar, Clock, AlertTriangle,
  ChevronDown, ChevronRight, Filter, User, Building2, Target
} from 'lucide-react';
import { format, isToday, isTomorrow, isBefore, startOfDay, isThisWeek, isThisMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { tipoAtividadeIcons, concluirAtividade, adiarAtividade, proximoDiaUtil } from '@/lib/api/atividades';

interface AtividadeFull {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  data_prevista: string | null;
  data_realizada: string | null;
  concluida: boolean | null;
  resultado: string | null;
  proxima_acao: string | null;
  proxima_data: string | null;
  created_at: string | null;
  oportunidade_id: string | null;
  cliente_id: string | null;
  vendedor_id: string | null;
  oportunidade?: { id: string; titulo: string } | null;
  cliente?: { id: string; nome: string } | null;
}

type FiltroStatus = 'pendentes' | 'concluidas' | 'todas';
type FiltroTipo = 'todos' | string;
type Agrupamento = 'data' | 'tipo' | 'cliente' | 'oportunidade';

const tipoLabels: Record<string, string> = {
  ligacao: 'Ligação',
  visita_tecnica: 'Visita Técnica',
  demo_produto: 'Demo Produto',
  envio_proposta: 'Envio Proposta',
  followup: 'Follow-up',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  reuniao_online: 'Reunião Online',
  tarefa: 'Tarefa',
  nota: 'Nota',
};

function getDateGroup(dataPrevista: string | null, concluida: boolean | null): string {
  if (concluida) return '✅ Concluídas';
  if (!dataPrevista) return '📋 Sem data';
  const d = startOfDay(new Date(dataPrevista));
  const hoje = startOfDay(new Date());
  if (isBefore(d, hoje)) return '🔴 Atrasadas';
  if (isToday(d)) return '🟡 Hoje';
  if (isTomorrow(d)) return '🔵 Amanhã';
  if (isThisWeek(d, { weekStartsOn: 1 })) return '📅 Esta semana';
  if (isThisMonth(d)) return '📆 Este mês';
  return '📌 Futuras';
}

const dateGroupOrder: Record<string, number> = {
  '🔴 Atrasadas': 0,
  '🟡 Hoje': 1,
  '🔵 Amanhã': 2,
  '📅 Esta semana': 3,
  '📆 Este mês': 4,
  '📌 Futuras': 5,
  '📋 Sem data': 6,
  '✅ Concluídas': 7,
};

export default function Tarefas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('pendentes');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('data');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [novaModal, setNovaModal] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState({ titulo: '', tipo: 'tarefa', descricao: '', data_prevista: '' });

  const { data: atividades = [], isLoading } = useQuery({
    queryKey: ['tarefas_todas', user?.id, filtroStatus],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase
        .from('atividades')
        .select('*, oportunidade:oportunidades(id, titulo), cliente:clientes_gc(id, nome)')
        .eq('vendedor_id', user.id)
        .order('data_prevista', { ascending: true });

      if (filtroStatus === 'pendentes') q = q.eq('concluida', false);
      else if (filtroStatus === 'concluidas') q = q.eq('concluida', true);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AtividadeFull[];
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    let list = atividades;
    if (busca) {
      const term = busca.toLowerCase();
      list = list.filter(a =>
        a.titulo.toLowerCase().includes(term) ||
        a.cliente?.nome?.toLowerCase().includes(term) ||
        a.oportunidade?.titulo?.toLowerCase().includes(term)
      );
    }
    if (filtroTipo !== 'todos') {
      list = list.filter(a => a.tipo === filtroTipo);
    }
    return list;
  }, [atividades, busca, filtroTipo]);

  const grouped = useMemo(() => {
    const groups: Record<string, AtividadeFull[]> = {};
    for (const a of filtered) {
      let key: string;
      if (agrupamento === 'data') {
        key = getDateGroup(a.data_prevista, a.concluida);
      } else if (agrupamento === 'tipo') {
        key = `${tipoAtividadeIcons[a.tipo] || '📋'} ${tipoLabels[a.tipo] || a.tipo}`;
      } else if (agrupamento === 'cliente') {
        key = a.cliente?.nome || '— Sem cliente';
      } else {
        key = a.oportunidade?.titulo || '— Sem oportunidade';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    }

    const entries = Object.entries(groups);
    if (agrupamento === 'data') {
      entries.sort((a, b) => (dateGroupOrder[a[0]] ?? 99) - (dateGroupOrder[b[0]] ?? 99));
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }
    return entries;
  }, [filtered, agrupamento]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['tarefas_todas'] });
    qc.invalidateQueries({ queryKey: ['atividades'] });
    qc.invalidateQueries({ queryKey: ['atividades_hoje'] });
  };

  const handleToggleConcluir = async (a: AtividadeFull) => {
    try {
      if (a.concluida) {
        await supabase.from('atividades').update({ concluida: false, data_realizada: null, resultado: null }).eq('id', a.id);
        toast.success('Tarefa reaberta');
      } else {
        await concluirAtividade(a.id, 'Concluída');
        toast.success('Tarefa concluída! ✅');
      }
      invalidateAll();
    } catch {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleCriarTarefa = async () => {
    if (!novaTarefa.titulo || !user) return;
    try {
      const data_prevista_iso = novaTarefa.data_prevista ? new Date(novaTarefa.data_prevista).toISOString() : null;
      const { data: created } = await supabase.from('atividades').insert({
        vendedor_id: user.id,
        tipo: novaTarefa.tipo,
        titulo: novaTarefa.titulo,
        descricao: novaTarefa.descricao || null,
        data_prevista: data_prevista_iso,
        concluida: false,
      }).select('id').single();
      if (created?.id) {
        const { pushTarefaParaTodoist } = await import('@/lib/api/todoistSync');
        pushTarefaParaTodoist({
          atividade_id: created.id,
          titulo: novaTarefa.titulo,
          descricao: novaTarefa.descricao || null,
          data_prevista: data_prevista_iso,
          tipo: novaTarefa.tipo,
        });
      }
      toast.success('Tarefa criada! Sincronizando com Todoist…');
      setNovaModal(false);
      setNovaTarefa({ titulo: '', tipo: 'tarefa', descricao: '', data_prevista: '' });
      invalidateAll();
    } catch {
      toast.error('Erro ao criar tarefa');
    }
  };

  const pendentes = atividades.filter(a => !a.concluida).length;
  const atrasadas = atividades.filter(a => !a.concluida && a.data_prevista && isBefore(startOfDay(new Date(a.data_prevista)), startOfDay(new Date()))).length;
  const hojeCnt = atividades.filter(a => !a.concluida && a.data_prevista && isToday(new Date(a.data_prevista))).length;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-primary" />
              Tarefas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie todas as suas atividades e follow-ups
            </p>
          </div>
          <Button onClick={() => setNovaModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4 text-center">
            <div className="text-2xl font-bold">{pendentes}</div>
            <div className="text-xs text-muted-foreground">Pendentes</div>
          </div>
          <div className={cn("rounded-xl border p-4 text-center", atrasadas > 0 ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900" : "bg-card")}>
            <div className={cn("text-2xl font-bold", atrasadas > 0 && "text-red-600")}>{atrasadas}</div>
            <div className="text-xs text-muted-foreground">Atrasadas</div>
          </div>
          <div className={cn("rounded-xl border p-4 text-center", hojeCnt > 0 ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900" : "bg-card")}>
            <div className={cn("text-2xl font-bold", hojeCnt > 0 && "text-yellow-600")}>{hojeCnt}</div>
            <div className="text-xs text-muted-foreground">Para hoje</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as FiltroStatus)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendentes">Pendentes</SelectItem>
              <SelectItem value="concluidas">Concluídas</SelectItem>
              <SelectItem value="todas">Todas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as FiltroTipo)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(tipoLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{tipoAtividadeIcons[k]} {v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={agrupamento} onValueChange={(v) => setAgrupamento(v as Agrupamento)}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="data">Agrupar por data</SelectItem>
              <SelectItem value="tipo">Agrupar por tipo</SelectItem>
              <SelectItem value="cliente">Agrupar por cliente</SelectItem>
              <SelectItem value="oportunidade">Agrupar por oportunidade</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhuma tarefa encontrada</p>
            <Button variant="outline" onClick={() => setNovaModal(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Criar tarefa
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([groupKey, items]) => {
              const isCollapsed = collapsedGroups.has(groupKey);
              return (
                <div key={groupKey} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-semibold text-sm">{groupKey}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">{items.length}</Badge>
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-1 ml-2">
                      {items.map(a => {
                        const isOverdue = !a.concluida && a.data_prevista && isBefore(startOfDay(new Date(a.data_prevista)), startOfDay(new Date()));
                        return (
                          <div
                            key={a.id}
                            className={cn(
                              "flex items-start gap-3 px-3 py-3 rounded-lg border bg-card hover:shadow-sm transition-all group",
                              a.concluida && "opacity-60",
                              isOverdue && "border-red-200 dark:border-red-900"
                            )}
                          >
                            <Checkbox
                              checked={!!a.concluida}
                              onCheckedChange={() => handleToggleConcluir(a)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{tipoAtividadeIcons[a.tipo] || '📋'}</span>
                                <span className={cn(
                                  "text-sm font-medium truncate",
                                  a.concluida && "line-through text-muted-foreground"
                                )}>
                                  {a.titulo}
                                </span>
                                {isOverdue && (
                                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                {a.data_prevista && (
                                  <span className={cn("flex items-center gap-1", isOverdue && "text-red-500 font-medium")}>
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(a.data_prevista), "dd/MM · HH:mm", { locale: ptBR })}
                                  </span>
                                )}
                                {a.cliente && (
                                  <Link
                                    to={`/cliente/${a.cliente.id}`}
                                    className="flex items-center gap-1 hover:text-primary transition-colors"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <Building2 className="h-3 w-3" />
                                    {a.cliente.nome}
                                  </Link>
                                )}
                                {a.oportunidade && (
                                  <Link
                                    to={`/oportunidades/${a.oportunidade.id}`}
                                    className="flex items-center gap-1 hover:text-primary transition-colors"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <Target className="h-3 w-3" />
                                    {a.oportunidade.titulo}
                                  </Link>
                                )}
                              </div>
                              {a.descricao && (
                                <p className="text-xs text-muted-foreground/70 mt-1 truncate">{a.descricao}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New task dialog */}
      <Dialog open={novaModal} onOpenChange={setNovaModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={novaTarefa.titulo}
                onChange={e => setNovaTarefa(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="O que precisa ser feito?"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={novaTarefa.tipo} onValueChange={v => setNovaTarefa(prev => ({ ...prev, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoLabels).filter(([k]) => k !== 'nota').map(([k, v]) => (
                    <SelectItem key={k} value={k}>{tipoAtividadeIcons[k]} {v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data prevista</Label>
              <Input
                type="datetime-local"
                value={novaTarefa.data_prevista}
                onChange={e => setNovaTarefa(prev => ({ ...prev, data_prevista: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={novaTarefa.descricao}
                onChange={e => setNovaTarefa(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Detalhes da tarefa..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaModal(false)}>Cancelar</Button>
            <Button onClick={handleCriarTarefa} disabled={!novaTarefa.titulo}>Criar Tarefa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
