import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { fetchVisitasCliente, formatDuracao, type VisitaRow } from '@/lib/api/visitas';
import { formatBRL } from '@/lib/api/oportunidades';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MapPin, Clock, Star, CheckCircle2, Package, FileText,
  DollarSign, Wrench, ShoppingCart, CalendarDays
} from 'lucide-react';

interface ClienteHistoricoPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNome: string;
  gcId?: string;
}

interface TimelineItem {
  id: string;
  tipo: 'visita' | 'venda' | 'orcamento' | 'os';
  data: string;
  titulo: string;
  detalhes?: string;
  valor?: number;
  produtos?: string[];
  resultado?: string;
  duracao?: number;
  satisfacao?: number;
}

const resultadoLabels: Record<string, { label: string; icon: string }> = {
  positivo: { label: 'Positivo', icon: '✅' },
  neutro: { label: 'Neutro', icon: '🔄' },
  negativo: { label: 'Negativo', icon: '❌' },
  ausente: { label: 'Ausente', icon: '🚫' },
  demo_realizada: { label: 'Demo realizada', icon: '🍳' },
  proposta_entregue: { label: 'Proposta entregue', icon: '📄' },
  vistoria_tecnica: { label: 'Vistoria técnica', icon: '🔧' },
};

const tipoConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  visita: { label: 'Visita', icon: <MapPin className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  venda: { label: 'Venda', icon: <ShoppingCart className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  orcamento: { label: 'Orçamento', icon: <FileText className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  os: { label: 'Ordem de Serviço', icon: <Wrench className="h-3.5 w-3.5" />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

export function ClienteHistoricoPanel({ open, onOpenChange, clienteId, clienteNome, gcId }: ClienteHistoricoPanelProps) {
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const items: TimelineItem[] = [];

      // 1. Visitas CRM
      try {
        const visitas = await fetchVisitasCliente(clienteId);
        visitas
          .filter(v => v.status === 'concluida')
          .forEach(v => {
            items.push({
              id: `visita-${v.id}`,
              tipo: 'visita',
              data: v.checkout_at || v.checkin_at || v.created_at,
              titulo: `Visita — ${resultadoLabels[v.resultado || '']?.label || v.resultado || 'Concluída'}`,
              detalhes: v.observacoes || undefined,
              resultado: v.resultado || undefined,
              duracao: v.duracao_minutos || undefined,
              satisfacao: v.satisfacao || undefined,
            });
          });
      } catch { /* ignore */ }

      // 2. Histórico GestãoClick
      if (gcId) {
        try {
          const { data } = await supabase.functions.invoke('gc-buscar-historico-cliente', {
            body: { gc_cliente_id: gcId },
          });

          const extractProdutos = (entry: any) => {
            const items = entry.produtos || entry.itens || [];
            return items.map((p: any) => {
              // GC wraps each item in { produto: { nome_produto, ... } } or { servico: { nome_servico, ... } }
              const inner = p.produto || p.servico || p;
              return inner.nome_produto || inner.nome_servico || inner.descricao || inner.nome || inner.detalhes || 'Produto';
            }).slice(0, 5);
          };

          // Vendas
          (data?.vendas || []).forEach((v: any) => {
            const prods = extractProdutos(v);
            // Also include servicos if present
            const servicos = (v.servicos || []).map((s: any) => {
              const inner = s.servico || s;
              return inner.nome_servico || inner.descricao || inner.nome || 'Serviço';
            }).slice(0, 3);
            const allProds = [...prods, ...servicos];
            items.push({
              id: `venda-${v.id}`,
              tipo: 'venda',
              data: v.data || v.created_at || '',
              titulo: `Venda #${v.numero || v.id}`,
              valor: parseFloat(v.valor_total) || 0,
              produtos: allProds.length > 0 ? allProds : undefined,
            });
          });

          // Orçamentos
          (data?.orcamentos || []).forEach((o: any) => {
            const prods = extractProdutos(o);
            const servicos = (o.servicos || []).map((s: any) => {
              const inner = s.servico || s;
              return inner.nome_servico || inner.descricao || inner.nome || 'Serviço';
            }).slice(0, 3);
            const allProds = [...prods, ...servicos];
            items.push({
              id: `orc-${o.id}`,
              tipo: 'orcamento',
              data: o.data || o.created_at || '',
              titulo: `Orçamento #${o.numero || o.id}`,
              valor: parseFloat(o.valor_total) || 0,
              produtos: prods.length > 0 ? prods : undefined,
            });
          });
        } catch { /* ignore */ }
      }

      // Sort by date descending
      items.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      if (!cancelled) {
        setTimeline(items);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [open, clienteId, gcId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Histórico — {clienteNome}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-4">
            {loading ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : timeline.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhum histórico encontrado</p>
                <p className="text-xs mt-1">Visitas e transações aparecerão aqui</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

                <div className="space-y-4">
                  {timeline.map((item) => {
                    const cfg = tipoConfig[item.tipo];
                    const resLabel = item.resultado ? resultadoLabels[item.resultado] : null;
                    return (
                      <div key={item.id} className="relative pl-8">
                        {/* Dot */}
                        <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-background ${
                          item.tipo === 'visita' ? 'bg-green-500' :
                          item.tipo === 'venda' ? 'bg-blue-500' :
                          item.tipo === 'orcamento' ? 'bg-amber-500' :
                          'bg-purple-500'
                        }`} />

                        <div className="bg-card border rounded-lg p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 ${cfg.color}`}>
                                {cfg.icon} {cfg.label}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {item.data ? format(new Date(item.data), "dd/MM/yy", { locale: ptBR }) : '-'}
                            </span>
                          </div>

                          <p className="text-xs font-medium">{item.titulo}</p>

                          {/* Produtos/equipamentos */}
                          {item.produtos && item.produtos.length > 0 && (
                            <div className="space-y-0.5">
                              {item.produtos.map((p, i) => (
                                <p key={i} className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Package className="h-3 w-3 shrink-0" /> {p}
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Valor */}
                          {item.valor !== undefined && item.valor > 0 && (
                            <p className="text-xs font-medium flex items-center gap-1">
                              <DollarSign className="h-3 w-3" /> {formatBRL(item.valor)}
                            </p>
                          )}

                          {/* Visita details */}
                          {item.tipo === 'visita' && (
                            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                              {item.duracao && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" /> {formatDuracao(item.duracao)}
                                </span>
                              )}
                              {item.satisfacao && (
                                <span className="flex items-center gap-0.5">
                                  {Array.from({ length: item.satisfacao }).map((_, i) => (
                                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  ))}
                                </span>
                              )}
                              {resLabel && <span>{resLabel.icon} {resLabel.label}</span>}
                            </div>
                          )}

                          {/* Observações */}
                          {item.detalhes && (
                            <p className="text-[11px] text-muted-foreground italic line-clamp-2">"{item.detalhes}"</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/** Compact summary for InfoWindow (last 3 items) */
export function HistoricoResumo({
  clienteId,
  gcId,
  onVerTudo,
}: {
  clienteId: string;
  gcId?: string;
  onVerTudo: () => void;
}) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result: TimelineItem[] = [];

      try {
        const visitas = await fetchVisitasCliente(clienteId);
        visitas
          .filter(v => v.status === 'concluida')
          .slice(0, 3)
          .forEach(v => {
            result.push({
              id: `v-${v.id}`,
              tipo: 'visita',
              data: v.checkout_at || v.checkin_at || v.created_at,
              titulo: `Visita — ${resultadoLabels[v.resultado || '']?.label || 'Concluída'}`,
              duracao: v.duracao_minutos || undefined,
            });
          });
      } catch { /* */ }

      if (gcId) {
        try {
          const { data } = await supabase.functions.invoke('gc-buscar-historico-cliente', {
            body: { gc_cliente_id: gcId },
          });
          (data?.vendas || []).slice(0, 2).forEach((v: any) => {
            result.push({
              id: `vd-${v.id}`,
              tipo: 'venda',
              data: v.data || '',
              titulo: `Venda #${v.numero || v.id}`,
              valor: parseFloat(v.valor_total) || 0,
            });
          });
        } catch { /* */ }
      }

      result.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      if (!cancelled) {
        setItems(result.slice(0, 3));
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [clienteId, gcId]);

  if (loading) return <p className="text-[10px]" style={{ color: '#9CA3AF' }}>Carregando histórico...</p>;
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold mb-1" style={{ color: '#6B7280' }}>📋 ÚLTIMAS INTERAÇÕES</p>
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-1.5 py-0.5" style={{ fontSize: '10px', color: '#374151' }}>
          <span>{item.tipo === 'visita' ? '📍' : item.tipo === 'venda' ? '🛒' : '📄'}</span>
          <span className="truncate flex-1">{item.titulo}</span>
          <span style={{ color: '#9CA3AF' }}>
            {item.data ? format(new Date(item.data), 'dd/MM', { locale: ptBR }) : ''}
          </span>
        </div>
      ))}
      <button
        onClick={onVerTudo}
        className="text-[10px] mt-1 underline"
        style={{ color: '#0066FF' }}
      >
        Ver histórico completo →
      </button>
    </div>
  );
}
