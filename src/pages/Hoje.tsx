import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import confetti from 'canvas-confetti';
import {
  Plus, Target, Flame, Calendar, CheckCircle2, Clock, Users, DollarSign,
  ChevronUp, X
} from 'lucide-react';
import {
  fetchAtividadesVendedor,
  fetchMetaVendedor,
  fetchOpsGanhasNoMes,
  concluirAtividade,
  adiarAtividade,
  proximoDiaUtil,
  grupoAtividade,
  tipoAtividadeIcons,
  saudacao,
  type AtividadeComCliente,
  type GrupoAtividade,
} from '@/lib/api/atividades';
import { insertAtividade, updateOportunidadeEtapa, fetchMotivosPerda, formatBRL } from '@/lib/api/oportunidades';
import { supabase } from '@/integrations/supabase/client';
import { WAIButton } from '@/components/WAIButton';
import { Sparkles } from 'lucide-react';

const grupoConfig: Record<GrupoAtividade, { label: string; emoji: string; borderColor: string; bgColor: string }> = {
  atrasada: { label: 'EM ATRASO', emoji: '🔴', borderColor: 'border-l-red-500', bgColor: 'bg-red-50' },
  hoje: { label: 'HOJE', emoji: '🟢', borderColor: 'border-l-emerald-500', bgColor: 'bg-emerald-50' },
  amanha: { label: 'AMANHÃ', emoji: '🟡', borderColor: 'border-l-amber-400', bgColor: 'bg-white' },
  proximos: { label: 'PRÓXIMOS 7 DIAS', emoji: '⚫', borderColor: 'border-l-gray-400', bgColor: 'bg-white' },
};

function ActivityCard({ atividade, onConcluir, onAdiar }: {
  atividade: AtividadeComCliente;
  onConcluir: (a: AtividadeComCliente) => void;
  onAdiar: (a: AtividadeComCliente) => void;
}) {
  const navigate = useNavigate();
  const grupo = grupoAtividade(atividade.data_prevista);
  const cfg = grupoConfig[grupo];
  const icon = tipoAtividadeIcons[atividade.tipo] ?? '📋';

  return (
    <Card
      className={`border-l-4 ${cfg.borderColor} ${cfg.bgColor} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={() => atividade.oportunidade_id && navigate(`/oportunidades/${atividade.oportunidade_id}`)}
    >
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm leading-tight">
              {icon} {atividade.titulo}
            </p>
            {atividade.cliente?.nome && (
              <p className="text-xs text-muted-foreground mt-0.5">{atividade.cliente.nome}</p>
            )}
            {atividade.cliente?.telefone && (
              <p className="text-xs text-muted-foreground">📞 {atividade.cliente.telefone}</p>
            )}
          </div>
          {atividade.data_prevista && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(new Date(atividade.data_prevista), 'HH:mm')}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={(e) => { e.stopPropagation(); onConcluir(atividade); }}
          >
            <CheckCircle2 className="h-3 w-3" /> Concluir
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={(e) => { e.stopPropagation(); onAdiar(atividade); }}
          >
            <Calendar className="h-3 w-3" /> Adiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Hoje() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, usuario } = useAuth();

  // Conclusion modal
  const [concluindo, setConcluindo] = useState<AtividadeComCliente | null>(null);
  const [resultado, setResultado] = useState('');
  const [proximaAcao, setProximaAcao] = useState('nenhuma');
  const [proximaData, setProximaData] = useState('');

  // Postpone modal
  const [adiando, setAdiando] = useState<AtividadeComCliente | null>(null);
  const [novaDataAdiamento, setNovaDataAdiamento] = useState('');

  // Loss modal
  const [lossOp, setLossOp] = useState<{ id: string; clienteId?: string } | null>(null);
  const [lossMotivo, setLossMotivo] = useState('');
  const [lossDesc, setLossDesc] = useState('');

  // FAB
  const [fabOpen, setFabOpen] = useState(false);
  const [dicaDiaria, setDicaDiaria] = useState<string | null>(null);

  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  const { data: atividades = [], isLoading } = useQuery({
    queryKey: ['atividades_hoje', user?.id],
    queryFn: () => fetchAtividadesVendedor(user!.id),
    enabled: !!user,
  });

  const { data: meta } = useQuery({
    queryKey: ['meta_vendedor', user?.id, mes, ano],
    queryFn: () => fetchMetaVendedor(user!.id, mes, ano),
    enabled: !!user,
  });

  const { data: valorGanho = 0 } = useQuery({
    queryKey: ['ops_ganhas_mes', user?.id, mes, ano],
    queryFn: () => fetchOpsGanhasNoMes(user!.id, mes, ano),
    enabled: !!user,
  });

  const { data: motivosPerda = [] } = useQuery({
    queryKey: ['motivos_perda'],
    queryFn: fetchMotivosPerda,
  });

  // Group activities
  const grupos = useMemo(() => {
    const map: Record<GrupoAtividade, AtividadeComCliente[]> = {
      atrasada: [], hoje: [], amanha: [], proximos: [],
    };
    atividades.forEach((a) => {
      const g = grupoAtividade(a.data_prevista);
      map[g].push(a);
    });
    return map;
  }, [atividades]);

  const countAtrasadas = grupos.atrasada.length;
  const countHoje = grupos.hoje.length;
  const countQuentes = atividades.filter((a) => a.oportunidade_id).length; // simplified
  const metaValor = meta?.meta_valor ?? 100000;
  const metaPct = Math.min(100, Math.round((valorGanho / metaValor) * 100));
  const diasRestantes = getDaysInMonth(agora) - agora.getDate();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['atividades_hoje'] });
    queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
    queryClient.invalidateQueries({ queryKey: ['atividades_pipeline'] });
  };

  // Handle conclusion
  const handleConcluir = async () => {
    if (!concluindo || !resultado.trim()) return;
    try {
      await concluirAtividade(concluindo.id, resultado);

      if (concluindo.oportunidade_id) {
        await supabase.from('oportunidades')
          .update({ ultima_atividade_em: new Date().toISOString() })
          .eq('id', concluindo.oportunidade_id);
      }

      if (proximaAcao !== 'nenhuma' && proximaData) {
        await insertAtividade({
          oportunidade_id: concluindo.oportunidade_id ?? undefined,
          cliente_id: concluindo.cliente_id ?? undefined,
          vendedor_id: user?.id,
          tipo: proximaAcao,
          titulo: `Follow-up — ${concluindo.cliente?.nome ?? concluindo.titulo}`,
          data_prevista: new Date(proximaData).toISOString(),
          concluida: false,
        });
        toast({ title: `✅ Atividade concluída. Próxima agendada para ${format(new Date(proximaData), 'dd/MM', { locale: ptBR })}.` });
      } else {
        toast({ title: '✅ Atividade concluída!' });
      }

      invalidateAll();
      setConcluindo(null);
      setResultado('');
      setProximaAcao('nenhuma');
      setProximaData('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleMarcarGanha = async () => {
    if (!concluindo?.oportunidade_id) return;
    await concluirAtividade(concluindo.id, resultado || 'Oportunidade ganha');
    await updateOportunidadeEtapa(concluindo.oportunidade_id, 'fechado_ganho');
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    toast({ title: '🏆 Oportunidade GANHA!' });
    invalidateAll();
    setConcluindo(null);
    setResultado('');
  };

  const handleMarcarPerdida = () => {
    if (!concluindo?.oportunidade_id) return;
    setLossOp({ id: concluindo.oportunidade_id, clienteId: concluindo.cliente_id ?? undefined });
  };

  const handleLossConfirm = async () => {
    if (!lossOp || !lossMotivo) return;
    if (concluindo) await concluirAtividade(concluindo.id, resultado || 'Oportunidade perdida');
    await updateOportunidadeEtapa(lossOp.id, 'fechado_perdido', {
      motivo_perda_id: lossMotivo,
      descricao_perda: lossDesc || null,
    });
    toast({ title: 'Oportunidade marcada como perdida' });
    invalidateAll();
    setLossOp(null);
    setLossMotivo('');
    setLossDesc('');
    setConcluindo(null);
    setResultado('');
  };

  // Handle postpone
  const handleAdiar = async () => {
    if (!adiando || !novaDataAdiamento) return;
    await adiarAtividade(adiando.id, new Date(novaDataAdiamento).toISOString());
    toast({ title: `Atividade adiada para ${format(new Date(novaDataAdiamento), 'dd/MM', { locale: ptBR })}` });
    invalidateAll();
    setAdiando(null);
    setNovaDataAdiamento('');
  };

  const openConclusao = (a: AtividadeComCliente) => {
    setConcluindo(a);
    setProximaData(format(proximoDiaUtil(new Date()), "yyyy-MM-dd'T'HH:mm"));
  };

  const openAdiar = (a: AtividadeComCliente) => {
    setAdiando(a);
    setNovaDataAdiamento(format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
  };

  return (
    <MainLayout>
      <div className="space-y-4 pb-20">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">{saudacao()}, {usuario?.nome?.split(' ')[0] ?? 'Vendedor'}! 👋</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {format(agora, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <Card className="shrink-0 min-w-[100px]">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-500">{countAtrasadas}</p>
              <p className="text-[10px] text-muted-foreground">🔴 Em atraso</p>
            </CardContent>
          </Card>
          <Card className="shrink-0 min-w-[100px]">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-emerald-500">{countHoje}</p>
              <p className="text-[10px] text-muted-foreground">🟢 Hoje</p>
            </CardContent>
          </Card>
          <Card className="shrink-0 min-w-[100px]">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-orange-500">{countQuentes}</p>
              <p className="text-[10px] text-muted-foreground">🔥 Oportunidades</p>
            </CardContent>
          </Card>
          <Card className="shrink-0 min-w-[130px]">
            <CardContent className="p-3 text-center space-y-1">
              <p className="text-2xl font-bold text-primary">{metaPct}%</p>
              <Progress value={metaPct} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground">🎯 Meta do mês</p>
              <p className="text-[9px] text-muted-foreground">{formatBRL(valorGanho)} de {formatBRL(metaValor)}</p>
              <p className="text-[9px] text-muted-foreground">{diasRestantes}d restantes</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Groups */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : atividades.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Tudo em dia! 🎉</p>
            <p className="text-sm">Nenhuma atividade pendente.</p>
          </div>
        ) : (
          (['atrasada', 'hoje', 'amanha', 'proximos'] as GrupoAtividade[]).map((g) => {
            const items = grupos[g];
            if (items.length === 0) return null;
            const cfg = grupoConfig[g];
            return (
              <div key={g} className="space-y-2">
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    {cfg.emoji} {cfg.label} ({items.length})
                  </p>
                </div>
                {items.map((a) => (
                  <ActivityCard key={a.id} atividade={a} onConcluir={openConclusao} onAdiar={openAdiar} />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
        {fabOpen && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-3">
            <Button size="sm" className="gap-1.5 shadow-lg" onClick={() => { setFabOpen(false); navigate('/oportunidades/nova'); }}>
              <DollarSign className="h-4 w-4" /> Nova Oportunidade
            </Button>
            <Button size="sm" className="gap-1.5 shadow-lg" onClick={() => { setFabOpen(false); navigate('/clientes/novo'); }}>
              <Users className="h-4 w-4" /> Novo Cliente
            </Button>
          </div>
        )}
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-xl"
          onClick={() => setFabOpen(!fabOpen)}
        >
          {fabOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </Button>
      </div>

      {/* ─── Conclusion Modal ─── */}
      <Dialog open={!!concluindo} onOpenChange={(o) => !o && setConcluindo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Concluindo: {concluindo?.titulo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>O que aconteceu? *</Label>
              <Textarea value={resultado} onChange={(e) => setResultado(e.target.value)} placeholder="Descreva o resultado..." />
            </div>
            <div className="space-y-2">
              <Label>Próxima ação</Label>
              <Select value={proximaAcao} onValueChange={setProximaAcao}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Nenhuma (encerrar)</SelectItem>
                  <SelectItem value="ligacao">📞 Ligar novamente</SelectItem>
                  <SelectItem value="visita_tecnica">🏃 Agendar visita técnica</SelectItem>
                  <SelectItem value="envio_proposta">📄 Enviar proposta</SelectItem>
                  <SelectItem value="followup">🔁 Follow-up</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  <SelectItem value="reuniao_online">🖥️ Reunião online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {proximaAcao !== 'nenhuma' && (
              <div className="space-y-2">
                <Label>Data da próxima ação</Label>
                <Input type="datetime-local" value={proximaData} onChange={(e) => setProximaData(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <div className="flex gap-2 w-full">
              <Button className="flex-1" onClick={handleConcluir} disabled={!resultado.trim()}>
                {proximaAcao !== 'nenhuma' ? '💾 Salvar e Agendar' : '✓ Só Salvar'}
              </Button>
            </div>
            {concluindo?.oportunidade_id && (
              <div className="flex gap-2 w-full">
                <Button variant="outline" size="sm" className="flex-1 text-emerald-600" onClick={handleMarcarGanha}>
                  🏆 Marcar GANHA
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-red-600" onClick={handleMarcarPerdida}>
                  ❌ Marcar PERDIDA
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Postpone Modal ─── */}
      <Dialog open={!!adiando} onOpenChange={(o) => !o && setAdiando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adiar Atividade</DialogTitle></DialogHeader>
          <div className="py-2">
            <Label>Nova data</Label>
            <Input type="datetime-local" value={novaDataAdiamento} onChange={(e) => setNovaDataAdiamento(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdiando(null)}>Cancelar</Button>
            <Button onClick={handleAdiar} disabled={!novaDataAdiamento}>Adiar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Loss Modal ─── */}
      <Dialog open={!!lossOp} onOpenChange={(o) => !o && setLossOp(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motivo da Perda</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={lossMotivo} onValueChange={setLossMotivo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {motivosPerda.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Detalhes</Label>
              <Textarea value={lossDesc} onChange={(e) => setLossDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLossOp(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleLossConfirm} disabled={!lossMotivo}>Confirmar Perda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
