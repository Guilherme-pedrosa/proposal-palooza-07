import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCompany } from '@/contexts/CompanyContext';
import { useGC } from '@/contexts/GCContext';
import { useTheme } from '@/hooks/useTheme';
import { CompanyClient, CompanyBrand } from '@/types/company';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Building2, 
  Upload, 
  X,
  Save,
  Plus,
  Trash2,
  Users,
  Package,
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2,
  Key,
  Moon,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';
import logoWedoDefault from '@/assets/logo-wedo.png';

export default function CompanySettings() {
  const { company, updateCompany, setLogo } = useCompany();
  const { theme, toggleTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const clientLogoInputRef = useRef<HTMLInputElement>(null);
  const brandLogoInputRef = useRef<HTMLInputElement>(null);
  const [newValue, setNewValue] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogo(event.target?.result as string);
      toast.success('Logo atualizada!');
    };
    reader.readAsDataURL(file);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    toast.success('Logo removida. Usando logo padrão.');
  };

  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!');
  };

  const addValue = () => {
    if (newValue.trim()) {
      updateCompany({ values: [...company.values, newValue.trim()] });
      setNewValue('');
    }
  };

  const removeValue = (index: number) => {
    updateCompany({ values: company.values.filter((_, i) => i !== index) });
  };

  const addClient = () => {
    if (newClientName.trim()) {
      const newClient: CompanyClient = {
        id: crypto.randomUUID(),
        name: newClientName.trim(),
        logo: null,
      };
      updateCompany({ clients: [...(company.clients || []), newClient] });
      setNewClientName('');
      toast.success('Cliente adicionado!');
    }
  };

  const removeClient = (id: string) => {
    updateCompany({ clients: (company.clients || []).filter((c) => c.id !== id) });
    toast.success('Cliente removido!');
  };

  const handleClientLogoChange = (e: React.ChangeEvent<HTMLInputElement>, clientId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const updatedClients = (company.clients || []).map((c) =>
        c.id === clientId ? { ...c, logo: event.target?.result as string } : c
      );
      updateCompany({ clients: updatedClients });
      toast.success('Logo do cliente atualizada!');
    };
    reader.readAsDataURL(file);
    setEditingClientId(null);
  };

  const addBrand = () => {
    if (newBrandName.trim()) {
      const newBrand: CompanyBrand = {
        id: crypto.randomUUID(),
        name: newBrandName.trim(),
        logo: null,
      };
      updateCompany({ brands: [...(company.brands || []), newBrand] });
      setNewBrandName('');
      toast.success('Marca adicionada!');
    }
  };

  const removeBrand = (id: string) => {
    updateCompany({ brands: (company.brands || []).filter((b) => b.id !== id) });
    toast.success('Marca removida!');
  };

  const handleBrandLogoChange = (e: React.ChangeEvent<HTMLInputElement>, brandId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const updatedBrands = (company.brands || []).map((b) =>
        b.id === brandId ? { ...b, logo: event.target?.result as string } : b
      );
      updateCompany({ brands: updatedBrands });
      toast.success('Logo da marca atualizada!');
    };
    reader.readAsDataURL(file);
    setEditingBrandId(null);
  };

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações da Empresa</h1>
          <p className="text-sm text-muted-foreground">
            Configure as informações que aparecerão em todas as propostas.
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2 w-full sm:w-auto">
          <Save className="h-4 w-4" />
          Salvar Alterações
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Logo */}
        <Card className="shadow-card animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-primary" />
              Logo da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-32 w-64 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-white">
                  <img 
                    src={company.logo || logoWedoDefault} 
                    alt="Logo da empresa" 
                    className="max-h-28 max-w-60 object-contain"
                  />
                </div>
                {company.logo && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 h-7 w-7 p-0 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {company.logo ? 'Trocar Logo' : 'Enviar Logo'}
                </Button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
              <p className="text-xs text-muted-foreground text-center">
                PNG ou JPG. Recomendado: fundo transparente, alta resolução.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dados da Empresa */}
        <Card className="shadow-card animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Empresa *</Label>
              <Input
                id="name"
                value={company.name}
                onChange={(e) => updateCompany({ name: e.target.value })}
                placeholder="Nome da empresa"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={company.cnpj}
                  onChange={(e) => updateCompany({ cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={company.phone}
                  onChange={(e) => updateCompany({ phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={company.email}
                onChange={(e) => updateCompany({ email: e.target.value })}
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={company.address}
                onChange={(e) => updateCompany({ address: e.target.value })}
                placeholder="Endereço completo"
              />
            </div>
          </CardContent>
        </Card>

        {/* Visão */}
        <Card className="shadow-card animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Visão</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={company.vision}
              onChange={(e) => updateCompany({ vision: e.target.value })}
              placeholder="Qual é a visão da sua empresa?"
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Missão */}
        <Card className="shadow-card animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Missão</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={company.mission}
              onChange={(e) => updateCompany({ mission: e.target.value })}
              placeholder="Qual é a missão da sua empresa?"
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Valores */}
        <Card className="shadow-card animate-fade-in lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Valores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {company.values.map((value, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                >
                  <span>{value}</span>
                  <button
                    onClick={() => removeValue(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Adicionar novo valor..."
                onKeyDown={(e) => e.key === 'Enter' && addValue()}
              />
              <Button onClick={addValue} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Principais Clientes */}
        <Card className="shadow-card animate-fade-in lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Principais Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione os logos dos seus principais clientes para exibir na proposta comercial.
            </p>
            
            {/* Lista de clientes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
              {(company.clients || []).map((client) => (
                <div
                  key={client.id}
                  className="relative group rounded-lg border bg-white p-3 flex flex-col items-center"
                >
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeClient(client.id)}
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  
                  <div 
                    className="h-16 w-full flex items-center justify-center cursor-pointer hover:bg-muted/50 rounded transition-colors"
                    onClick={() => {
                      setEditingClientId(client.id);
                      setTimeout(() => clientLogoInputRef.current?.click(), 0);
                    }}
                  >
                    {client.logo ? (
                      <img 
                        src={client.logo} 
                        alt={client.name} 
                        className="max-h-14 max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground">
                        <Upload className="h-6 w-6 mb-1" />
                        <span className="text-xs">Add logo</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-center mt-2 font-medium truncate w-full">{client.name}</p>
                </div>
              ))}
            </div>

            {/* Input hidden para upload de logo do cliente */}
            <input
              ref={clientLogoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => editingClientId && handleClientLogoChange(e, editingClientId)}
            />

            {/* Adicionar novo cliente */}
            <div className="flex gap-2">
              <Input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Nome do cliente..."
                onKeyDown={(e) => e.key === 'Enter' && addClient()}
              />
              <Button onClick={addClient} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Principais Marcas */}
        <Card className="shadow-card animate-fade-in lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-primary" />
              Principais Marcas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione os logos das principais marcas que você trabalha para exibir na proposta comercial.
            </p>
            
            {/* Lista de marcas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
              {(company.brands || []).map((brand) => (
                <div
                  key={brand.id}
                  className="relative group rounded-lg border bg-white p-3 flex flex-col items-center"
                >
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeBrand(brand.id)}
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  
                  <div 
                    className="h-16 w-full flex items-center justify-center cursor-pointer hover:bg-muted/50 rounded transition-colors"
                    onClick={() => {
                      setEditingBrandId(brand.id);
                      setTimeout(() => brandLogoInputRef.current?.click(), 0);
                    }}
                  >
                    {brand.logo ? (
                      <img 
                        src={brand.logo} 
                        alt={brand.name} 
                        className="max-h-14 max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground">
                        <Upload className="h-6 w-6 mb-1" />
                        <span className="text-xs">Add logo</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-center mt-2 font-medium truncate w-full">{brand.name}</p>
                </div>
              ))}
            </div>

            {/* Input hidden para upload de logo da marca */}
            <input
              ref={brandLogoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => editingBrandId && handleBrandLogoChange(e, editingBrandId)}
            />

            {/* Adicionar nova marca */}
            <div className="flex gap-2">
              <Input
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Nome da marca..."
                onKeyDown={(e) => e.key === 'Enter' && addBrand()}
              />
              <Button onClick={addBrand} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Aparência */}
        <Card className="shadow-card animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              {theme === 'dark' ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
              Aparência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Modo Escuro</p>
                <p className="text-xs text-muted-foreground">Alternar entre tema claro e escuro</p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                aria-label="Alternar modo escuro"
              />
            </div>
          </CardContent>
        </Card>

        {/* GestãoClick Integration */}
        <GCSection />
      </div>
    </MainLayout>
  );
}

function GCSection() {
  const { isSyncingClientes, isSyncingProdutos, lastSyncClientes, lastSyncProdutos, syncClientes, syncProdutos, testarConexao } = useGC();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  const handleTest = async () => {
    setTestStatus('testing');
    const res = await testarConexao();
    setTestStatus(res.ok ? 'ok' : 'error');
    setTestMsg(res.mensagem);
    toast[res.ok ? 'success' : 'error'](res.mensagem);
  };

  const fmt = (d: Date | null) => d ? d.toLocaleString('pt-BR') : 'Nunca';

  return (
    <Card className="shadow-card animate-fade-in lg:col-span-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="h-5 w-5 text-primary" />
          Integração GestãoClick
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection test */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            {testStatus === 'testing' && <Loader2 className="h-4 w-4 animate-spin" />}
            {testStatus === 'ok' && <Wifi className="h-4 w-4 text-green-600" />}
            {testStatus === 'error' && <WifiOff className="h-4 w-4 text-red-600" />}
            {testStatus === 'idle' && <Wifi className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm">{testMsg || 'Clique para testar a conexão'}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleTest} disabled={testStatus === 'testing'}>
            🔌 Testar Conexão
          </Button>
        </div>

        {/* Sync buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5"><Users className="h-4 w-4" /> Clientes</p>
            <p className="text-xs text-muted-foreground">Última sync: {fmt(lastSyncClientes)}</p>
            <Button size="sm" className="w-full gap-1.5" onClick={syncClientes} disabled={isSyncingClientes}>
              {isSyncingClientes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {isSyncingClientes ? 'Sincronizando...' : 'Sincronizar Clientes'}
            </Button>
          </div>
          <div className="p-3 rounded-lg border space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5"><Package className="h-4 w-4" /> Produtos</p>
            <p className="text-xs text-muted-foreground">Última sync: {fmt(lastSyncProdutos)}</p>
            <Button size="sm" className="w-full gap-1.5" onClick={syncProdutos} disabled={isSyncingProdutos}>
              {isSyncingProdutos ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {isSyncingProdutos ? 'Sincronizando...' : 'Sincronizar Produtos'}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          As credenciais da API GestãoClick são gerenciadas de forma segura no backend. 
          Para atualizar os tokens, entre em contato com o administrador.
        </p>
      </CardContent>
    </Card>
  );
}
