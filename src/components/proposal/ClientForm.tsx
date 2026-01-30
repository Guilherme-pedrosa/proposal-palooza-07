import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Client } from '@/types/proposal';
import { Building2, Search, Loader2, Plus, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { clientsApi, Client as DBClient } from '@/lib/api/clients';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface ClientFormProps {
  client: Client;
  onChange: (client: Client) => void;
  selectedClientId?: string;
  onClientIdChange?: (clientId: string | undefined) => void;
}

export function ClientForm({ client, onChange, selectedClientId, onClientIdChange }: ClientFormProps) {
  const [isLookingUp, setIsLookingUp] = useState(false);
  
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
  });

  const handleChange = (field: keyof Client, value: string) => {
    onChange({ ...client, [field]: value });
  };

  const handleSelectClient = (clientId: string) => {
    if (clientId === 'new') {
      // Reset form for new client
      onClientIdChange?.(undefined);
      onChange({
        id: crypto.randomUUID(),
        name: '',
        email: '',
        phone: '',
        address: '',
        cnpj: '',
      });
      return;
    }

    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      onClientIdChange?.(clientId);
      onChange({
        id: selectedClient.id,
        name: selectedClient.name,
        email: selectedClient.email || '',
        phone: selectedClient.phone || '',
        address: selectedClient.address || '',
        cnpj: selectedClient.cnpj || '',
      });
    }
  };

  const handleLookupCNPJ = async () => {
    if (!client.cnpj) {
      toast.error('Digite o CNPJ para consultar');
      return;
    }

    setIsLookingUp(true);
    try {
      // First check if client already exists in database
      const existingClient = await clientsApi.getByCNPJ(client.cnpj);
      if (existingClient) {
        onClientIdChange?.(existingClient.id);
        onChange({
          id: existingClient.id,
          name: existingClient.name,
          email: existingClient.email || '',
          phone: existingClient.phone || '',
          address: existingClient.address || '',
          cnpj: existingClient.cnpj || '',
        });
        toast.success('Cliente encontrado no cadastro!');
        return;
      }

      // If not found, lookup via API
      const data = await clientsApi.lookupCNPJ(client.cnpj);
      
      onChange({
        ...client,
        name: data.razao_social || client.name,
        email: data.email || client.email,
        phone: data.telefone || client.phone,
        address: `${data.logradouro}${data.numero ? `, ${data.numero}` : ''}${data.complemento ? ` - ${data.complemento}` : ''} - ${data.bairro} - ${data.municipio}/${data.uf}`,
        cnpj: data.cnpj,
      });
      
      toast.success('Dados do CNPJ carregados!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao consultar CNPJ');
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Dados do Cliente
          </span>
          <Link to="/clientes">
            <Button variant="outline" size="sm" className="gap-1">
              <UserPlus className="h-4 w-4" />
              Gerenciar Clientes
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* Client Selection */}
        <div className="space-y-2">
          <Label>Selecionar Cliente Cadastrado</Label>
          <Select 
            value={selectedClientId || ''} 
            onValueChange={handleSelectClient}
          >
            <SelectTrigger>
              <SelectValue placeholder="Buscar cliente ou cadastrar novo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Cliente (não cadastrado)
                </span>
              </SelectItem>
              {isLoadingClients ? (
                <SelectItem value="loading" disabled>
                  Carregando clientes...
                </SelectItem>
              ) : (
                clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.trade_name || c.name}
                    {c.cnpj && ` - ${c.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="border-t pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* CNPJ with lookup */}
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ / CPF</Label>
              <div className="flex gap-2">
                <Input
                  id="cnpj"
                  value={client.cnpj || ''}
                  onChange={(e) => handleChange('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleLookupCNPJ}
                  disabled={isLookingUp}
                  title="Consultar CNPJ"
                >
                  {isLookingUp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientPhone">Telefone</Label>
              <Input
                id="clientPhone"
                value={client.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="clientName">Nome / Razão Social *</Label>
              <Input
                id="clientName"
                value={client.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Nome do cliente ou empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">E-mail</Label>
              <Input
                id="clientEmail"
                type="email"
                value={client.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientAddress">Endereço</Label>
              <Input
                id="clientAddress"
                value={client.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Endereço completo"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
