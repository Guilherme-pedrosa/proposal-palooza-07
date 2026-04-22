import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FileText, Search, Plus, Eye, Trash2, Calendar, Building2,
  DollarSign, Edit, ExternalLink, Copy, MoreVertical
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  fetchPropostas, deleteProposta, clonarProposta, updateProposta, STATUS_PROPOSTA, formatBRL,
  type PropostaRow, type StatusProposta,
} from '@/lib/api/propostas';

const statusChips: { value: string; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'rascunho', label: '🟡 Rascunho' },
  { value: 'enviada', label: '🔵 Enviada' },
  { value: 'visualizada', label: '👁️ Visualizada' },
  { value: 'aprovada', label: '🟢 Aprovada' },
  { value: 'recusada', label: '🔴 Recusada' },
  { value: 'expirada', label: '⚫ Expirada' },
];

export default function Proposals() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const { data: propostas = [], isLoading } = useQuery({
    queryKey: ['propostas'],
    queryFn: fetchPropostas,
  });

  const filtered = propostas.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      p.numero.toLowerCase().includes(s) ||
      p.titulo.toLowerCase().includes(s) ||
      p.cliente?.nome?.toLowerCase().includes(s);
    const matchStatus = statusFilter === 'todas' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: string) => {
    await deleteProposta(id);
    queryClient.invalidateQueries({ queryKey: ['propostas'] });
    toast.success('Proposta excluída!');
  };

  const handleClone = async (id: string) => {
    try {
      const nova = await clonarProposta(id);
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
      toast.success('Proposta clonada com sucesso!');
      navigate(`/propostas/${nova.id}`);
    } catch (err: any) {
      toast.error(`Erro ao clonar: ${err.message ?? 'tente novamente'}`);
    }
  };

  const handleStatusChange = async (id: string, status: StatusProposta) => {
    try {
      setUpdatingStatusId(id);
      await updateProposta(id, { status });
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
      toast.success(`Status alterado para ${STATUS_PROPOSTA[status].label.toLowerCase()}.`);
    } catch (err: any) {
      toast.error(`Erro ao atualizar status: ${err.message ?? 'tente novamente'}`);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Propostas</h1>
          <p className="text-sm text-muted-foreground">{propostas.length} proposta{propostas.length !== 1 ? 's' : ''}</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => navigate('/propostas/nova')}>
          <Plus className="h-4 w-4" /> Nova Proposta
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por número, cliente ou título..." className="pl-10" />
      </div>

      {/* Status chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6">
        {statusChips.map((chip) => (
          <button
            key={chip.value}
            onClick={() => setStatusFilter(chip.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === chip.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:bg-accent'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <h3 className="mb-2 text-lg font-medium">Nenhuma proposta encontrada</h3>
            <Button className="gap-2 mt-2" onClick={() => navigate('/propostas/nova')}>
              <Plus className="h-4 w-4" /> Criar Proposta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const st = STATUS_PROPOSTA[p.status as StatusProposta] ?? STATUS_PROPOSTA.rascunho;
            const diasValidade = p.validade_ate ? differenceInDays(new Date(p.validade_ate), new Date()) : null;
            const validadeUrgente = diasValidade !== null && diasValidade <= 3 && diasValidade >= 0;

            return (
              <Card
                key={p.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/propostas/${p.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-primary">{p.numero}</span>
                        {p.versao > 1 && <Badge variant="outline" className="text-[10px]">Rev. {p.versao}</Badge>}
                        <Badge className={`text-[10px] ${st.bg} border-0`}>{st.emoji} {st.label}</Badge>
                      </div>
                      <p className="font-semibold text-foreground mt-1 line-clamp-1">{p.titulo}</p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/propostas/${p.id}`)}>
                            <Edit className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleClone(p.id)}>
                            <Copy className="h-4 w-4 mr-2" /> Clonar proposta
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. A proposta {p.numero} será permanentemente removida.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-destructive hover:bg-destructive/90">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {p.cliente?.nome && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                      <Building2 className="h-3.5 w-3.5" /> {p.cliente.nome}
                    </p>
                  )}

                  {(p.aberto_contagem ?? 0) > 0 && (
                    <p className="text-xs text-purple-600 mb-1">
                      👁️ Visualizada {p.aberto_contagem}x{p.aberto_em ? ` em ${format(new Date(p.aberto_em), 'dd/MM HH:mm', { locale: ptBR })}` : ''}
                      {p.aberto_por_ip && <span className="ml-1 text-muted-foreground">• IP: {p.aberto_por_ip}</span>}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {p.validade_ate && (
                        <span className={validadeUrgente ? 'text-red-600 font-medium' : ''}>
                          Válida até: {format(new Date(p.validade_ate), 'dd/MM', { locale: ptBR })}
                          {diasValidade !== null && diasValidade >= 0 && ` (${diasValidade}d)`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <label className="sr-only" htmlFor={`status-${p.id}`}>Alterar status da proposta</label>
                      <select
                        id={`status-${p.id}`}
                        value={(p.status as StatusProposta) ?? 'rascunho'}
                        disabled={updatingStatusId === p.id}
                        onChange={(e) => handleStatusChange(p.id, e.target.value as StatusProposta)}
                        className="h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground outline-none transition-colors focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {Object.entries(STATUS_PROPOSTA).map(([value, meta]) => (
                          <option key={value} value={value}>
                            {meta.emoji} {meta.label}
                          </option>
                        ))}
                      </select>
                      <span className="font-semibold text-sm whitespace-nowrap">{formatBRL(p.valor_total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </MainLayout>
  );
}
