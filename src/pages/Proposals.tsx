import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProposal } from '@/contexts/ProposalContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Search, 
  Plus, 
  Eye, 
  Trash2,
  Calendar,
  Building2,
  DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProposalPreview } from '@/components/proposal/ProposalPreview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Proposal } from '@/types/proposal';

const statusLabels = {
  draft: { label: 'Rascunho', variant: 'secondary' as const },
  sent: { label: 'Enviada', variant: 'default' as const },
  approved: { label: 'Aprovada', variant: 'default' as const },
  rejected: { label: 'Rejeitada', variant: 'destructive' as const },
};

export default function Proposals() {
  const { proposals, deleteProposal } = useProposal();
  const { company } = useCompany();
  const [search, setSearch] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredProposals = proposals.filter((proposal) => {
    const searchLower = search.toLowerCase();
    return (
      proposal.number.toLowerCase().includes(searchLower) ||
      proposal.client.name.toLowerCase().includes(searchLower) ||
      proposal.title?.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = (id: string) => {
    deleteProposal(id);
    toast.success('Proposta excluída com sucesso!');
  };

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Propostas</h1>
          <p className="text-sm text-muted-foreground">
            {proposals.length} proposta{proposals.length !== 1 ? 's' : ''} cadastrada{proposals.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/nova-proposta">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Nova Proposta
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número, cliente ou título..."
          className="pl-10"
        />
      </div>

      {/* Proposals List */}
      {filteredProposals.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-16 w-16 text-muted-foreground/30" />
            {proposals.length === 0 ? (
              <>
                <h3 className="mb-2 text-lg font-medium">Nenhuma proposta cadastrada</h3>
                <p className="mb-4 text-center text-sm text-muted-foreground">
                  Comece criando sua primeira proposta comercial.
                </p>
                <Link to="/nova-proposta">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Proposta
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <h3 className="mb-2 text-lg font-medium">Nenhum resultado encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  Tente buscar com outros termos.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProposals.map((proposal) => (
            <Card key={proposal.id} className="shadow-card hover:shadow-card-lg transition-shadow animate-fade-in">
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">{proposal.number}</p>
                    <h3 className="font-semibold text-foreground line-clamp-1">
                      {proposal.title || `Proposta para ${proposal.client.name}`}
                    </h3>
                  </div>
                  <Badge variant={statusLabels[proposal.status].variant}>
                    {statusLabels[proposal.status].label}
                  </Badge>
                </div>

                <div className="mb-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="line-clamp-1">{proposal.client.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(proposal.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium text-foreground">
                      {formatCurrency(proposal.totalValue)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => setSelectedProposal(proposal)}
                  >
                    <Eye className="h-4 w-4" />
                    Ver
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A proposta {proposal.number} será permanentemente excluída.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(proposal.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedProposal?.number} - {selectedProposal?.client.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-full">
            <div className="p-4 bg-muted rounded-lg">
              <div className="transform scale-50 origin-top-left" style={{ width: '200%' }}>
                {selectedProposal && <ProposalPreview proposal={selectedProposal} company={company} />}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
