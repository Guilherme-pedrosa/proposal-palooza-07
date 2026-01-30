import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Client } from '@/types/proposal';
import { Building2 } from 'lucide-react';

interface ClientFormProps {
  client: Client;
  onChange: (client: Client) => void;
}

export function ClientForm({ client, onChange }: ClientFormProps) {
  const handleChange = (field: keyof Client, value: string) => {
    onChange({ ...client, [field]: value });
  };

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          Dados do Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor="cnpj">CNPJ / CPF</Label>
          <Input
            id="cnpj"
            value={client.cnpj || ''}
            onChange={(e) => handleChange('cnpj', e.target.value)}
            placeholder="00.000.000/0000-00"
          />
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
      </CardContent>
    </Card>
  );
}
