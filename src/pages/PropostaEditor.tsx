import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, Save, Send, FileText, ChevronDown, Plus, Trash2, Image as ImageIcon,
  Copy, MessageCircle, Mail, Printer, Link2, Search, Loader2
} from 'lucide-react';
import { WAIButton } from '@/components/WAIButton';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyInput } from '@/components/ui/currency-input';
import { NumberInput } from '@/components/ui/number-input';
import { CatalogPickerModal } from '@/components/proposal/CatalogPickerModal';
import {
  fetchPropostaById, createProposta, updateProposta, getNextPropostaNumber,
  STATUS_PROPOSTA, formatBRL, type PropostaRow, type StatusProposta,
} from '@/lib/api/propostas';
import { proposalTemplates } from '@/types/proposalTemplate';
import { useProposal } from '@/contexts/ProposalContext';
import { useGC } from '@/contexts/GCContext';
import { tabelasPrecoApi, type TabelaPreco } from '@/lib/api/tabelasPreco';
import type { ProdutoGCRow } from '@/lib/api/produtosGC';

interface PropostaProduct {
  id: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  photoUrl?: string;
  gcProdutoId?: string;
}

interface PropostaTermo {
  id: string;
  title: string;
  description: string;
}

const validadeOptions = [
  { value: '7', label: '7 dias' },
  { value: '10', label: '10 dias' },
  { value: '15', label: '15 dias' },
  { value: '30', label: '30 dias' },
  { value: '45', label: '45 dias' },
];

function Section({ title, icon, children, defaultOpen = true }: { title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3 px-4">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">{icon} {title}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function PropostaEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { savedTerms } = useProposal();
  const { criarOrcamentoGC } = useGC();
  const [searchParams] = useSearchParams();
  const isNew = !id;

  const [saving, setSaving] = useState(false);
  const [carregandoGC, setCarregandoGC] = useState(false);
  const [gcOrcamentoUrl, setGcOrcamentoUrl] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [tabelaPrecoId, setTabelaPrecoId] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Form state
  const [numero, setNumero] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [clienteBusca, setClienteBusca] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [oportunidadeId, setOportunidadeId] = useState('');
  const [produtos, setProdutos] = useState<PropostaProduct[]>([]);
  const [termos, setTermos] = useState<PropostaTermo[]>([]);
  const [imagens, setImagens] = useState<any[]>([]);
  const [validadeDias, setValidadeDias] = useState('10');
  const [condicoesPagamento, setCondicoesPagamento] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [observacoesInternas, setObservacoesInternas] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [numParcelas, setNumParcelas] = useState(1);
  const [entradaPercent, setEntradaPercent] = useState(0);
  const [leasingDialogOpen, setLeasingDialogOpen] = useState(false);
  const [status, setStatus] = useState<string>('rascunho');
  const [versao, setVersao] = useState(1);
  const [linkUuid, setLinkUuid] = useState('');

  // Load price tables
  const { data: tabelasPreco = [] } = useQuery({
    queryKey: ['tabelas_preco'],
    queryFn: tabelasPrecoApi.getAll,
  });

  // Load prices for selected table
  const { data: precosTabela = [] } = useQuery({
    queryKey: ['precos_tabela', tabelaPrecoId],
    queryFn: () => tabelasPrecoApi.getPrecosPorTabela(tabelaPrecoId),
    enabled: !!tabelaPrecoId,
  });

  // Set default price table on load
  useEffect(() => {
    if (tabelasPreco.length > 0 && !tabelaPrecoId) {
      const principal = tabelasPreco.find(t => t.principal);
      setTabelaPrecoId(principal?.id || tabelasPreco[0].id);
    }
  }, [tabelasPreco]);

  // Build a map of gc_id -> produto UUID for price lookups
  const { data: produtosGcMap } = useQuery({
    queryKey: ['produtos_gc_id_map'],
    queryFn: async () => {
      const { data } = await supabase.from('produtos_gc').select('id, gc_id');
      const map = new Map<string, string>();
      for (const p of data || []) {
        map.set(p.gc_id, p.id);
      }
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Update existing product prices when price table changes
  useEffect(() => {
    if (!tabelaPrecoId || precosTabela.length === 0 || produtos.length === 0 || !produtosGcMap) return;
    const precoMap = new Map<string, number>();
    for (const pp of precosTabela) {
      if (pp.valor_venda > 0) {
        precoMap.set(pp.produto_id, pp.valor_venda);
      }
    }
    setProdutos(prev => {
      let changed = false;
      const updated = prev.map(p => {
        if (!p.gcProdutoId) return p;
        const produtoUuid = produtosGcMap.get(p.gcProdutoId);
        if (!produtoUuid) return p;
        const novoPreco = precoMap.get(produtoUuid);
        if (novoPreco !== undefined && novoPreco !== p.unitPrice) {
          changed = true;
          const sub = p.quantity * novoPreco;
          return { ...p, unitPrice: novoPreco, totalPrice: sub - (sub * (p.discount || 0) / 100) };
        }
        return p;
      });
      return changed ? updated : prev;
    });
  }, [tabelaPrecoId, precosTabela, produtosGcMap]);

  // Load existing proposal
  const { data: proposta, isLoading: loadingProposta } = useQuery({
    queryKey: ['proposta', id],
    queryFn: () => fetchPropostaById(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (proposta) {
      setNumero(proposta.numero);
      setTitulo(proposta.titulo);
      setDescricao(proposta.descricao ?? '');
      setClienteId(proposta.cliente_id ?? '');
      setTemplateId(proposta.template_id ?? '');
      setOportunidadeId(proposta.oportunidade_id ?? '');
      setProdutos((proposta.produtos as PropostaProduct[]) ?? []);
      setTermos((proposta.termos_condicoes as PropostaTermo[]) ?? []);
      setImagens(proposta.imagens ?? []);
      setValidadeDias(String(proposta.validade_dias ?? 10));
      setObservacoesInternas(proposta.observacoes_internas ?? '');
      setStatus(proposta.status ?? 'rascunho');
      setVersao(proposta.versao);
      setLinkUuid(proposta.link_publico_uuid ?? '');
      setGcOrcamentoUrl(proposta.gc_orcamento_url ?? '');
    }
  }, [proposta]);

  // Generate number for new
  useEffect(() => {
    if (isNew && !numero) {
      getNextPropostaNumber().then(setNumero);
    }
  }, [isNew]);

  // Pre-fill from query params
  useEffect(() => {
    const preCliente = searchParams.get('cliente');
    const preOp = searchParams.get('oportunidade');
    if (preCliente) setClienteId(preCliente);
    if (preOp) setOportunidadeId(preOp);
  }, []);

  // Client search
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes_proposta', clienteBusca],
    queryFn: async () => {
      if (!clienteBusca || clienteBusca.length < 2) return [];
      const { data } = await supabase
        .from('clientes_gc')
        .select('id, nome, cnpj, cidade, segmento, gc_id')
        .or(`nome.ilike.%${clienteBusca}%,cnpj.ilike.%${clienteBusca}%`)
        .limit(10);
      return data ?? [];
    },
    enabled: clienteBusca.length >= 2 && !clienteId,
  });

  const { data: clienteSelecionado } = useQuery({
    queryKey: ['cliente_sel_proposta', clienteId],
    queryFn: async () => {
      if (!clienteId) return null;
      const { data } = await supabase.from('clientes_gc').select('id, nome, cnpj, cidade, segmento, gc_id').eq('id', clienteId).single();
      return data;
    },
    enabled: !!clienteId,
  });

  const handleSelectTemplate = (tplId: string) => {
    if (templateId && produtos.length > 0) {
      if (!confirm('Trocar template vai pré-preencher termos. Continuar?')) return;
    }
    setTemplateId(tplId);
    const tpl = proposalTemplates.find((t) => t.id === tplId);
    if (tpl) {
      if (!titulo) setTitulo(tpl.defaultTitle);
      if (!descricao) setDescricao(tpl.defaultDescription);
      // Pre-fill terms
      const tplTerms = savedTerms
        .filter((t) => t.templateIds.length === 0 || t.templateIds.includes(tplId))
        .map((t) => ({ id: crypto.randomUUID(), title: t.title, description: t.description }));
      setTermos(tplTerms);
      // Pre-fill products
      if (produtos.length === 0 && tpl.defaultProducts.length > 0) {
        setProdutos(tpl.defaultProducts.map((dp) => ({
          id: crypto.randomUUID(), name: dp.name, description: dp.description,
          unit: dp.unit, quantity: 1, unitPrice: 0, totalPrice: 0, discount: 0,
        })));
      }
    }
  };

  const addProductFromCatalog = (p: ProdutoGCRow) => {
    let preco = p.preco_venda || 0;
    if (tabelaPrecoId && precosTabela.length > 0) {
      // Use produto UUID (p.id) directly since CatalogPickerModal passes ProdutoGCRow with its UUID
      const precoTabela = precosTabela.find(pt => pt.produto_id === p.id);
      if (precoTabela && precoTabela.valor_venda > 0) {
        preco = precoTabela.valor_venda;
      }
    }

    const item: PropostaProduct = {
      id: crypto.randomUUID(),
      name: p.nome,
      description: p.descricao || '',
      unit: p.unidade || 'un',
      quantity: 1,
      unitPrice: preco,
      totalPrice: preco,
      discount: 0,
      photoUrl: p.foto_url || undefined,
      gcProdutoId: p.gc_id,
    };
    setProdutos((prev) => [...prev, item]);
  };

  const addManualProduct = () => {
    setProdutos((prev) => [...prev, {
      id: crypto.randomUUID(), name: '', description: '', unit: 'un',
      quantity: 1, unitPrice: 0, totalPrice: 0, discount: 0,
    }]);
  };

  const updateProduct = (idx: number, field: keyof PropostaProduct, value: any) => {
    setProdutos((prev) => prev.map((p, i) => {
      if (i !== idx) return p;
      const updated = { ...p, [field]: value };
      if (['quantity', 'unitPrice', 'discount'].includes(field)) {
        const sub = updated.quantity * updated.unitPrice;
        updated.totalPrice = sub - (sub * (updated.discount || 0) / 100);
      }
      return updated;
    }));
  };

  const removeProduct = (idx: number) => setProdutos((prev) => prev.filter((_, i) => i !== idx));

  const addTermo = () => setTermos((prev) => [...prev, { id: crypto.randomUUID(), title: '', description: '' }]);
  const updateTermo = (idx: number, field: 'title' | 'description', value: string) =>
    setTermos((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  const removeTermo = (idx: number) => setTermos((prev) => prev.filter((_, i) => i !== idx));

  const subtotal = produtos.reduce((s, p) => s + p.quantity * p.unitPrice, 0);
  const descontoTotal = produtos.reduce((s, p) => s + (p.quantity * p.unitPrice * (p.discount || 0) / 100), 0);
  const total = subtotal - descontoTotal;

  const validadeAte = addDays(new Date(), parseInt(validadeDias) || 10);

  const handleSave = async (newStatus?: string) => {
    if (!titulo.trim()) { toast({ title: 'Informe o título da proposta', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload: Partial<PropostaRow> = {
        numero,
        titulo,
        descricao: descricao || null,
        cliente_id: clienteId || null,
        oportunidade_id: oportunidadeId || null,
        vendedor_id: user?.id ?? null,
        template_id: templateId || null,
        status: newStatus ?? status,
        produtos: produtos as any,
        termos_condicoes: termos as any,
        imagens: imagens as any,
        valor_total: total,
        desconto_total: descontoTotal,
        validade_dias: parseInt(validadeDias) || 10,
        validade_ate: validadeAte.toISOString(),
        observacoes_internas: observacoesInternas || null,
      };

      if (isNew) {
        const created = await createProposta(payload);
        toast({ title: '💾 Proposta salva!' });
        navigate(`/propostas/${created.id}`, { replace: true });
      } else {
        // Versioning: if status !== rascunho and we're saving, bump version
        if (proposta && proposta.status !== 'rascunho' && !newStatus) {
          const hist = proposta.historico_versoes ?? [];
          hist.push({
            versao: proposta.versao,
            em: new Date().toISOString(),
            valor_total: proposta.valor_total,
            resumo: 'Versão anterior',
          });
          payload.versao = proposta.versao + 1;
          payload.historico_versoes = hist as any;
          payload.status = 'rascunho';
        }
        await updateProposta(id!, payload);
        toast({ title: '💾 Proposta atualizada!' });
        queryClient.invalidateQueries({ queryKey: ['proposta', id] });
      }
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendLink = async () => {
    await handleSave('enviada');
    const uuid = proposta?.link_publico_uuid || linkUuid;
    if (uuid) {
      const url = `${window.location.origin}/p/${uuid}`;
      setShareUrl(url);
      setShareOpen(true);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ title: '📋 Link copiado!' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImagens((prev) => [...prev, { id: crypto.randomUUID(), url: reader.result, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const criarOrcamentoNoGC = async () => {
    if (!clienteId) { toast({ title: 'Selecione um cliente', variant: 'destructive' }); return; }
    const produtosSemGC = produtos.filter(p => !p.gcProdutoId);
    if (produtosSemGC.length > 0) {
      toast({ title: `${produtosSemGC.length} item(s) sem código GC — substitua antes de criar o orçamento`, variant: 'destructive' });
      return;
    }
    setCarregandoGC(true);
    try {
      const resultado = await criarOrcamentoGC({
        gc_cliente_id: clienteSelecionado?.gc_id || clienteId,
        produtos: produtos.map(p => ({ gc_produto_id: p.gcProdutoId!, quantidade: p.quantity, valor_unitario: p.unitPrice })),
        observacoes: descricao,
        vendedor_nome: (user as any)?.nome || user?.email || '',
        proposta_numero: numero,
      });
      // Save GC IDs on the proposal
      if (id) {
        await supabase.from('propostas').update({
          gc_orcamento_id: resultado.gc_orcamento_id,
          gc_orcamento_url: resultado.gc_orcamento_url,
        } as any).eq('id', id);
        if (oportunidadeId) {
          await supabase.from('oportunidades').update({
            gc_orcamento_id: resultado.gc_orcamento_id,
            gc_orcamento_url: resultado.gc_orcamento_url,
          } as any).eq('id', oportunidadeId);
        }
      }
      setGcOrcamentoUrl(resultado.gc_orcamento_url);
      toast({ title: `✅ Orçamento #${resultado.gc_orcamento_id} criado no GestãoClick!` });
    } catch (e: any) {
      if (e.message !== 'API_KEY_EXPIRADA') {
        toast({ title: '❌ Erro ao criar orçamento', variant: 'destructive' });
      }
    } finally {
      setCarregandoGC(false);
    }
  };

  if (!isNew && loadingProposta) {
    return <MainLayout><div className="space-y-3"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-40 w-full" /></div></MainLayout>;
  }

  const st = STATUS_PROPOSTA[status as StatusProposta] ?? STATUS_PROPOSTA.rascunho;

  return (
    <MainLayout>
      <div className="space-y-4 max-w-2xl mx-auto pb-20">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mx-4 px-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => navigate('/propostas')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-sm truncate">{numero}</span>
              {versao > 1 && <Badge variant="outline" className="text-[10px]">Rev. {versao}</Badge>}
              <Badge className={`text-[10px] ${st.bg} border-0`}>{st.emoji} {st.label}</Badge>
            </div>
          </div>
          <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
            <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => handleSave()} disabled={saving}>
              <Save className="h-3.5 w-3.5" /> {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button size="sm" className="gap-1.5 shrink-0" onClick={handleSendLink} disabled={saving}>
              <Send className="h-3.5 w-3.5" /> Enviar Link
            </Button>
            {gcOrcamentoUrl ? (
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0" asChild>
                <a href={gcOrcamentoUrl} target="_blank" rel="noopener">🔗 Ver no GC →</a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={criarOrcamentoNoGC} disabled={carregandoGC || isNew}>
                {carregandoGC ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                🔧 {carregandoGC ? 'Criando...' : 'Criar no GC'}
              </Button>
            )}
            <WAIButton
              variant="header"
              contexto={{
                cliente: clienteSelecionado ? {
                  nome: clienteSelecionado.nome,
                  segmento: clienteSelecionado.segmento,
                } : undefined,
                proposta: {
                  numero: numero,
                  status: status,
                  valor_total: total,
                  produtos_nomes: produtos.map(p => p.name).filter(Boolean).join(', '),
                },
              }}
            />
          </div>
        </div>

        {/* Section 1: Identification */}
        <Section title="Identificação" icon="📋">
          <div className="space-y-3">
            <div>
              <Label>Número</Label>
              <Input value={numero} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Título da Proposta *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Proposta de Manutenção Preventiva" />
            </div>
          </div>
        </Section>

        {/* Section 2: Client */}
        <Section title="Cliente" icon="🏢">
          <div className="space-y-3">
            {clienteId && clienteSelecionado ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm py-1 px-3">{clienteSelecionado.nome}</Badge>
                <span className="text-xs text-muted-foreground">{clienteSelecionado.cnpj} · {clienteSelecionado.cidade}</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setClienteId(''); setClienteBusca(''); }}>Trocar</Button>
              </div>
            ) : (
              <div className="relative">
                <Input placeholder="Buscar cliente..." value={clienteBusca} onChange={(e) => setClienteBusca(e.target.value)} />
                {clientes.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {clientes.map((c) => (
                      <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm" onClick={() => { setClienteId(c.id); setClienteBusca(''); }}>
                        <p className="font-medium">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.cnpj} · {c.cidade}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* Section 3: Template */}
        <Section title="Template" icon="📝">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[...proposalTemplates, { id: 'em_branco', name: 'Em Branco', icon: '📝', color: '#6B7280', description: '', sections: [], defaultTitle: '', defaultDescription: '', defaultProducts: [] }].map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl.id)}
                className={`shrink-0 flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors min-w-[80px] ${
                  templateId === tpl.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                }`}
              >
                <span className="text-2xl">{tpl.icon}</span>
                <span className="text-[11px] font-medium text-center">{tpl.name}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Section 4: Price Table */}
        {tabelasPreco.length > 0 && (
          <Section title="Tabela de Preço" icon="💰">
            <Select value={tabelaPrecoId} onValueChange={setTabelaPrecoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar tabela de preço..." />
              </SelectTrigger>
              <SelectContent>
                {tabelasPreco.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome} {t.principal ? '⭐' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              A tabela selecionada define os preços ao adicionar produtos do catálogo
            </p>
          </Section>
        )}

        {/* Section 5: Products */}
        <Section title={`Produtos e Serviços — ${formatBRL(total)}`} icon="📦">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setCatalogOpen(true)}>
                <Search className="h-3 w-3" /> Buscar no Catálogo
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={addManualProduct}>
                <Plus className="h-3 w-3" /> Manual
              </Button>
            </div>

            {produtos.map((p, i) => (
              <div key={p.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  {p.photoUrl && <img src={p.photoUrl} className="w-10 h-10 rounded object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <Input value={p.name} onChange={(e) => updateProduct(i, 'name', e.target.value)} placeholder="Nome do produto" className="text-sm h-8" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeProduct(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">Qtd</Label>
                    <NumberInput value={p.quantity} onChange={(v) => updateProduct(i, 'quantity', v)} min={1} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Preço Unit.</Label>
                    <CurrencyInput value={p.unitPrice} onChange={(v) => updateProduct(i, 'unitPrice', v)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Desc %</Label>
                    <Input type="number" value={p.discount || ''} onChange={(e) => updateProduct(i, 'discount', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                </div>
                <p className="text-xs text-right font-medium">Subtotal: {formatBRL(p.totalPrice)}</p>
              </div>
            ))}

            {produtos.length > 0 && (
              <div className="border-t pt-2 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></div>
                {descontoTotal > 0 && <div className="flex justify-between text-red-600"><span>Desconto</span><span>-{formatBRL(descontoTotal)}</span></div>}
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>TOTAL</span><span>{formatBRL(total)}</span></div>
              </div>
            )}
          </div>
        </Section>

        {/* Section 5: Scope */}
        <Section title="Escopo e Descrição" icon="📄">
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição do escopo da proposta..." rows={4} />
        </Section>

        {/* Section 6: Terms */}
        <Section title={`Termos e Condições (${termos.length})`} icon="📚">
          <div className="space-y-3">
            <Button size="sm" variant="outline" className="gap-1" onClick={addTermo}>
              <Plus className="h-3 w-3" /> Adicionar Cláusula
            </Button>
            {termos.map((t, i) => (
              <div key={t.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex gap-2">
                  <Input value={t.title} onChange={(e) => updateTermo(i, 'title', e.target.value)} placeholder="Título da cláusula" className="text-sm h-8 flex-1" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeTermo(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Textarea value={t.description} onChange={(e) => updateTermo(i, 'description', e.target.value)} placeholder="Texto da cláusula" rows={2} className="text-sm" />
              </div>
            ))}
          </div>
        </Section>

        {/* Section 7: Images */}
        <Section title={`Imagens (${imagens.length})`} icon="🖼️" defaultOpen={false}>
          <div className="space-y-3">
            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" id="img-upload" />
            <Button size="sm" variant="outline" className="gap-1" onClick={() => document.getElementById('img-upload')?.click()}>
              <ImageIcon className="h-3 w-3" /> Adicionar Imagem
            </Button>
            {imagens.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {imagens.map((img, i) => (
                  <div key={img.id} className="relative group">
                    <img src={img.url} className="w-full h-20 object-cover rounded" />
                    <Button
                      variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100"
                      onClick={() => setImagens((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* Section 8: Commercial */}
        <Section title="Condições Comerciais" icon="💰">
          <div className="space-y-4">
            <div>
              <Label>Validade</Label>
              <Select value={validadeDias} onValueChange={setValidadeDias}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {validadeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Válida até: {format(validadeAte, 'dd/MM/yyyy')}</p>
            </div>

            <Separator />

            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={(v) => {
                setFormaPagamento(v);
                if (v === 'avista') { setNumParcelas(1); setEntradaPercent(0); }
                if (v === 'leasing') setLeasingDialogOpen(true);
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="avista">À Vista (PIX / Transferência)</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                  <SelectItem value="leasing">Leasing / Locação</SelectItem>
                  <SelectItem value="financiamento">Financiamento</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formaPagamento && formaPagamento !== 'avista' && formaPagamento !== 'leasing' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Entrada (%)</Label>
                  <Input type="number" min={0} max={100} value={entradaPercent || ''} onChange={(e) => setEntradaPercent(parseFloat(e.target.value) || 0)} placeholder="0" />
                </div>
                <div>
                  <Label>Nº de Parcelas</Label>
                  <Input type="number" min={1} max={120} value={numParcelas} onChange={(e) => setNumParcelas(parseInt(e.target.value) || 1)} />
                </div>
              </div>
            )}

            {/* Installment calculation */}
            {total > 0 && formaPagamento && formaPagamento !== 'leasing' && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <p className="font-medium text-foreground flex items-center gap-1">💳 Simulação de Pagamento</p>
                {formaPagamento === 'avista' ? (
                  <p>Valor à vista: <span className="font-bold text-primary">{formatBRL(total)}</span></p>
                ) : (
                  <>
                    {entradaPercent > 0 && (
                      <div className="flex justify-between">
                        <span>Entrada ({entradaPercent}%)</span>
                        <span className="font-medium">{formatBRL(total * entradaPercent / 100)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Saldo restante</span>
                      <span className="font-medium">{formatBRL(total * (1 - entradaPercent / 100))}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-bold">
                      <span>{numParcelas}x de</span>
                      <span className="text-primary">{formatBRL((total * (1 - entradaPercent / 100)) / numParcelas)}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Leasing calculation */}
            {formaPagamento === 'leasing' && total > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 space-y-2 text-sm">
                <p className="font-medium text-foreground flex items-center gap-1">🏦 Leasing / Locação</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Prazo (meses)</Label>
                    <Input type="number" min={6} max={60} value={numParcelas || 36} onChange={(e) => setNumParcelas(parseInt(e.target.value) || 36)} />
                  </div>
                  <div className="flex items-end">
                    <div className="text-right w-full">
                      <p className="text-xs text-muted-foreground">Parcela estimada</p>
                      <p className="text-lg font-bold text-primary">{formatBRL(total / (numParcelas || 36))}/mês</p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">💡 Benefícios Fiscais (Lucro Real):</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span>Dedução IRPJ (25%)</span>
                    <span className="text-right font-medium text-emerald-600">{formatBRL(total * 0.25)}</span>
                    <span>Dedução CSLL (9%)</span>
                    <span className="text-right font-medium text-emerald-600">{formatBRL(total * 0.09)}</span>
                    <span>Crédito PIS (1,65%)</span>
                    <span className="text-right font-medium text-emerald-600">{formatBRL(total * 0.0165)}</span>
                    <span>Crédito COFINS (7,6%)</span>
                    <span className="text-right font-medium text-emerald-600">{formatBRL(total * 0.076)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-emerald-700 dark:text-emerald-400">
                    <span>Economia potencial (até 43,25%)</span>
                    <span>{formatBRL(total * 0.4325)}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 w-full mt-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950"
                  onClick={() => setLeasingDialogOpen(true)}>
                  📄 Gerar Apresentação Fiscal para o Cliente
                </Button>
              </div>
            )}

            <div>
              <Label>Condições de Pagamento (texto livre)</Label>
              <Textarea value={condicoesPagamento} onChange={(e) => setCondicoesPagamento(e.target.value)} placeholder="Ex: 30% entrada, 70% na entrega. Boleto ou PIX." rows={2} />
            </div>
            <div>
              <Label>Prazo de Entrega / Execução</Label>
              <Input value={prazoEntrega} onChange={(e) => setPrazoEntrega(e.target.value)} placeholder="Ex: 15 dias após aprovação e entrada" />
            </div>
            <div>
              <Label>Observações Internas (não aparece no PDF)</Label>
              <Textarea value={observacoesInternas} onChange={(e) => setObservacoesInternas(e.target.value)} placeholder="Notas para uso interno..." rows={2} />
            </div>
          </div>
        </Section>
      </div>

      {/* Catalog Picker */}
      <CatalogPickerModal open={catalogOpen} onClose={() => setCatalogOpen(false)} onSelect={addProductFromCatalog} tabelaPrecoId={tabelaPrecoId} />

      {/* Share Modal */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>🔗 Link da proposta gerado!</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={shareUrl} readOnly className="text-sm" />
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="gap-2 justify-start" onClick={copyLink}>
                <Copy className="h-4 w-4" /> Copiar link
              </Button>
              <Button variant="outline" className="gap-2 justify-start" asChild>
                <a href={`https://wa.me/?text=${encodeURIComponent(`Olá! Segue a proposta da WeDo: ${shareUrl}`)}`} target="_blank" rel="noopener">
                  <MessageCircle className="h-4 w-4" /> Compartilhar no WhatsApp
                </a>
              </Button>
              <Button variant="outline" className="gap-2 justify-start" asChild>
                <a href={`mailto:?subject=Proposta Comercial&body=${encodeURIComponent(`Olá!\n\nSegue a proposta comercial:\n${shareUrl}\n\nAtenciosamente,\nWeDo`)}`}>
                  <Mail className="h-4 w-4" /> Compartilhar por Email
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">✅ Você será notificado quando o cliente abrir</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leasing Benefits Dialog */}
      <Dialog open={leasingDialogOpen} onOpenChange={setLeasingDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🏦 Benefícios Fiscais do Leasing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 space-y-2">
              <h3 className="font-bold text-base">Quais benefícios posso ter fazendo a locação?</h3>
              <p>Empresas no regime de <strong>Lucro Real</strong> podem deduzir despesas de locação como custos operacionais:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>25% IRPJ</strong> — dedução do Imposto de Renda</li>
                <li><strong>9% CSLL</strong> — dedução da Contribuição Social</li>
                <li><strong>1,65% PIS</strong> — crédito sobre despesas de locação</li>
                <li><strong>7,6% COFINS</strong> — crédito sobre despesas de locação</li>
              </ul>
              <div className="bg-white dark:bg-background rounded p-3 border mt-2">
                <p className="text-xs text-muted-foreground mb-1">Economia potencial nesta proposta</p>
                <p className="text-2xl font-bold text-emerald-600">{formatBRL(total * 0.4325)}</p>
                <p className="text-xs text-muted-foreground">até 43,25% de dedução + crédito sobre {formatBRL(total)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">📋 Como fazer a dedução?</h4>
              <p>Mantenha os comprovantes de pagamento da locação e siga as diretrizes contábeis. Consulte o contador e o departamento fiscal para garantir o correto tratamento.</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">⚖️ Base Jurídica</h4>
              <p className="text-xs text-muted-foreground">
                Art. 249 e 250 do RIR — Decreto 3000/1999 • Art. 3º, IV da Lei 10.833/2003 • Art. 15, IV da Lei 10.865/2002
              </p>
            </div>

            <Separator />

            <p className="text-xs text-muted-foreground italic">
              * Valores estimados. Cada empresa possui particularidades contábeis. Consulte seu contador para confirmar os benefícios aplicáveis.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => {
              const texto = `📊 BENEFÍCIOS FISCAIS - LEASING\n\nValor do contrato: ${formatBRL(total)}\n\n💰 Economia potencial (Lucro Real):\n• IRPJ (25%): ${formatBRL(total * 0.25)}\n• CSLL (9%): ${formatBRL(total * 0.09)}\n• PIS (1,65%): ${formatBRL(total * 0.0165)}\n• COFINS (7,6%): ${formatBRL(total * 0.076)}\n\n✅ Total: até ${formatBRL(total * 0.4325)} (43,25%)\n\n⚖️ Base: Art. 249/250 Decreto 3000/99, Lei 10.833/03, Lei 10.865/02\n\n* Consulte seu contador.`;
              navigator.clipboard.writeText(texto);
              toast({ title: '📋 Texto copiado!' });
            }}>
              <Copy className="h-4 w-4" /> Copiar Texto
            </Button>
            <Button variant="outline" className="gap-1.5" asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(`📊 BENEFÍCIOS FISCAIS - LEASING\n\nValor: ${formatBRL(total)}\nEconomia potencial: até ${formatBRL(total * 0.4325)} (43,25%)\n\n• IRPJ 25%: ${formatBRL(total * 0.25)}\n• CSLL 9%: ${formatBRL(total * 0.09)}\n• PIS 1,65%: ${formatBRL(total * 0.0165)}\n• COFINS 7,6%: ${formatBRL(total * 0.076)}\n\n⚖️ Art. 249/250 Dec. 3000/99\n* Consulte seu contador`)}`} target="_blank" rel="noopener">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
