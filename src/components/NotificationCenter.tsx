import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const TIPO_ICONS: Record<string, string> = {
  proposta_visualizada: '👁️',
  proposta_aprovada: '🏆',
  alerta_oportunidade: '⚠️',
  alerta_proposta: '⏰',
};

type ProposalRealtimeState = {
  aberto_em: string | null;
  aberto_contagem: number;
  status: string | null;
};

export function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const proposalStateRef = useRef<Record<string, ProposalRealtimeState>>({});
  const proposalStateReadyRef = useRef(false);

  const { data: notificacoes = [], refetch } = useQuery({
    queryKey: ['notificacoes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      return (data ?? []) as any[];
    },
    enabled: !!user,
  });

  const naoLidas = notificacoes.filter((n: any) => !n.lida).length;

  useEffect(() => {
    if (!user) {
      proposalStateRef.current = {};
      proposalStateReadyRef.current = false;
      return;
    }

    let cancelled = false;
    proposalStateReadyRef.current = false;

    supabase
      .from('propostas')
      .select('id, aberto_em, aberto_contagem, status')
      .eq('vendedor_id', user.id)
      .then(({ data }) => {
        if (cancelled) return;

        proposalStateRef.current = Object.fromEntries(
          (data ?? []).map((proposta: any) => [
            proposta.id,
            {
              aberto_em: proposta.aberto_em ?? null,
              aberto_contagem: proposta.aberto_contagem ?? 0,
              status: proposta.status ?? null,
            },
          ]),
        );
        proposalStateReadyRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Realtime: listen for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notificacoes-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificacoes',
        filter: `usuario_id=eq.${user.id}`,
      }, (payload) => {
        refetch();
        const n = payload.new as any;
        toast(n.titulo, {
          description: n.descricao,
          duration: 8000,
          action: n.link ? { label: 'Ver →', onClick: () => navigate(n.link) } : undefined,
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Realtime: listen for proposal changes (viewed/approved)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`propostas-vendedor-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'propostas',
        filter: `vendedor_id=eq.${user.id}`,
      }, (payload) => {
        const novo = payload.new as any;
        const anterior = proposalStateRef.current[novo.id];

        proposalStateRef.current[novo.id] = {
          aberto_em: novo.aberto_em ?? null,
          aberto_contagem: novo.aberto_contagem ?? 0,
          status: novo.status ?? null,
        };

        // First view
        if (proposalStateReadyRef.current && !anterior?.aberto_em && novo.aberto_em) {
          toast('👁️ Cliente abriu sua proposta agora!', {
            description: `${novo.numero} — Boa hora de ligar! 📞`,
            duration: 10000,
            action: { label: 'Ver proposta →', onClick: () => navigate(`/propostas/${novo.id}`) },
          });
          // Save notification
          supabase.from('notificacoes').insert({
            usuario_id: user.id,
            tipo: 'proposta_visualizada',
            titulo: `👁️ Proposta ${novo.numero} foi visualizada`,
            descricao: 'O cliente acabou de abrir sua proposta.',
            link: `/propostas/${novo.id}`,
          }).then(() => refetch());
        }

        // Approved
        if (proposalStateReadyRef.current && anterior?.status !== 'aprovada' && novo.status === 'aprovada') {
          toast.success('🏆 PROPOSTA APROVADA!', {
            description: `${novo.numero} aprovada! Valor: R$ ${(novo.valor_total || 0).toLocaleString('pt-BR')}`,
            duration: 15000,
            action: novo.oportunidade_id
              ? { label: 'Ver oportunidade →', onClick: () => navigate(`/oportunidades/${novo.oportunidade_id}`) }
              : undefined,
          });
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          supabase.from('notificacoes').insert({
            usuario_id: user.id,
            tipo: 'proposta_aprovada',
            titulo: `🏆 Proposta ${novo.numero} APROVADA!`,
            descricao: `Valor: R$ ${(novo.valor_total || 0).toLocaleString('pt-BR')}`,
            link: `/propostas/${novo.id}`,
          }).then(() => refetch());
        }

        // Invalidate proposal queries
        queryClient.invalidateQueries({ queryKey: ['propostas'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Realtime: invalidate atividades and oportunidades on changes
  useEffect(() => {
    if (!user) return;

    const chAtiv = supabase
      .channel(`atividades-rt-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atividades', filter: `vendedor_id=eq.${user.id}` },
        () => { queryClient.invalidateQueries({ queryKey: ['atividades'] }); })
      .subscribe();

    const chOps = supabase
      .channel(`oportunidades-rt-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'oportunidades', filter: `vendedor_id=eq.${user.id}` },
        () => { queryClient.invalidateQueries({ queryKey: ['oportunidades'] }); })
      .subscribe();

    return () => {
      supabase.removeChannel(chAtiv);
      supabase.removeChannel(chOps);
    };
  }, [user?.id]);

  const marcarTodasLidas = async () => {
    const ids = notificacoes.filter((n: any) => !n.lida).map((n: any) => n.id);
    if (!ids.length) return;
    await supabase.from('notificacoes').update({ lida: true } as any).in('id', ids);
    refetch();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[340px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Notificações
            {naoLidas > 0 && (
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={marcarTodasLidas}>
                <Check className="h-3.5 w-3.5" /> Marcar lidas
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)] mt-4">
          <div className="space-y-2 pr-2">
            {notificacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhuma notificação</p>
            ) : notificacoes.map((n: any) => (
              <button
                key={n.id}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${n.lida ? 'bg-background' : 'bg-primary/5 border-primary/20'}`}
                onClick={() => {
                  if (!n.lida) {
                    supabase.from('notificacoes').update({ lida: true } as any).eq('id', n.id).then(() => refetch());
                  }
                  if (n.link) { navigate(n.link); setOpen(false); }
                }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg shrink-0">{TIPO_ICONS[n.tipo] || '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.lida ? 'text-foreground' : 'font-medium text-foreground'}`}>{n.titulo}</p>
                    {n.descricao && <p className="text-xs text-muted-foreground mt-0.5">{n.descricao}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                  {n.link && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
