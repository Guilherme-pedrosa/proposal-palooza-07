import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Building2, 
  Plus, 
  Search, 
  FileText, 
  Phone, 
  Mail,
  MapPin,
  Loader2,
  Trash2,
  Eye,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, Client } from '@/lib/api/clients';
import { proposalsApi } from '@/lib/api/proposals';
import { useNavigate } from 'react-router-dom';

export default function Clients() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    trade_name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    contact_person: '',
    notes: '',
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente cadastrado com sucesso!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao cadastrar cliente');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) => 
      clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente atualizado com sucesso!');
      setIsDialogOpen(false);
      setSelectedClient(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar cliente');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir cliente');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      trade_name: '',
      cnpj: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      contact_person: '',
      notes: '',
    });
  };

  const handleLookupCNPJ = async () => {
    if (!formData.cnpj) {
      toast.error('Digite o CNPJ para consultar');
      return;
    }

    setIsLookingUp(true);
    try {
      const data = await clientsApi.lookupCNPJ(formData.cnpj);
      
      setFormData(prev => ({
        ...prev,
        name: data.razao_social || prev.name,
        trade_name: data.nome_fantasia || prev.trade_name,
        cnpj: data.cnpj,
        email: data.email || prev.email,
        phone: data.telefone || prev.phone,
        address: `${data.logradouro}${data.numero ? `, ${data.numero}` : ''}${data.complemento ? ` - ${data.complemento}` : ''}`,
        city: data.municipio || prev.city,
        state: data.uf || prev.state,
        zip_code: data.cep || prev.zip_code,
      }));
      
      toast.success('Dados do CNPJ carregados!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao consultar CNPJ');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    const clientData = {
      ...formData,
      cnpj: formData.cnpj.replace(/\D/g, '') || null,
    };

    if (selectedClient) {
      updateMutation.mutate({ id: selectedClient.id, data: clientData });
    } else {
      createMutation.mutate(clientData as any);
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      trade_name: client.trade_name || '',
      cnpj: client.cnpj || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zip_code: client.zip_code || '',
      contact_person: client.contact_person || '',
      notes: client.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenDialog = () => {
    setSelectedClient(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const formatCNPJ = (cnpj: string) => {
    const clean = cnpj.replace(/\D/g, '');
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.cnpj && client.cnpj.includes(searchTerm.replace(/\D/g, ''))) ||
    (client.trade_name && client.trade_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <MainLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie sua carteira de clientes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={handleOpenDialog}>
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {/* CNPJ Lookup */}
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <div className="flex gap-2">
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleLookupCNPJ}
                    disabled={isLookingUp}
                  >
                    {isLookingUp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-2">Consultar</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Razão Social *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade_name">Nome Fantasia</Label>
                  <Input
                    id="trade_name"
                    value={formData.trade_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, trade_name: e.target.value }))}
                    placeholder="Nome comercial"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Rua, número, complemento"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_person">Pessoa de Contato</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                  placeholder="Nome do responsável"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas sobre o cliente..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {selectedClient ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, CNPJ ou nome fantasia..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Clientes Cadastrados ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <ClientRow 
                    key={client.id} 
                    client={client} 
                    onEdit={handleEdit}
                    onDelete={() => deleteMutation.mutate(client.id)}
                    onNavigate={navigate}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}

function ClientRow({ 
  client, 
  onEdit, 
  onDelete,
  onNavigate 
}: { 
  client: Client; 
  onEdit: (client: Client) => void;
  onDelete: () => void;
  onNavigate: (path: string) => void;
}) {
  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', 'client', client.id],
    queryFn: () => proposalsApi.getByClientId(client.id),
  });

  const formatCNPJ = (cnpj: string) => {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return cnpj;
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{client.trade_name || client.name}</p>
          {client.trade_name && (
            <p className="text-xs text-muted-foreground">{client.name}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        {client.cnpj ? formatCNPJ(client.cnpj) : '-'}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {client.phone && (
            <span className="flex items-center gap-1 text-sm">
              <Phone className="h-3 w-3" /> {client.phone}
            </span>
          )}
          {client.email && (
            <span className="flex items-center gap-1 text-sm">
              <Mail className="h-3 w-3" /> {client.email}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {client.city && client.state ? (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {client.city}/{client.state}
          </span>
        ) : '-'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Badge 
            variant="outline" 
            className="gap-1 cursor-pointer hover:bg-muted"
            onClick={() => onNavigate(`/cliente/${client.id}`)}
          >
            <FileText className="h-3 w-3" />
            {proposals.length} proposta{proposals.length !== 1 ? 's' : ''}
          </Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onNavigate(`/cliente/${client.id}`)}
            title="Ver detalhes"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEdit(client)} title="Editar">
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
