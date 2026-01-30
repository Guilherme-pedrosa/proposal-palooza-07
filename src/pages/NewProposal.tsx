import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientForm } from '@/components/proposal/ClientForm';
import { ProductsForm } from '@/components/proposal/ProductsForm';
import { TermsConditionsForm } from '@/components/proposal/TermsConditionsForm';
import { ImagesForm } from '@/components/proposal/ImagesForm';
import { ProposalPreview } from '@/components/proposal/ProposalPreview';
import { TemplateSelector } from '@/components/proposal/TemplateSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Client, Product, TermCondition, ProposalImage, Proposal } from '@/types/proposal';
import { ProposalTemplate } from '@/types/proposalTemplate';
import { useProposal } from '@/contexts/ProposalContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  FileText, 
  Eye, 
  Save, 
  Building2,
  Calendar,
  Settings,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function NewProposal() {
  const navigate = useNavigate();
  const { addProposal, generateProposalNumber } = useProposal();
  const { company } = useCompany();
  const previewRef = useRef<HTMLDivElement>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<ProposalTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Form state
  const [proposalNumber] = useState(() => generateProposalNumber());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [client, setClient] = useState<Client>({
    id: crypto.randomUUID(),
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

  const proposalData: Partial<Proposal> & { templateId?: string } = {
    number: proposalNumber,
    title,
    description,
    createdAt: new Date(),
    validUntil: validUntil ? new Date(validUntil) : undefined,
    client,
    products,
    termsConditions,
    images,
    totalValue: products.reduce((sum, p) => sum + p.totalPrice, 0),
    companyName: company.name,
    companyPhone: company.phone,
    companyEmail: company.email,
    status: 'draft',
    templateId: selectedTemplate?.id,
  };

  const handleSelectTemplate = (template: ProposalTemplate) => {
    setSelectedTemplate(template);
    // Pre-fill title and description based on template
    if (!title) {
      setTitle(template.defaultTitle);
    }
    if (!description) {
      setDescription(template.defaultDescription);
    }
    // Pre-fill products based on template
    if (products.length === 0 && template.defaultProducts.length > 0) {
      const defaultProducts: Product[] = template.defaultProducts.map((dp) => ({
        id: crypto.randomUUID(),
        name: dp.name,
        description: dp.description,
        unit: dp.unit,
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        discount: 0,
        discountNote: '',
      }));
      setProducts(defaultProducts);
    }
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

    const proposal: Proposal = {
      id: crypto.randomUUID(),
      number: proposalNumber,
      title: title || `Proposta para ${client.name}`,
      description,
      createdAt: new Date(),
      validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      client,
      products,
      termsConditions,
      images,
      totalValue: products.reduce((sum, p) => sum + p.totalPrice, 0),
      companyName: company.name,
      companyPhone: company.phone,
      companyEmail: company.email,
      status: 'draft',
    };

    addProposal(proposal);
    toast.success('Proposta salva com sucesso!');
    navigate('/propostas');
  };

  // Show template selector if no template selected
  if (!selectedTemplate) {
    return (
      <MainLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Nova Proposta</h1>
          <p className="text-sm text-muted-foreground">
            Escolha o modelo de proposta para começar
          </p>
        </div>

        <TemplateSelector 
          selectedTemplate={selectedTemplate} 
          onSelect={handleSelectTemplate} 
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Nova Proposta</h1>
            <span 
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ 
                backgroundColor: `${selectedTemplate.color}20`,
                color: selectedTemplate.color,
              }}
            >
              {selectedTemplate.icon} {selectedTemplate.name}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Proposta nº <span className="font-medium text-primary">{proposalNumber}</span>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setSelectedTemplate(null)}
              className="text-xs ml-2 h-auto p-0"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Trocar modelo
            </Button>
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                Visualizar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh]">
              <DialogHeader>
                <DialogTitle>Preview da Proposta</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-full">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="transform scale-50 origin-top-left" style={{ width: '200%' }}>
                    <ProposalPreview ref={previewRef} proposal={proposalData} company={company} />
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Proposta
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
