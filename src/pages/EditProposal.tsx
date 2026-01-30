import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientForm } from '@/components/proposal/ClientForm';
import { ProductsForm } from '@/components/proposal/ProductsForm';
import { TermsConditionsForm } from '@/components/proposal/TermsConditionsForm';
import { ImagesForm } from '@/components/proposal/ImagesForm';
import { ProposalPreview } from '@/components/proposal/ProposalPreview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Client, Product, TermCondition, ProposalImage } from '@/types/proposal';
import { useProposal } from '@/contexts/ProposalContext';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { 
  FileText, 
  Eye, 
  Save, 
  Building2,
  Calendar,
  Settings,
  ArrowLeft,
  Download,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { openPrintWindow } from '@/lib/printProposal';

const statusOptions = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'sent', label: 'Enviada' },
  { value: 'approved', label: 'Aprovada' },
  { value: 'rejected', label: 'Rejeitada' },
];

export default function EditProposal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { proposals, updateProposal } = useProposal();
  const { company } = useCompany();
  const previewRef = useRef<HTMLDivElement>(null);

  const proposal = proposals.find(p => p.id === id);

  const [activeTab, setActiveTab] = useState('info');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [status, setStatus] = useState<'draft' | 'sent' | 'approved' | 'rejected'>('draft');
  const [client, setClient] = useState<Client>({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    cnpj: '',
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [termsConditions, setTermsConditions] = useState<TermCondition[]>([]);
  const [images, setImages] = useState<ProposalImage[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();

  // Load proposal data
  useEffect(() => {
    if (proposal) {
      setTitle(proposal.title || '');
      setDescription(proposal.description || '');
      setValidUntil(proposal.validUntil ? new Date(proposal.validUntil).toISOString().split('T')[0] : '');
      setStatus(proposal.status);
      setClient(proposal.client);
      setProducts(proposal.products || []);
      setTermsConditions(proposal.termsConditions || []);
      setImages(proposal.images || []);
    }
  }, [proposal]);

  if (!proposal) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <h3 className="mb-2 text-lg font-medium">Proposta não encontrada</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            A proposta que você está procurando não existe.
          </p>
          <Link to="/propostas">
            <Button>Voltar para Propostas</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const proposalData = {
    ...proposal,
    title,
    description,
    validUntil: validUntil ? new Date(validUntil) : undefined,
    client,
    products,
    termsConditions,
    images,
    totalValue: products.reduce((sum, p) => sum + p.totalPrice, 0),
    status,
  };

  const handleSave = () => {
    if (!client.name) {
      toast.error('Por favor, informe o nome do cliente.');
      return;
    }

    if (products.length === 0) {
      toast.error('Adicione pelo menos um produto ou serviço.');
      return;
    }

    updateProposal(proposal.id, {
      title: title || `Proposta para ${client.name}`,
      description,
      validUntil: validUntil ? new Date(validUntil) : proposal.validUntil,
      client,
      products,
      termsConditions,
      images,
      totalValue: products.reduce((sum, p) => sum + p.totalPrice, 0),
      status,
    });

    toast.success('Proposta atualizada com sucesso!');
    navigate('/propostas');
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    openPrintWindow(proposalData, company);
    toast.success('Janela de impressão aberta! Use "Salvar como PDF" para exportar.');
    setTimeout(() => setIsExporting(false), 1000);
  };

  return (
    <MainLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/propostas">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Editar Proposta</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[88px]">
            Proposta nº <span className="font-medium text-primary">{proposal.number}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <Button variant="outline" className="gap-2" onClick={() => setIsPreviewOpen(true)}>
              <Eye className="h-4 w-4" />
              Visualizar
            </Button>
            <DialogContent className="max-w-4xl h-[90vh]" aria-describedby="edit-preview-description">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between pr-8">
                  Preview da Proposta
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
                <DialogDescription id="edit-preview-description">
                  Visualização da proposta comercial
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-full">
                <div className="p-4 bg-muted rounded-lg overflow-auto">
                  <div className="transform scale-[0.35] origin-top-left" style={{ width: '285%' }}>
                    <ProposalPreview ref={previewRef} proposal={proposalData} company={company} />
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Alterações
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="info" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Proposta</span>
          </TabsTrigger>
          <TabsTrigger value="client" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Cliente</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            Produtos
          </TabsTrigger>
          <TabsTrigger value="terms" className="gap-2">
            Termos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          {/* Company Info Banner */}
          <Card className="shadow-card animate-fade-in border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{company.name}</p>
                    <p className="text-sm text-muted-foreground">{company.phone} • {company.cnpj}</p>
                  </div>
                </div>
                <Link to="/configuracoes">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Editar
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Proposal Info */}
          <Card className="shadow-card animate-fade-in">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Informações da Proposta
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Título da Proposta</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Serviços de Manutenção Preventiva"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição geral da proposta..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Válida até
                </Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value: 'draft' | 'sent' | 'approved' | 'rejected') => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <ImagesForm images={images} onChange={setImages} />
        </TabsContent>

        <TabsContent value="client">
          <ClientForm 
            client={client} 
            onChange={setClient}
            selectedClientId={selectedClientId}
            onClientIdChange={setSelectedClientId}
          />
        </TabsContent>

        <TabsContent value="products">
          <ProductsForm products={products} onChange={setProducts} />
        </TabsContent>

        <TabsContent value="terms">
          <TermsConditionsForm
            selectedTerms={termsConditions}
            onChange={setTermsConditions}
          />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
