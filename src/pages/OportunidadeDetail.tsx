import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, BarChart3, FileText, Calendar, Clock, Flame,
  ChevronLeft, ChevronRight, CheckCircle2, Plus,
} from 'lucide-react';
import {
  ETAPAS_KANBAN,
  CHECKLISTS_ETAPA,
  fetchOportunidades,
  fetchAtividadesByOportunidades,
  updateOportunidadeEtapa,
  insertAtividade,
  fetchMotivosPerda,
  tipoVendaLabels,
  temperaturaLabels,
  formatBRL,
  type OportunidadeRow,
  type AtividadeRow,
} from '@/lib/api/oportunidades';
import { tipoAtividadeIcons } from '@/lib/api/atividades';
import { supabase } from '@/integrations/supabase/client';

export default function OportunidadeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const [checklistModal, setChecklistModal] = useState<string | null>(null);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [lossModal, setLossModal] = useState(false);
  const [lossMotivo, setLossMotivo] = useState('');
  const [lossDesc, setLossDesc] = useState('');
  const [actModal, setActModal] = useState(false);
  const [actTipo, setActTipo] = useState('ligacao');
  const [actTitulo, setActTitulo] = useState('');
  const [actDataPrevista, setActDataPrevista] = useState('');
  const [actDesc, setActDesc] = useState('');

  const { data: allOps = [], isLoading } = useQuery({
    queryKey: ['oportunidades'],
    queryFn: fetchOportunidades,
  });

  const op = allOps.find((o) => o.id === id);

  const { data: atividades = [] } = useQuery({
    queryKey: ['atividades_op', id],
    queryFn: () => fetchAtividadesByOportunidades([id!]),
    enabled: !!id,
  });

  const { data: motivosPerda = [] } = useQuery({
    queryKey: ['motivos_perda'],
    queryFn: fetchMotivosPerda,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
    queryClient.invalidateQueries({ queryKey: ['atividades_op'] });
    queryClient.invalidateQueries({ queryKey: ['atividades_hoje'] });
    queryClient.invalidateQueries({ queryKey: ['atividades_pipeline'] });
  };

  if (isLoading) {
    return <MainLayout><div className="space-y-3"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-32 w-full" /></div></MainLayout>;
  }

  if (!op) {
    return <MainLayout><div className="text-center py-12 text-muted-foreground"><p>Oportunidade não encontrada.</p><Button variant="link" onClick={() => navigate('/pipeline')}>Voltar ao Pipeline</Button></div></MainLayout>;
  }

  const etapaAtual = ETAPAS_KANBAN.find((e) => e.id === op.etapa);
  const etapaIndex = ETAPAS_KANBAN.findIndex((e) => e.id === op.etapa);
  const temp = temperaturaLabels[op.temperatura ?? 'frio'];

  const handleAvancar = (targetEtapa: string) => {
    const checklist = CHECKLISTS_ETAPA[targetEtapa];
    if (checklist && checklist.length > 0) {
      const existing = (op.checklist_etapa ?? {}) as Record<string, boolean>;
      const allDone = checklist.every((item) => existing[item]);
      if (!allDone) {
        setChecklistState(existing);
        setChecklistModal(targetEtapa);
        return;
      }
    }
    doMove(targetEtapa);
  };

  const doMove = async (targetEtapa: string) => {
    if (targetEtapa === 'fechado_perdido') {
      setLossModal(true);
      return;
    }

    await updateOportunidadeEtapa(op.id, targetEtapa);
    await insertAtividade({
      oportunidade_id: op.id,
      vendedor_id: user?.id,
      tipo: 'nota',
      titulo: `Etapa atualizada para ${ETAPAS_KANBAN.find((e) => e.id === targetEtapa)?.label}`,
      data_realizada: new Date().toISOString(),
      concluida: true,
    });

    if (targetEtapa === 'fechado_ganho') {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      toast({ title: `🏆 Oportunidade GANHA! ${formatBRL(op.valor_estimado)}` });
    } else {
      toast({ title: `Avançada para ${ETAPAS_KANBAN.find((e) => e.id === targetEtapa)?.label} ✅` });
    }
    invalidateAll();
  };

  const handleChecklistConfirm = async () => {
    if (!checklistModal) return;
    const checklist = CHECKLISTS_ETAPA[checklistModal] ?? [];
    if (!checklist.every((item) => checklistState[item])) return;
    await updateOportunidadeEtapa(op.id, checklistModal, { checklist_etapa: checklistState });
    setChecklistModal(null);

    if (checklistModal === 'fechado_ganho') {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      toast({ title: `🏆 Oportunidade GANHA!` });
    } else {
      toast({ title: `Avançada para ${ETAPAS_KANBAN.find((e) => e.id === checklistModal)?.label} ✅` });
    }
    await insertAtividade({
      oportunidade_id: op.id,
      vendedor_id: user?.id,
      tipo: 'nota',
      titulo: `Etapa atualizada para ${ETAPAS_KANBAN.find((e) => e.id === checklistModal)?.label}`,
      data_realizada: new Date().toISOString(),
      concluida: true,
    });
    invalidateAll();
  };

  const handleLossConfirm = async () => {
    if (!lossMotivo) return;
    await updateOportunidadeEtapa(op.id, 'fechado_perdido', {
      motivo_perda_id: lossMotivo,
      descricao_perda: lossDesc || null,
    });
    toast({ title: 'Oportunidade marcada como perdida' });
    setLossModal(false);
    invalidateAll();
  };

  const handleSaveActivity = async () => {
    if (!actTitulo.trim()) return;
    await insertAtividade({
      oportunidade_id: op.id,
      cliente_id: op.cliente_id ?? undefined,
      vendedor_id: user?.id,
      tipo: actTipo,
      titulo: actTitulo,
      descricao: actDesc || undefined,
      data_prevista: actDataPrevista ? new Date(actDataPrevista).toISOString() : undefined,
      concluida: false,
    });
    await supabase.from('oportunidades').update({ ultima_atividade_em: new Date().toISOString() }).eq('id', op.id);
    toast({ title: '✅ Atividade criada' });
    setActModal(false);
    setActTitulo('');
    setActDesc('');
    invalidateAll();
  };

  const pendentes = atividades.filter((a) => !a.concluida).sort((a, b) =>
    (a.data_prevista ?? '').localeCompare(b.data_prevista ?? '')
  );
  const concluidas = atividades.filter((a) => a.concluida).sort((a, b) =>
    (b.data_realizada ?? '').localeCompare(a.data_realizada ?? '')
  );
  const historico = atividades
    .filter((a) => a.tipo === 'nota' && a.concluida)
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

  return (
    <MainLayout>
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/pipeline')} className="gap-1 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Pipeline
        </Button>

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">#{op.numero}</Badge>
            <Badge style={{ backgroundColor: etapaAtual?.cor, color: '#fff' }} className="text-xs">
              {etapaAtual?.emoji} {etapaAtual?.label}
            </Badge>
            <span className="text-sm">{temp.emoji} {temp.label}</span>
          </div>
          <h1 className="text-xl font-bold">{op.titulo}</h1>
          {op.cliente && <p className="text-sm text-muted-foreground">{(op.cliente as any).nome}</p>}
        </div>

        {/* Metrics row */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { label: formatBRL(op.valor_estimado), icon: '💰' },
            { label: `${op.probabilidade ?? 0}%`, icon: '📊' },
            { label: op.data_fechamento_prevista ? format(new Date(op.data_fechamento_prevista), 'dd/MM', { locale: ptBR }) : '—', icon: '📅' },
          ].map((m, i) => (
            <Card key={i} className="shrink-0">
              <CardContent className="p-2 text-center">
                <p className="text-lg font-bold">{m.icon} {m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stage progress */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {ETAPAS_KANBAN.filter(e => e.id !== 'fechado_perdido').map((e, i) => {
                const isCurrent = e.id === op.etapa;
                const isPast = i < etapaIndex;
                return (
                  <div key={e.id} className="flex items-center shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      isCurrent ? 'ring-2 ring-primary' : ''
                    }`} style={{ backgroundColor: isPast || isCurrent ? e.cor : '#e5e7eb', color: isPast || isCurrent ? '#fff' : '#9ca3af' }}>
                      {isPast ? '✓' : e.emoji}
                    </div>
                    {i < ETAPAS_KANBAN.length - 2 && (
                      <div className={`w-4 h-0.5 ${isPast ? 'bg-primary' : 'bg-border'}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 mt-3">
              {etapaIndex > 0 && op.etapa !== 'fechado_ganho' && op.etapa !== 'fechado_perdido' && (
                <Button variant="outline" size="sm" className="gap-1" onClick={() => doMove(ETAPAS_KANBAN[etapaIndex - 1].id)}>
                  <ChevronLeft className="h-4 w-4" /> Voltar etapa
                </Button>
              )}
              {etapaIndex < ETAPAS_KANBAN.length - 2 && op.etapa !== 'fechado_ganho' && op.etapa !== 'fechado_perdido' && (
                <Button size="sm" className="gap-1" onClick={() => handleAvancar(ETAPAS_KANBAN[etapaIndex + 1].id)}>
                  Avançar etapa <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate('/pipeline')} className="gap-1">
            <BarChart3 className="h-4 w-4" /> Pipeline
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/nova-proposta')} className="gap-1">
            <FileText className="h-4 w-4" /> Criar Proposta
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="atividades">
          <TabsList className="w-full">
            <TabsTrigger value="atividades" className="flex-1">📅 Atividades</TabsTrigger>
            <TabsTrigger value="detalhes" className="flex-1">📝 Detalhes</TabsTrigger>
            <TabsTrigger value="historico" className="flex-1">🕐 Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="atividades" className="space-y-3 mt-3">
            <Button size="sm" className="gap-1" onClick={() => { setActModal(true); setActDataPrevista(format(new Date(), "yyyy-MM-dd'T'HH:mm")); }}>
              <Plus className="h-4 w-4" /> Nova Atividade
            </Button>

            {pendentes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase">Pendentes ({pendentes.length})</p>
                {pendentes.map((a) => (
                  <Card key={a.id} className="border-l-4 border-l-amber-400">
                    <CardContent className="p-3">
                      <p className="font-medium text-sm">{tipoAtividadeIcons[a.tipo] ?? '📋'} {a.titulo}</p>
                      {a.data_prevista && <p className="text-xs text-muted-foreground mt-1">📅 {format(new Date(a.data_prevista), 'dd/MM HH:mm', { locale: ptBR })}</p>}
                      {a.descricao && <p className="text-xs text-muted-foreground mt-1">{a.descricao}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {concluidas.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase">Concluídas ({concluidas.length})</p>
                {concluidas.map((a) => (
                  <Card key={a.id} className="opacity-60">
                    <CardContent className="p-3">
                      <p className="font-medium text-sm line-through">{tipoAtividadeIcons[a.tipo] ?? '📋'} {a.titulo}</p>
                      {a.resultado && <p className="text-xs text-muted-foreground mt-1">{a.resultado}</p>}
                      {a.data_realizada && <p className="text-xs text-muted-foreground mt-1">✅ {format(new Date(a.data_realizada), 'dd/MM HH:mm', { locale: ptBR })}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="detalhes" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Tipo de Venda</span><p className="font-medium">{tipoVendaLabels[op.tipo_venda ?? ''] ?? '—'}</p></div>
              <div><span className="text-muted-foreground">Origem</span><p className="font-medium capitalize">{op.origem?.replace('_', ' ') ?? '—'}</p></div>
              <div><span className="text-muted-foreground">Valor</span><p className="font-medium">{formatBRL(op.valor_estimado)}</p></div>
              <div><span className="text-muted-foreground">Probabilidade</span><p className="font-medium">{op.probabilidade ?? 0}%</p></div>
              <div><span className="text-muted-foreground">Previsão</span><p className="font-medium">{op.data_fechamento_prevista ? format(new Date(op.data_fechamento_prevista), 'dd/MM/yyyy') : '—'}</p></div>
              <div><span className="text-muted-foreground">Criada em</span><p className="font-medium">{op.created_at ? format(new Date(op.created_at), 'dd/MM/yyyy') : '—'}</p></div>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="space-y-2 mt-3">
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum histórico ainda.</p>
            ) : (
              historico.map((h) => (
                <div key={h.id} className="flex gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p>{h.titulo}</p>
                    <p className="text-xs text-muted-foreground">{h.created_at ? format(new Date(h.created_at), "dd/MM 'às' HH:mm", { locale: ptBR }) : ''}</p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Checklist Modal */}
      <Dialog open={!!checklistModal} onOpenChange={(o) => !o && setChecklistModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Para avançar para {ETAPAS_KANBAN.find((e) => e.id === checklistModal)?.label}, confirme:</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(CHECKLISTS_ETAPA[checklistModal ?? ''] ?? []).map((item) => (
              <label key={item} className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={!!checklistState[item]} onCheckedChange={(c) => setChecklistState((p) => ({ ...p, [item]: !!c }))} />
                <span className="text-sm">{item}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChecklistModal(null)}>Cancelar</Button>
            <Button onClick={handleChecklistConfirm} disabled={!(CHECKLISTS_ETAPA[checklistModal ?? ''] ?? []).every((i) => checklistState[i])}>
              Confirmar e Avançar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loss Modal */}
      <Dialog open={lossModal} onOpenChange={setLossModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motivo da Perda</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={lossMotivo} onValueChange={setLossMotivo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {motivosPerda.map((m) => <SelectItem key={m.id} value={m.id}>{m.descricao}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Detalhes</Label>
              <Textarea value={lossDesc} onChange={(e) => setLossDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLossModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleLossConfirm} disabled={!lossMotivo}>Confirmar Perda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Modal */}
      <Dialog open={actModal} onOpenChange={setActModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Atividade</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={actTipo} onValueChange={setActTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ligacao">📞 Ligação</SelectItem>
                  <SelectItem value="visita_tecnica">🏃 Visita Técnica</SelectItem>
                  <SelectItem value="demo_produto">🍳 Demo Produto</SelectItem>
                  <SelectItem value="envio_proposta">📄 Envio Proposta</SelectItem>
                  <SelectItem value="followup">🔁 Follow-up</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  <SelectItem value="reuniao_online">🖥️ Reunião Online</SelectItem>
                  <SelectItem value="tarefa">✅ Tarefa</SelectItem>
                  <SelectItem value="nota">📝 Nota</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={actTitulo} onChange={(e) => setActTitulo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data prevista</Label>
              <Input type="datetime-local" value={actDataPrevista} onChange={(e) => setActDataPrevista(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={actDesc} onChange={(e) => setActDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveActivity} disabled={!actTitulo.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
