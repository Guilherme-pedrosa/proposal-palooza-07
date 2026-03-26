import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
import { ArrowLeft, Save, Search, Plus, X } from 'lucide-react';
import { proximoDiaUtil } from '@/lib/api/atividades';
import { insertAtividade, tipoVendaLabels } from '@/lib/api/oportunidades';
import CurrencyInput from '@/components/ui/currency-input';

const origemOptions = [
  { value: 'indicacao', label: 'Indicação' },
  { value: 'visita_espontanea', label: 'Visita Espontânea' },
  { value: 'prospeccao_ativa', label: 'Prospecção Ativa' },
  { value: 'inbound_site', label: 'Inbound Site' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'reativacao', label: 'Reativação' },
  { value: 'renovacao_contrato', label: 'Renovação Contrato' },
];

const tipoVendaOptions = Object.entries(tipoVendaLabels).map(([value, label]) => ({ value, label }));

function diasDefaultPorTipo(tipo: string): number {
  if (['equipamento_novo', 'projeto_completo', 'locacao'].includes(tipo)) return 60;
  if (['contrato_pcm', 'renovacao_contrato'].includes(tipo)) return 30;
  return 15;
}

export default function OportunidadeNova() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preClienteId = searchParams.get('cliente');

  const [titulo, setTitulo] = useState('');
  const [tipoVenda, setTipoVenda] = useState('');
  const [valorEstimado, setValorEstimado] = useState(0);
  const [dataFechamento, setDataFechamento] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [temperatura, setTemperatura] = useState('frio');
  const [origem, setOrigem] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [clienteId, setClienteId] = useState(preClienteId ?? '');
  const [clienteBusca, setClienteBusca] = useState('');
  const [saving, setSaving] = useState(false);

  // Client search
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes_busca', clienteBusca],
    queryFn: async () => {
      if (!clienteBusca || clienteBusca.length < 2) return [];
      const { data } = await supabase
        .from('clientes_gc')
        .select('id, nome, segmento, cidade, cnpj')
        .or(`nome.ilike.%${clienteBusca}%,cnpj.ilike.%${clienteBusca}%`)
        .limit(10);
      return data ?? [];
    },
    enabled: clienteBusca.length >= 2 && !clienteId,
  });

  // Selected client name
  const { data: clienteSelecionado } = useQuery({
    queryKey: ['cliente_sel', clienteId],
    queryFn: async () => {
      if (!clienteId) return null;
      const { data } = await supabase
        .from('clientes_gc')
        .select('id, nome')
        .eq('id', clienteId)
        .single();
      return data;
    },
    enabled: !!clienteId,
  });

  const handleTipoVendaChange = (v: string) => {
    setTipoVenda(v);
    setDataFechamento(format(addDays(new Date(), diasDefaultPorTipo(v)), 'yyyy-MM-dd'));
  };

  const handleSave = async () => {
    if (!clienteId || !titulo.trim() || !tipoVenda) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: oportunidade, error } = await supabase
        .from('oportunidades')
        .insert({
          titulo,
          cliente_id: clienteId,
          vendedor_id: user!.id,
          etapa: 'prospeccao',
          tipo_venda: tipoVenda,
          valor_estimado: valorEstimado,
          data_fechamento_prevista: dataFechamento,
          temperatura,
          origem: origem || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-create first activity
      await insertAtividade({
        oportunidade_id: oportunidade.id,
        cliente_id: clienteId,
        vendedor_id: user!.id,
        tipo: 'ligacao',
        titulo: 'Primeiro contato — qualificar necessidade na cozinha',
        descricao: 'Ligar para o cliente, entender a necessidade, confirmar interesse e agendar visita técnica se aplicável.',
        data_prevista: proximoDiaUtil(new Date()).toISOString(),
        concluida: false,
      });

      toast({ title: 'Oportunidade criada! 🎯 Atividade de primeiro contato agendada.' });
      navigate(`/oportunidades/${oportunidade.id}`);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4 max-w-lg mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <h1 className="text-xl font-bold">Nova Oportunidade</h1>

        <div className="space-y-4">
          {/* Client */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            {clienteId && clienteSelecionado ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm py-1 px-3">{clienteSelecionado.nome}</Badge>
                {!preClienteId && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setClienteId(''); setClienteBusca(''); }}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CNPJ..."
                  value={clienteBusca}
                  onChange={(e) => setClienteBusca(e.target.value)}
                  className="pl-9"
                />
                {clientes.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {clientes.map((c) => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        onClick={() => { setClienteId(c.id); setClienteBusca(''); }}
                      >
                        <p className="font-medium">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.segmento} · {c.cidade}</p>
                      </button>
                    ))}
                  </div>
                )}
                <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => navigate('/clientes/novo')}>
                  <Plus className="h-3 w-3 mr-1" /> Cadastrar novo cliente
                </Button>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Título da Oportunidade *</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value.slice(0, 100))}
              placeholder="Ex: Fornos Rational para cozinha do restaurante"
            />
          </div>

          {/* Tipo de Venda */}
          <div className="space-y-2">
            <Label>Tipo de Venda *</Label>
            <Select value={tipoVenda} onValueChange={handleTipoVendaChange}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {tipoVendaOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label>Valor Estimado</Label>
            <CurrencyInput value={valorEstimado} onChange={setValorEstimado} />
          </div>

          {/* Data Fechamento */}
          <div className="space-y-2">
            <Label>Previsão de Fechamento</Label>
            <Input type="date" value={dataFechamento} onChange={(e) => setDataFechamento(e.target.value)} />
          </div>

          {/* Temperatura */}
          <div className="space-y-2">
            <Label>Temperatura</Label>
            <div className="flex gap-2">
              {[
                { value: 'frio', label: '🧊 Frio' },
                { value: 'morno', label: '☁️ Morno' },
                { value: 'quente', label: '🔥 Quente' },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTemperatura(t.value)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    temperatura === t.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-accent'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Origem */}
          <div className="space-y-2">
            <Label>Origem</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
              <SelectContent>
                {origemOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações Iniciais</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="O que você já sabe sobre esta oportunidade?"
            />
          </div>

          <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? 'Salvando...' : '💾 Criar Oportunidade'}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
