import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProposal } from '@/contexts/ProposalContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  ArrowLeft, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  Calendar,
  DollarSign,
  FileText,
  Phone,
  Mail,
  MapPin,
  Download,
  Loader2
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ProposalPreview } from '@/components/proposal/ProposalPreview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Proposal } from '@/types/proposal';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';

const statusLabels = {
  draft: { label: 'Rascunho', variant: 'secondary' as const },
  sent: { label: 'Enviada', variant: 'default' as const },
  approved: { label: 'Aprovada', variant: 'default' as const },
  rejected: { label: 'Rejeitada', variant: 'destructive' as const },
};

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { proposals, deleteProposal } = useProposal();
  const { company } = useCompany();
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Fetch client from database
  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Filter proposals for this client
  const clientProposals = proposals.filter(p => 
    p.client.name.toLowerCase() === client?.name?.toLowerCase() ||
    (p.client.cnpj && client?.cnpj && p.client.cnpj === client.cnpj)
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleDeleteProposal = (proposalId: string) => {
    deleteProposal(proposalId);
    toast.success('Proposta excluída com sucesso!');
  };

  const handleExportPDF = async () => {
    if (!previewRef.current || !selectedProposal) {
      toast.error('Erro ao gerar PDF. Tente novamente.');
      return;
    }

    setIsExporting(true);
    
    try {
      const element = previewRef.current;
      const fileName = `proposta-${selectedProposal.number}-${selectedProposal.client.name || 'cliente'}.pdf`.replace(/\s+/g, '-').toLowerCase();
      
      const opt = {
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: ['css', 'legacy'], before: '.pdf-page' }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!client) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <h3 className="mb-2 text-lg font-medium">Cliente não encontrado</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            O cliente que você está procurando não existe.
          </p>
          <Link to="/clientes">
            <Button>Voltar para Clientes</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const totalProposalValue = clientProposals.reduce((sum, p) => sum + p.totalValue, 0);
  const approvedProposals = clientProposals.filter(p => p.status === 'approved').length;

  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/clientes">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
            {client.trade_name && (
              <p className="text-muted-foreground">{client.trade_name}</p>
            )}
          </div>
          <Link to={`/nova-proposta?clientId=${client.id}`}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Proposta
            </Button>
          </Link>
        </div>
      </div>

      {/* Client Info Card */}
      <Card className="shadow-card mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Informações do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {client.cnpj && (
              <div>
                <p className="text-sm text-muted-foreground">CNPJ</p>
                <p className="font-medium">{client.cnpj}</p>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{client.email}</p>
                </div>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{client.phone}</p>
                </div>
              </div>
            )}
            {(client.address || client.city) && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="font-medium">
                    {[client.address, client.city, client.state].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            )}
            {client.contact_person && (
              <div>
                <p className="text-sm text-muted-foreground">Contato</p>
                <p className="font-medium">{client.contact_person}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clientProposals.length}</p>
                <p className="text-sm text-muted-foreground">Propostas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/10 p-2">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalProposalValue)}</p>
                <p className="text-sm text-muted-foreground">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/10 p-2">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedProposals}</p>
                <p className="text-sm text-muted-foreground">Aprovadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proposals List */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Histórico de Propostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientProposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mb-4">
                Nenhuma proposta encontrada para este cliente.
              </p>
              <Link to={`/nova-proposta?clientId=${client.id}`}>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Primeira Proposta
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {clientProposals.map((proposal) => (
                <div 
                  key={proposal.id} 
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-primary">{proposal.number}</span>
                      <Badge variant={statusLabels[proposal.status].variant}>
                        {statusLabels[proposal.status].label}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground line-clamp-1">
                      {proposal.title || `Proposta para ${proposal.client.name}`}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(proposal.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(proposal.totalValue)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProposal(proposal)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Link to={`/proposta/${proposal.id}/editar`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
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
                            onClick={() => handleDeleteProposal(proposal.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
        <DialogContent className="max-w-4xl h-[90vh]" aria-describedby="client-preview-description">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>{selectedProposal?.number} - {selectedProposal?.client.name}</span>
              <Button 
                onClick={handleExportPDF} 
                size="sm" 
                className="gap-2"
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExporting ? 'Gerando...' : 'Baixar PDF'}
              </Button>
            </DialogTitle>
            <DialogDescription id="client-preview-description">
              Visualização da proposta comercial
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-full">
            <div className="p-4 bg-muted rounded-lg overflow-auto">
              <div className="transform scale-[0.35] origin-top-left" style={{ width: '285%' }}>
                {selectedProposal && <ProposalPreview ref={previewRef} proposal={selectedProposal} company={company} />}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
