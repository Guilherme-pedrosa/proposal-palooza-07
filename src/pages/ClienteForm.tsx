import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesGCApi, segmentoConfig } from '@/lib/api/clientesGC';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'crypto';

export default function ClienteForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [saving, setSaving] = useState(false);
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [tipoPessoa, setTipoPessoa] = useState<'PJ' | 'PF'>('PJ');

  const [form, setForm] = useState({
    nome: '',
    razao_social: '',
    cnpj: '',
    cpf: '',
    segmento: '',
    porte: '',
    telefone: '',
    celular: '',
    email: '',
    cep: '',
    endereco: '',
    cidade: '',
    estado: '',
    observacoes: '',
  });

  // Load existing client
  const { data: existing } = useQuery({
    queryKey: ['cliente_gc', id],
    queryFn: () => clientesGCApi.getById(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setTipoPessoa(existing.tipo_pessoa === 'PF' ? 'PF' : 'PJ');
      setForm({
        nome: existing.nome || '',
        razao_social: existing.razao_social || '',
        cnpj: existing.cnpj || '',
        cpf: existing.cpf || '',
        segmento: existing.segmento || '',
        porte: existing.porte || '',
        telefone: existing.telefone || '',
        celular: existing.celular || '',
        email: existing.email || '',
        cep: '',
        endereco: existing.endereco || '',
        cidade: existing.cidade || '',
        estado: existing.estado || '',
        observacoes: existing.observacoes || '',
      });
    }
  }, [existing]);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleCEP = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      toast.error('CEP deve ter 8 dígitos');
      return;
    }
    setLookingUpCep(true);
    try {
      const data = await clientesGCApi.lookupCEP(cep);
      setForm(f => ({
        ...f,
        endereco: data.logradouro || f.endereco,
        cidade: data.localidade || f.cidade,
        estado: data.uf || f.estado,
      }));
      toast.success('Endereço preenchido!');
    } catch {
      toast.error('CEP não encontrado');
    } finally {
      setLookingUpCep(false);
    }
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (tipoPessoa === 'PJ' && form.cnpj) {
      const cnpjClean = form.cnpj.replace(/\D/g, '');
      if (cnpjClean.length !== 14) {
        toast.error('CNPJ deve ter 14 dígitos');
        return;
      }
    }

    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      toast.error('Email inválido');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tipo_pessoa: tipoPessoa,
        nome: form.nome,
        razao_social: form.razao_social || null,
        cnpj: tipoPessoa === 'PJ' ? form.cnpj.replace(/\D/g, '') || null : null,
        cpf: tipoPessoa === 'PF' ? form.cpf.replace(/\D/g, '') || null : null,
        segmento: form.segmento || null,
        porte: form.porte || null,
        telefone: form.telefone || null,
        celular: form.celular || null,
        email: form.email || null,
        endereco: form.endereco || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        observacoes: form.observacoes || null,
      };

      if (isEdit) {
        await clientesGCApi.update(id!, payload as any);
        toast.success('Cliente atualizado!');
      } else {
        const gcId = `manual-${crypto.randomUUID()}`;
        await clientesGCApi.create({ ...payload, gc_id: gcId, ativo: true, total_compras_gc: 0 } as any);
        toast.success('Cliente cadastrado!');
      }

      queryClient.invalidateQueries({ queryKey: ['clientes_gc'] });
      queryClient.invalidateQueries({ queryKey: ['cliente_gc', id] });
      navigate('/clientes');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <Link to="/clientes">
        <Button variant="ghost" size="sm" className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </Link>

      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle>{isEdit ? 'Editar Cliente' : 'Novo Cliente'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo Pessoa */}
          <div className="flex gap-2">
            <Button
              variant={tipoPessoa === 'PJ' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTipoPessoa('PJ')}
            >
              PJ
            </Button>
            <Button
              variant={tipoPessoa === 'PF' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTipoPessoa('PF')}
            >
              PF
            </Button>
          </div>

          {/* Nome */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{tipoPessoa === 'PJ' ? 'Razão Social *' : 'Nome Completo *'}</Label>
              <Input value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Nome da empresa ou pessoa" />
            </div>
            {tipoPessoa === 'PJ' && (
              <div>
                <Label>Nome Fantasia</Label>
                <Input value={form.razao_social} onChange={(e) => set('razao_social', e.target.value)} />
              </div>
            )}
          </div>

          {/* Documento */}
          {tipoPessoa === 'PJ' ? (
            <div>
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
          ) : (
            <div>
              <Label>CPF</Label>
              <Input value={form.cpf} onChange={(e) => set('cpf', e.target.value)} placeholder="000.000.000-00" />
            </div>
          )}

          {/* Segmento + Porte */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Segmento</Label>
              <Select value={form.segmento} onValueChange={(v) => set('segmento', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(segmentoConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Porte</Label>
              <Select value={form.porte} onValueChange={(v) => set('porte', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pequeno">Pequeno</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="grande">Grande</SelectItem>
                  <SelectItem value="rede">Rede</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contato */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="(00) 0000-0000" />
            </div>
            <div>
              <Label>Celular</Label>
              <Input value={form.celular} onChange={(e) => set('celular', e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@empresa.com" />
          </div>

          {/* CEP + Endereço */}
          <div>
            <Label>CEP</Label>
            <div className="flex gap-2">
              <Input value={form.cep} onChange={(e) => set('cep', e.target.value)} placeholder="00000-000" className="flex-1" />
              <Button variant="outline" onClick={handleCEP} disabled={lookingUpCep}>
                {lookingUpCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-1">Buscar</span>
              </Button>
            </div>
          </div>

          <div>
            <Label>Endereço</Label>
            <Input value={form.endereco} onChange={(e) => set('endereco', e.target.value)} placeholder="Rua, número, complemento" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.estado} onChange={(e) => set('estado', e.target.value)} maxLength={2} placeholder="UF" />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} rows={3} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => navigate('/clientes')}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEdit ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
