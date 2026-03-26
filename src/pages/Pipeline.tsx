import { useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import confetti from 'canvas-confetti';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Filter,
  Plus,
  Phone,
  FileText,
  CheckCircle2,
  Calendar,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  ETAPAS_KANBAN,
  CHECKLISTS_ETAPA,
  fetchOportunidades,
  fetchAtividadesByOportunidades,
  fetchMotivosPerda,
  updateOportunidadeEtapa,
  insertAtividade,
  calcularBadgeAtividade,
  diasNaEtapa,
  tipoVendaLabels,
  temperaturaLabels,
  formatBRL,
  type OportunidadeRow,
  type AtividadeRow,
} from '@/lib/api/oportunidades';

// ─── Droppable Column ───
function KanbanColumn({ etapa, children, count, total }: {
  etapa: typeof ETAPAS_KANBAN[0];
  children: React.ReactNode;
  count: number;
  total: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] w-[280px] lg:flex-1 lg:min-w-0 bg-muted/50 rounded-xl transition-colors ${
        isOver ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
    >
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: etapa.cor }} />
            <span className="font-semibold text-sm">{etapa.emoji} {etapa.label}</span>
          </div>
          <Badge variant="secondary" className="text-xs">{count}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{formatBRL(total)}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-280px)]">
        {children}
      </div>
    </div>
  );
}

// ─── Draggable Card ───
function OpCard({ op, atividades, onQuickActivity, onCall }: {
  op: OportunidadeRow;
  atividades: AtividadeRow[];
  onQuickActivity: (op: OportunidadeRow) => void;
  onCall: (phone: string) => void;
}) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: op.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const badge = calcularBadgeAtividade(atividades);
  const dias = diasNaEtapa(op.updated_at);
  const temp = temperaturaLabels[op.temperatura ?? 'frio'];

  const badgeStyles: Record<string, string> = {
    green: 'bg-emerald-100 border-emerald-400 text-emerald-700',
    red: 'bg-red-100 border-red-400 text-red-700 animate-pulse',
    gray: 'bg-muted border-border text-muted-foreground',
    yellow: 'bg-amber-100 border-amber-400 text-amber-700',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 space-y-2 cursor-grab active:cursor-grabbing touch-manipulation border shadow-sm hover:shadow-md transition-shadow ${dias >= 7 ? 'border-destructive/40 bg-destructive/5' : 'border-border'}`}
    >
      {/* Top badges */}
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${badgeStyles[badge.cor]}`}>
          {badge.label}
        </span>
        <span className="text-sm">{temp.emoji}</span>
      </div>

      {/* Client & type */}
      <div>
        <p className="font-semibold text-sm leading-tight line-clamp-1">{op.cliente?.nome ?? op.titulo}</p>
        <p className="text-xs text-muted-foreground">{tipoVendaLabels[op.tipo_venda ?? ''] ?? op.tipo_venda}</p>
      </div>

      {/* Value */}
      <p className="text-base font-bold text-emerald-600">{formatBRL(op.valor_estimado)}</p>

      {/* Meta */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        {op.data_fechamento_prevista && (
          <p className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Fechar em {format(new Date(op.data_fechamento_prevista), 'dd/MM', { locale: ptBR })}
          </p>
        )}
        {dias > 0 && (
          <p className={`flex items-center gap-1 ${
            dias >= 7 ? 'text-destructive font-semibold' :
            dias >= 4 ? 'text-yellow-600 font-medium' :
            'text-muted-foreground'
          }`}>
            <Clock className="h-3 w-3" />
            {dias >= 7 ? `🔴 ${dias} dias parado!` : dias >= 4 ? `⚠️ ${dias} dias aqui` : `${dias} dias aqui`}
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-1 pt-1 border-t border-border">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); op.cliente?.telefone && onCall(op.cliente.telefone); }}
        >
          <Phone className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); navigate(`/nova-proposta`); }}
        >
          <FileText className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onQuickActivity(op); }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}

// ─── Overlay card (while dragging) ───
function DragCard({ op }: { op: OportunidadeRow }) {
  return (
    <Card className="p-3 w-[270px] shadow-xl border-primary border-2 opacity-90">
      <p className="font-semibold text-sm">{op.cliente?.nome ?? op.titulo}</p>
      <p className="text-base font-bold text-emerald-600">{formatBRL(op.valor_estimado)}</p>
    </Card>
  );
}

// ─── Main Page ───
export default function Pipeline() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, perfil } = useAuth();

  // State
  const [filtroTipoVenda, setFiltroTipoVenda] = useState('todos');
  const [filtroTemperatura, setFiltroTemperatura] = useState('todos');
  const [filtroSemAtividade, setFiltroSemAtividade] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Modals
  const [checklistModal, setChecklistModal] = useState<{ op: OportunidadeRow; targetEtapa: string } | null>(null);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [lossModal, setLossModal] = useState<OportunidadeRow | null>(null);
  const [lossMotivo, setLossMotivo] = useState('');
  const [lossDescricao, setLossDescricao] = useState('');
  const [activityModal, setActivityModal] = useState<OportunidadeRow | null>(null);
  const [actTipo, setActTipo] = useState('ligacao');
  const [actTitulo, setActTitulo] = useState('');
  const [actResultado, setActResultado] = useState('');

  // Queries
  const { data: oportunidades = [], isLoading } = useQuery({
    queryKey: ['oportunidades'],
    queryFn: fetchOportunidades,
  });

  const opIds = useMemo(() => oportunidades.map((o) => o.id), [oportunidades]);

  const { data: todasAtividades = [] } = useQuery({
    queryKey: ['atividades_pipeline', opIds],
    queryFn: () => fetchAtividadesByOportunidades(opIds),
    enabled: opIds.length > 0,
  });

  const { data: motivosPerda = [] } = useQuery({
    queryKey: ['motivos_perda'],
    queryFn: fetchMotivosPerda,
  });

  const atividadesPorOp = useMemo(() => {
    const map: Record<string, AtividadeRow[]> = {};
    todasAtividades.forEach((a) => {
      if (a.oportunidade_id) {
        if (!map[a.oportunidade_id]) map[a.oportunidade_id] = [];
        map[a.oportunidade_id].push(a);
      }
    });
    return map;
  }, [todasAtividades]);

  // Filtered ops
  const filtradas = useMemo(() => {
    return oportunidades.filter((op) => {
      if (filtroTipoVenda !== 'todos' && op.tipo_venda !== filtroTipoVenda) return false;
      if (filtroTemperatura !== 'todos' && op.temperatura !== filtroTemperatura) return false;
      if (filtroSemAtividade) {
        const badge = calcularBadgeAtividade(atividadesPorOp[op.id] ?? []);
        if (badge.tipo !== 'sem_atividade') return false;
      }
      return true;
    });
  }, [oportunidades, filtroTipoVenda, filtroTemperatura, filtroSemAtividade, atividadesPorOp]);

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const opId = active.id as string;
    const targetEtapa = over.id as string;
    const op = oportunidades.find((o) => o.id === opId);
    if (!op || op.etapa === targetEtapa) return;

    // Loss modal
    if (targetEtapa === 'fechado_perdido') {
      setLossModal(op);
      return;
    }

    // Checklist modal
    const checklist = CHECKLISTS_ETAPA[targetEtapa];
    if (checklist && checklist.length > 0) {
      const existing = (op.checklist_etapa ?? {}) as Record<string, boolean>;
      const allDone = checklist.every((item) => existing[item]);
      if (!allDone) {
        setChecklistState(existing);
        setChecklistModal({ op, targetEtapa });
        return;
      }
    }

    // Direct move
    await moveToEtapa(op, targetEtapa);
  }, [oportunidades]);

  const moveToEtapa = async (op: OportunidadeRow, targetEtapa: string) => {
    try {
      await updateOportunidadeEtapa(op.id, targetEtapa);
      await insertAtividade({
        oportunidade_id: op.id,
        cliente_id: op.cliente_id ?? undefined,
        vendedor_id: user?.id,
        tipo: 'nota',
        titulo: `Etapa atualizada para ${ETAPAS_KANBAN.find((e) => e.id === targetEtapa)?.label}`,
        data_realizada: new Date().toISOString(),
        concluida: true,
      });

      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
      queryClient.invalidateQueries({ queryKey: ['atividades_pipeline'] });

      if (targetEtapa === 'fechado_ganho') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        toast({ title: `🏆 Oportunidade GANHA! ${formatBRL(op.valor_estimado)} conquistados!` });
      } else {
        const etapaLabel = ETAPAS_KANBAN.find((e) => e.id === targetEtapa)?.label;
        toast({ title: `Oportunidade avançada para ${etapaLabel} ✅` });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao mover', description: err.message, variant: 'destructive' });
    }
  };

  // Checklist confirm
  const handleChecklistConfirm = async () => {
    if (!checklistModal) return;
    const { op, targetEtapa } = checklistModal;
    const checklist = CHECKLISTS_ETAPA[targetEtapa] ?? [];
    const allDone = checklist.every((item) => checklistState[item]);
    if (!allDone) return;

    await updateOportunidadeEtapa(op.id, targetEtapa, { checklist_etapa: checklistState });
    setChecklistModal(null);

    await insertAtividade({
      oportunidade_id: op.id,
      vendedor_id: user?.id,
      tipo: 'nota',
      titulo: `Etapa atualizada para ${ETAPAS_KANBAN.find((e) => e.id === targetEtapa)?.label}`,
      data_realizada: new Date().toISOString(),
      concluida: true,
    });

    queryClient.invalidateQueries({ queryKey: ['oportunidades'] });

    if (targetEtapa === 'fechado_ganho') {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      toast({ title: `🏆 Oportunidade GANHA! ${formatBRL(op.valor_estimado)} conquistados!` });
    } else {
      toast({ title: `Oportunidade avançada para ${ETAPAS_KANBAN.find((e) => e.id === targetEtapa)?.label} ✅` });
    }
  };

  // Loss confirm
  const handleLossConfirm = async () => {
    if (!lossModal || !lossMotivo) return;
    await updateOportunidadeEtapa(lossModal.id, 'fechado_perdido', {
      motivo_perda_id: lossMotivo,
      descricao_perda: lossDescricao || null,
    });

    await insertAtividade({
      oportunidade_id: lossModal.id,
      vendedor_id: user?.id,
      tipo: 'nota',
      titulo: 'Oportunidade marcada como perdida',
      data_realizada: new Date().toISOString(),
      concluida: true,
    });

    queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
    toast({ title: 'Oportunidade marcada como perdida' });
    setLossModal(null);
    setLossMotivo('');
    setLossDescricao('');
  };

  // Quick activity
  const handleSaveActivity = async () => {
    if (!activityModal || !actTitulo.trim()) return;
    await insertAtividade({
      oportunidade_id: activityModal.id,
      cliente_id: activityModal.cliente_id ?? undefined,
      vendedor_id: user?.id,
      tipo: actTipo,
      titulo: actTitulo,
      resultado: actResultado || undefined,
      data_realizada: new Date().toISOString(),
      concluida: true,
    });

    await supabaseUpdateUltimaAtividade(activityModal.id);
    queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
    queryClient.invalidateQueries({ queryKey: ['atividades_pipeline'] });
    toast({ title: '✅ Atividade registrada' });
    setActivityModal(null);
    setActTitulo('');
    setActResultado('');
  };

  const totalAberto = useMemo(() => {
    return filtradas
      .filter((o) => !['fechado_ganho', 'fechado_perdido'].includes(o.etapa))
      .reduce((s, o) => s + (o.valor_estimado ?? 0), 0);
  }, [filtradas]);

  const activeOp = activeId ? oportunidades.find((o) => o.id === activeId) : null;

  return (
    <MainLayout>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold">Pipeline</h1>
            <p className="text-sm text-muted-foreground">Total em aberto: <span className="font-semibold text-foreground">{formatBRL(totalAberto)}</span></p>
          </div>
          <div className="flex gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Filter className="h-4 w-4" /> Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-xl">
                <SheetHeader><SheetTitle>Filtros do Pipeline</SheetTitle></SheetHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tipo de Venda</Label>
                    <Select value={filtroTipoVenda} onValueChange={setFiltroTipoVenda}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="equipamento_novo">Equipamento Novo</SelectItem>
                        <SelectItem value="locacao">Locação</SelectItem>
                        <SelectItem value="contrato_pcm">Contrato PCM</SelectItem>
                        <SelectItem value="manutencao_avulsa">Manutenção Avulsa</SelectItem>
                        <SelectItem value="higienizacao_coifa">Higienização Coifa</SelectItem>
                        <SelectItem value="quimicos">Químicos</SelectItem>
                        <SelectItem value="instalacao">Instalação</SelectItem>
                        <SelectItem value="treinamento">Treinamento</SelectItem>
                        <SelectItem value="projeto_completo">Projeto Completo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Temperatura</Label>
                    <Select value={filtroTemperatura} onValueChange={setFiltroTemperatura}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="quente">🔥 Quente</SelectItem>
                        <SelectItem value="morno">☁️ Morno</SelectItem>
                        <SelectItem value="frio">🧊 Frio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Somente sem atividade agendada</Label>
                    <Switch checked={filtroSemAtividade} onCheckedChange={setFiltroSemAtividade} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button size="sm" className="gap-1" onClick={() => navigate('/oportunidades/nova')}>
              <Plus className="h-4 w-4" /> Nova
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {ETAPAS_KANBAN.filter((e) => !['fechado_ganho', 'fechado_perdido'].includes(e.id)).map((etapa) => {
            const ops = filtradas.filter((o) => o.etapa === etapa.id);
            const total = ops.reduce((s, o) => s + (o.valor_estimado ?? 0), 0);
            return (
              <div key={etapa.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-lg text-xs whitespace-nowrap shrink-0">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: etapa.cor }} />
                <span className="font-medium">{ops.length}</span>
                <span className="text-muted-foreground">/ {formatBRL(total)}</span>
              </div>
            );
          })}
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="min-w-[280px] space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory lg:snap-none">
              {ETAPAS_KANBAN.map((etapa) => {
                const ops = filtradas.filter((o) => o.etapa === etapa.id);
                const total = ops.reduce((s, o) => s + (o.valor_estimado ?? 0), 0);
                return (
                  <div key={etapa.id} className="snap-center">
                    <KanbanColumn etapa={etapa} count={ops.length} total={total}>
                      {ops.map((op) => (
                        <OpCard
                          key={op.id}
                          op={op}
                          atividades={atividadesPorOp[op.id] ?? []}
                          onQuickActivity={setActivityModal}
                          onCall={(phone) => window.open(`tel:${phone}`)}
                        />
                      ))}
                    </KanbanColumn>
                  </div>
                );
              })}
            </div>

            <DragOverlay>
              {activeOp ? <DragCard op={activeOp} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* ─── Checklist Modal ─── */}
      <Dialog open={!!checklistModal} onOpenChange={(o) => !o && setChecklistModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Para avançar para {ETAPAS_KANBAN.find((e) => e.id === checklistModal?.targetEtapa)?.label}, confirme:
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(CHECKLISTS_ETAPA[checklistModal?.targetEtapa ?? ''] ?? []).map((item) => (
              <label key={item} className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={!!checklistState[item]}
                  onCheckedChange={(checked) =>
                    setChecklistState((prev) => ({ ...prev, [item]: !!checked }))
                  }
                />
                <span className="text-sm">{item}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChecklistModal(null)}>Cancelar</Button>
            <Button
              onClick={handleChecklistConfirm}
              disabled={!(CHECKLISTS_ETAPA[checklistModal?.targetEtapa ?? ''] ?? []).every((item) => checklistState[item])}
            >
              Confirmar e Avançar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Loss Modal ─── */}
      <Dialog open={!!lossModal} onOpenChange={(o) => !o && setLossModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Perda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={lossMotivo} onValueChange={setLossMotivo}>
                <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                <SelectContent>
                  {motivosPerda.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Detalhes (opcional)</Label>
              <Textarea value={lossDescricao} onChange={(e) => setLossDescricao(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLossModal(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleLossConfirm} disabled={!lossMotivo}>
              Confirmar Perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Quick Activity Modal ─── */}
      <Dialog open={!!activityModal} onOpenChange={(o) => !o && setActivityModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Atividade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={actTipo} onValueChange={setActTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ligacao">📞 Ligação</SelectItem>
                  <SelectItem value="visita_tecnica">🏠 Visita Técnica</SelectItem>
                  <SelectItem value="demo_produto">🎯 Demo Produto</SelectItem>
                  <SelectItem value="envio_proposta">📄 Envio Proposta</SelectItem>
                  <SelectItem value="followup">🔄 Follow-up</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
                  <SelectItem value="reuniao_online">💻 Reunião Online</SelectItem>
                  <SelectItem value="tarefa">📋 Tarefa</SelectItem>
                  <SelectItem value="nota">📝 Nota</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={actTitulo} onChange={(e) => setActTitulo(e.target.value)} placeholder="Ex: Ligação de follow-up" />
            </div>
            <div className="space-y-2">
              <Label>Resultado</Label>
              <Textarea value={actResultado} onChange={(e) => setActResultado(e.target.value)} placeholder="O que aconteceu?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityModal(null)}>Cancelar</Button>
            <Button onClick={handleSaveActivity} disabled={!actTitulo.trim()}>Salvar Atividade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

// Helper - update ultima_atividade_em
import { supabase } from '@/integrations/supabase/client';
async function supabaseUpdateUltimaAtividade(opId: string) {
  await supabase
    .from('oportunidades')
    .update({ ultima_atividade_em: new Date().toISOString() })
    .eq('id', opId);
}
