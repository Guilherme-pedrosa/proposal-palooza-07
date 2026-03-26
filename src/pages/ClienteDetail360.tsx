import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Phone, MessageSquare, MapPin, Edit, DollarSign,
  CalendarDays, FileText, Target, Plus, Loader2
} from 'lucide-react';
import { WAIButton } from '@/components/WAIButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  clientesGCApi, calcularSaude, saudeConfig, segmentoConfig,
  getAvatarColor, getInitials,
} from '@/lib/api/clientesGC';
import { toast } from 'sonner';
import type { ClienteGC, Oportunidade, Atividade, TipoAtividade } from '@/types/crm';

const tipoAtividadeLabels: Record<string, { label: string; icon: string }> = {
  ligacao: { label: 'Ligação', icon: '📞' },
  visita_tecnica: { label: 'Visita Técnica', icon: '🏃' },
  demo_produto: { label: 'Demo Produto', icon: '🍳' },
  envio_proposta: { label: 'Envio Proposta', icon: '📄' },
  followup: { label: 'Follow-up', icon: '🔁' },
  email: { label: 'Email', icon: '📧' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  reuniao_online: { label: 'Reunião Online', icon: '🖥️' },
  tarefa: { label: 'Tarefa', icon: '✅' },
  nota: { label: 'Nota', icon: '📝' },
};

const etapaColors: Record<string, string> = {
  prospeccao: 'bg-blue-100 text-blue-700',
  qualificacao: 'bg-purple-100 text-purple-700',
  visita_tecnica: 'bg-orange-100 text-orange-700',
  proposta_enviada: 'bg-yellow-100 text-yellow-700',
  negociacao: 'bg-red-100 text-red-700',
  fechado_ganho: 'bg-green-100 text-green-700',
  fechado_perdido: 'bg-gray-100 text-gray-600',
};

export default function ClienteDetail360() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [showAtividadeModal, setShowAtividadeModal] = useState(false);
  const [notaTexto, setNotaTexto] = useState('');

  // Atividade form state
  const [atividadeForm, setAtividadeForm] = useState({
    tipo: 'ligacao' as TipoAtividade,
    titulo: '',
    descricao: '',
    data_prevista: '',
  });

  // Fetch client
  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente_gc', id],
    queryFn: () => clientesGCApi.getById(id!),
    enabled: !!id,
  });

  // Fetch oportunidades
  const { data: oportunidades = [] } = useQuery({
    queryKey: ['oportunidades', 'cliente', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oportunidades')
        .select('*')
        .eq('cliente_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Oportunidade[];
    },
    enabled: !!id,
  });

  // Fetch propostas
  const { data: propostas = [] } = useQuery({
    queryKey: ['propostas_crm', 'cliente', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('propostas')
        .select('*')
        .eq('cliente_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch atividades
  const { data: atividades = [] } = useQuery({
    queryKey: ['atividades', 'cliente', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atividades')
        .select('*')
        .eq('cliente_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Atividade[];
    },
    enabled: !!id,
  });

  // Save atividade
  const saveAtividade = useMutation({
    mutationFn: async (atv: any) => {
      const { error } = await supabase.from('atividades').insert(atv as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades', 'cliente', id] });
      setShowAtividadeModal(false);
      setAtividadeForm({ tipo: 'ligacao', titulo: '', descricao: '', data_prevista: '' });
      toast.success('Atividade registrada!');
    },
    onError: () => toast.error('Erro ao salvar atividade'),
  });

  // Save nota
  const saveNota = useMutation({
    mutationFn: async (texto: string) => {
      const { error } = await supabase.from('atividades').insert({
        cliente_id: id,
        tipo: 'nota',
        titulo: 'Nota',
        descricao: texto,
        concluida: true,
        data_realizada: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades', 'cliente', id] });
      setNotaTexto('');
      toast.success('Nota salva!');
    },
    onError: () => toast.error('Erro ao salvar nota'),
  });

  const deleteNota = useMutation({
    mutationFn: async (notaId: string) => {
      const { error } = await supabase.from('atividades').delete().eq('id', notaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades', 'cliente', id] });
      toast.success('Nota excluída');
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!cliente) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <h3 className="text-lg font-medium mb-2">Cliente não encontrado</h3>
          <Link to="/clientes"><Button>Voltar</Button></Link>
        </div>
      </MainLayout>
    );
  }

  const saude = calcularSaude(cliente.ultima_compra_gc ?? null);
  const saudeCfg = saudeConfig[saude];
  const seg = segmentoConfig[cliente.segmento || 'outro'] || segmentoConfig.outro;
  const initials = getInitials(cliente.nome);
  const avatarColor = getAvatarColor(cliente.nome);
  const notas = atividades.filter(a => a.tipo === 'nota');
  const atividadesNaoNotas = atividades.filter(a => a.tipo !== 'nota');
  const oportunidadeAtiva = oportunidades.find(o => !['fechado_ganho', 'fechado_perdido'].includes(o.etapa));

  const propostasAprovadas = propostas.filter(p => (p as any).status === 'aprovada').length;

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const formatDate = (d: string | null | undefined) => {
    if (!d) return 'Nunca';
    return new Date(d).toLocaleDateString('pt-BR');
  };

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-6">
        <Link to="/clientes">
          <Button variant="ghost" size="sm" className="gap-2 mb-3">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </Link>

        <div className="flex items-start gap-4">
          <div className={`h-14 w-14 rounded-full ${avatarColor} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="truncate">{cliente.nome}</h1>
            {cliente.razao_social && <p className="text-sm text-muted-foreground">{cliente.razao_social}</p>}
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{seg.icon} {seg.label}</span>
              {cliente.cidade && <span>· {cliente.cidade}-{cliente.estado}</span>}
            </div>
            <div className="flex gap-2 mt-2">
              <Badge className={`${saudeCfg.color} border-0`}>{saudeCfg.label}</Badge>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {cliente.telefone && (
            <Button variant="outline" size="sm" asChild className="gap-1 flex-shrink-0">
              <a href={`tel:${cliente.telefone}`}><Phone className="h-3.5 w-3.5" /> Ligar</a>
            </Button>
          )}
          {cliente.celular && (
            <Button variant="outline" size="sm" asChild className="gap-1 flex-shrink-0">
              <a href={`https://wa.me/55${cliente.celular.replace(/\D/g, '')}`} target="_blank" rel="noopener">
                <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </Button>
          )}
          {cliente.endereco && (
            <Button variant="outline" size="sm" asChild className="gap-1 flex-shrink-0">
              <a href={`https://maps.google.com?q=${encodeURIComponent(`${cliente.endereco} ${cliente.cidade}`)}`} target="_blank" rel="noopener">
                <MapPin className="h-3.5 w-3.5" /> Maps
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1 flex-shrink-0" onClick={() => navigate(`/clientes/${id}/editar`)}>
            <Edit className="h-3.5 w-3.5" /> Editar
          </Button>
          <WAIButton
            variant="inline"
            contexto={{
              cliente: {
                nome: cliente.nome,
                segmento: cliente.segmento,
                porte: cliente.porte,
                cidade: cliente.cidade,
                estado: cliente.estado,
                ultima_compra: cliente.ultima_compra_gc,
                total_compras: cliente.total_compras_gc,
                observacoes: cliente.observacoes,
              },
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="visao-geral" className="text-xs">📊 Visão Geral</TabsTrigger>
          <TabsTrigger value="oportunidades" className="text-xs">💰 Oportunidades</TabsTrigger>
          <TabsTrigger value="propostas" className="text-xs">📄 Propostas</TabsTrigger>
          <TabsTrigger value="atividades" className="text-xs">📅 Atividades</TabsTrigger>
          <TabsTrigger value="notas" className="text-xs">📝 Notas</TabsTrigger>
        </TabsList>

        {/* TAB 1 - Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-4 mt-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-lg font-bold">{formatCurrency(cliente.total_compras_gc)}</p>
                  <p className="text-xs text-muted-foreground">Total comprado GC</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-lg font-bold">{formatDate(cliente.ultima_compra_gc)}</p>
                  <p className="text-xs text-muted-foreground">Última compra</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-lg font-bold">{propostas.length}</p>
                  <p className="text-xs text-muted-foreground">Propostas enviadas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-lg font-bold">{propostasAprovadas} ({propostas.length > 0 ? Math.round(propostasAprovadas / propostas.length * 100) : 0}%)</p>
                  <p className="text-xs text-muted-foreground">Aprovadas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dados cadastrais */}
          <Card>
            <CardHeader><CardTitle className="text-base">Dados Cadastrais</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">Tipo:</span> {cliente.tipo_pessoa || '-'}</div>
              <div><span className="text-muted-foreground">CNPJ/CPF:</span> {cliente.cnpj || cliente.cpf || '-'}</div>
              <div><span className="text-muted-foreground">Telefone:</span> {cliente.telefone || '-'}</div>
              <div><span className="text-muted-foreground">Celular:</span> {cliente.celular || '-'}</div>
              <div><span className="text-muted-foreground">Email:</span> {cliente.email || '-'}</div>
              <div><span className="text-muted-foreground">Porte:</span> {cliente.porte || '-'}</div>
              <div className="sm:col-span-2"><span className="text-muted-foreground">Endereço:</span> {cliente.endereco || '-'} · {cliente.cidade}-{cliente.estado}</div>
              {cliente.observacoes && (
                <div className="sm:col-span-2"><span className="text-muted-foreground">Obs:</span> {cliente.observacoes}</div>
              )}
            </CardContent>
          </Card>

          {/* Oportunidade ativa */}
          {oportunidadeAtiva && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Oportunidade Ativa</p>
                <p className="font-medium">{oportunidadeAtiva.titulo}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={etapaColors[oportunidadeAtiva.etapa] || 'bg-gray-100'}>{oportunidadeAtiva.etapa}</Badge>
                  <span className="text-sm">{formatCurrency(oportunidadeAtiva.valor_estimado)}</span>
                </div>
                <Button variant="link" size="sm" className="mt-2 px-0" onClick={() => navigate(`/oportunidades/${oportunidadeAtiva.id}`)}>
                  Ver oportunidade →
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Últimas 5 atividades */}
          {atividadesNaoNotas.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Últimas Atividades</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {atividadesNaoNotas.slice(0, 5).map(a => {
                  const cfg = tipoAtividadeLabels[a.tipo] || { label: a.tipo, icon: '📌' };
                  return (
                    <div key={a.id} className="flex items-center gap-3 py-1 text-sm">
                      <span>{cfg.icon}</span>
                      <span className="text-muted-foreground text-xs">{formatDate(a.created_at)}</span>
                      <span className="flex-1 truncate">{a.titulo}</span>
                    </div>
                  );
                })}
                {atividadesNaoNotas.length > 5 && (
                  <Button variant="link" size="sm" className="px-0" onClick={() => setActiveTab('atividades')}>
                    Ver todas →
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2 - Oportunidades */}
        <TabsContent value="oportunidades" className="mt-4">
          {oportunidades.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">💰</span>
              <p className="mt-2 text-muted-foreground">Nenhuma oportunidade cadastrada</p>
              <Button className="mt-4" onClick={() => navigate(`/oportunidades/nova?clienteId=${id}`)}>
                <Plus className="h-4 w-4 mr-2" /> Criar oportunidade
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {oportunidades.map(o => (
                <Card key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/oportunidades/${o.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{o.titulo}</p>
                      <Badge className={etapaColors[o.etapa] || 'bg-gray-100'}>{o.etapa}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{formatCurrency(o.valor_estimado)}</span>
                      <span>· {formatDate(o.created_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button className="w-full mt-2" variant="outline" onClick={() => navigate(`/oportunidades/nova?clienteId=${id}`)}>
                <Plus className="h-4 w-4 mr-2" /> Nova oportunidade
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB 3 - Propostas */}
        <TabsContent value="propostas" className="mt-4">
          {propostas.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">📄</span>
              <p className="mt-2 text-muted-foreground">Nenhuma proposta</p>
              <Button className="mt-4" onClick={() => navigate(`/nova-proposta?clienteId=${id}`)}>
                <Plus className="h-4 w-4 mr-2" /> Nova proposta
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {propostas.map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{p.numero}</span>
                          {p.versao > 1 && <Badge variant="outline" className="text-[10px]">Rev.{p.versao}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{p.titulo}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(p.valor_total || 0)}</p>
                        <Badge className="mt-1" variant="secondary">{p.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 4 - Atividades */}
        <TabsContent value="atividades" className="mt-4">
          <Button className="mb-4 w-full" onClick={() => setShowAtividadeModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Registrar Atividade
          </Button>
          {atividadesNaoNotas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma atividade registrada
            </div>
          ) : (
            <div className="space-y-3">
              {atividadesNaoNotas.map(a => {
                const cfg = tipoAtividadeLabels[a.tipo] || { label: a.tipo, icon: '📌' };
                return (
                  <div key={a.id} className="flex gap-3 border-l-2 border-primary/20 pl-4 py-2">
                    <span className="text-lg">{cfg.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatDate(a.data_prevista || a.created_at)}</span>
                      </div>
                      <p className="font-medium text-sm">{a.titulo}</p>
                      {a.resultado && <p className="text-xs text-muted-foreground mt-1">Resultado: {a.resultado}</p>}
                      {a.proxima_acao && <p className="text-xs text-muted-foreground">Próxima: {a.proxima_acao}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 5 - Notas */}
        <TabsContent value="notas" className="mt-4">
          <div className="flex gap-2 mb-4">
            <Textarea
              value={notaTexto}
              onChange={(e) => setNotaTexto(e.target.value)}
              placeholder="Adicionar nota..."
              className="flex-1"
              rows={2}
            />
            <Button
              onClick={() => notaTexto.trim() && saveNota.mutate(notaTexto.trim())}
              disabled={!notaTexto.trim() || saveNota.isPending}
              className="self-end"
            >
              {saveNota.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </div>
          {notas.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhuma nota</p>
          ) : (
            <div className="space-y-2">
              {notas.map(n => (
                <Card key={n.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{formatDate(n.created_at)}</p>
                        <p className="text-sm whitespace-pre-wrap">{n.descricao}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-6 w-6 p-0"
                        onClick={() => {
                          if (confirm('Excluir esta nota?')) deleteNota.mutate(n.id);
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Nova Atividade */}
      <Dialog open={showAtividadeModal} onOpenChange={setShowAtividadeModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Atividade</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={atividadeForm.tipo} onValueChange={(v) => setAtividadeForm(f => ({ ...f, tipo: v as TipoAtividade }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoAtividadeLabels).filter(([k]) => k !== 'nota').map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título</Label>
              <Input value={atividadeForm.titulo} onChange={(e) => setAtividadeForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={atividadeForm.descricao} onChange={(e) => setAtividadeForm(f => ({ ...f, descricao: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>Data Prevista</Label>
              <Input type="datetime-local" value={atividadeForm.data_prevista} onChange={(e) => setAtividadeForm(f => ({ ...f, data_prevista: e.target.value }))} />
            </div>
            <Button
              className="w-full"
              disabled={!atividadeForm.titulo || saveAtividade.isPending}
              onClick={() => saveAtividade.mutate({
                cliente_id: id,
                tipo: atividadeForm.tipo,
                titulo: atividadeForm.titulo,
                descricao: atividadeForm.descricao || null,
                data_prevista: atividadeForm.data_prevista || null,
              })}
            >
              {saveAtividade.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
