import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  Upload, 
  X,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import logoWedoDefault from '@/assets/logo-wedo.png';

export default function CompanySettings() {
  const { company, updateCompany, setLogo } = useCompany();
  const inputRef = useRef<HTMLInputElement>(null);
  const [newValue, setNewValue] = useState('');

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
      </div>
    </MainLayout>
  );
}
