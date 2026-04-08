import { useState, useEffect } from 'react';
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
import {
  ArrowLeft, Save, Send, FileText, ChevronDown, Plus, Trash2, Image as ImageIcon,
  Copy, MessageCircle, Mail, Printer, Search, Loader2
} from 'lucide-react';
import { WAIButton } from '@/components/WAIButton';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyInput } from '@/components/ui/currency-input';
import { NumberInput } from '@/components/ui/number-input';
import { CatalogPickerModal } from '@/components/proposal/CatalogPickerModal';
import { usePrintProposal } from '@/components/proposal/PrintProposal';
import {
  fetchPropostaById, createProposta, updateProposta, getNextPropostaNumber,
  STATUS_PROPOSTA, formatBRL, type StatusProposta,
} from '@/lib/api/propostas';
import { proposalTemplates } from '@/types/proposalTemplate';
import { useProposal } from '@/contexts/ProposalContext';
import { useGC } from '@/contexts/GCContext';
import { useCompany } from '@/contexts/CompanyContext';
import { tabelasPrecoApi } from '@/lib/api/tabelasPreco';
import type { ProdutoGCRow } from '@/lib/api/produtosGC';
import type { Proposal as ProposalPrintType, PaymentOption } from '@/types/proposal';

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
  tabelaPrecoId?: string;
}

interface PropostaTermo {
  id: string;
  title: string;
  description: string;
}

// PMT formula (Price) for leasing with interest
function calcPMT(pv: number, rate: number, n: number): number {
  if (rate === 0) return pv / n;
  const r = rate / 100; // monthly rate as decimal
  return pv * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
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
  const { company } = useCompany();
  const { printProposal } = usePrintProposal();
  const { savedTerms } = useProposal();
  const { criarOrcamentoGC } = useGC();
  const [searchParams] = useSearchParams();
  const isNew = !id;

  const [saving, setSaving] = useState(false);
  const [uploadingAnexos, setUploadingAnexos] = useState(false);
  const [carregandoGC, setCarregandoGC] = useState(false);
  const [gcOrcamentoUrl, setGcOrcamentoUrl] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [defaultTabelaPrecoId, setDefaultTabelaPrecoId] = useState('');
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
  const [anexos, setAnexos] = useState<any[]>([]);
  const [validadeDias, setValidadeDias] = useState('10');
  const [condicoesPagamento, setCondicoesPagamento] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [observacoesInternas, setObservacoesInternas] = useState('');
  const [opcoesPagamento, setOpcoesPagamento] = useState<PaymentOption[]>([
    { id: crypto.randomUUID(), forma: 'leasing', parcelas: 36, entrada: 0, juros: 0 },
  ]);
  const [descontoAVista, setDescontoAVista] = useState(0);
  const taxaJuros = 2.303;
  const [leasingDialogOpen, setLeasingDialogOpen] = useState(false);
  const [status, setStatus] = useState<string>('rascunho');
  const [versao, setVersao] = useState(1);
  const [linkUuid, setLinkUuid] = useState('');

  // Load price tables
  const { data: tabelasPreco = [] } = useQuery({
    queryKey: ['tabelas_preco'],
    queryFn: tabelasPrecoApi.getAll,
  });

  // Load all prices (all tables) for per-product price table selection
  const { data: allPrecos = [] } = useQuery({
    queryKey: ['all_precos'],
    queryFn: async () => {
      const { data } = await supabase.from('precos_produto').select('*');
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Set default price table on load
  useEffect(() => {
    if (tabelasPreco.length > 0 && !defaultTabelaPrecoId) {
      const principal = tabelasPreco.find(t => t.principal);
      setDefaultTabelaPrecoId(principal?.id || tabelasPreco[0].id);
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

  // Helper: get price for a product from a specific table
  const getPrecoFromTabela = (produtoUuid: string, tabelaId: string) => {
    const preco = allPrecos.find(pp => pp.produto_id === produtoUuid && pp.tabela_preco_id === tabelaId);
    return preco?.valor_venda && preco.valor_venda > 0 ? preco.valor_venda : null;
  };

  // Handle per-product price table change
  const handleProductTabelaChange = (idx: number, newTabelaId: string) => {
    setProdutos(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      if (!p.gcProdutoId || !produtosGcMap) return { ...p, tabelaPrecoId: newTabelaId };
      const produtoUuid = produtosGcMap.get(p.gcProdutoId);
      if (!produtoUuid) return { ...p, tabelaPrecoId: newTabelaId };
      const novoPreco = getPrecoFromTabela(produtoUuid, newTabelaId);
      if (novoPreco !== null) {
        const sub = p.quantity * novoPreco;
        return { ...p, tabelaPrecoId: newTabelaId, unitPrice: novoPreco, totalPrice: sub - (sub * (p.discount || 0) / 100) };
      }
      return { ...p, tabelaPrecoId: newTabelaId };
    }));
  };

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
      const loadedProdutos = (proposta.produtos as PropostaProduct[]) ?? [];
      // Enrich products that have gcProdutoId but missing photoUrl
      const gcIds = loadedProdutos
        .filter(p => p.gcProdutoId && !p.photoUrl)
        .map(p => p.gcProdutoId!);
      if (gcIds.length > 0) {
        supabase
          .from('produtos_gc')
          .select('gc_id, foto_url')
          .in('gc_id', gcIds)
          .then(({ data }) => {
            if (data && data.length > 0) {
              const fotoMap = new Map(data.map(d => [d.gc_id, d.foto_url]));
              setProdutos(prev => prev.map(p => {
                if (p.gcProdutoId && !p.photoUrl && fotoMap.has(p.gcProdutoId)) {
                  return { ...p, photoUrl: fotoMap.get(p.gcProdutoId) || undefined };
                }
                return p;
              }));
            }
          });
      }
      setProdutos(loadedProdutos);
      setTermos((proposta.termos_condicoes as PropostaTermo[]) ?? []);
      setImagens(proposta.imagens ?? []);
      setAnexos((proposta as any).anexos ?? []);
      setValidadeDias(String(proposta.validade_dias ?? 10));
      setObservacoesInternas(proposta.observacoes_internas ?? '');
      // Load payment options from condicoes_pagamento JSON
      try {
        const cond = JSON.parse(proposta.condicoes_pagamento || '{}');
        if (cond.opcoesPagamento) {
          setOpcoesPagamento(cond.opcoesPagamento);
        } else {
          // Legacy: migrate old format
          const opts: PaymentOption[] = [];
          if (proposta.forma_pagamento && proposta.forma_pagamento !== 'avista') {
            opts.push({ id: crypto.randomUUID(), forma: proposta.forma_pagamento, parcelas: proposta.num_parcelas ?? 1, entrada: proposta.entrada_percent ?? 0, juros: cond.taxaJurosCartao ?? 0 });
          }
          if (cond.forma2 && cond.forma2 !== 'avista') {
            opts.push({ id: crypto.randomUUID(), forma: cond.forma2, parcelas: cond.parcelas2 ?? 1, entrada: cond.entradaPercent2 ?? 0, juros: cond.taxaJurosCartao2 ?? 0 });
          }
          if (opts.length > 0) setOpcoesPagamento(opts);
        }
        if (cond.descontoAVista) setDescontoAVista(cond.descontoAVista);
        if (cond.texto) setCondicoesPagamento(cond.texto);
        else setCondicoesPagamento('');
      } catch {
        setCondicoesPagamento(proposta.condicoes_pagamento ?? '');
      }
      setPrazoEntrega(proposta.prazo_entrega ?? '');
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
      const { data } = await supabase.from('clientes_gc').select('id, nome, razao_social, cnpj, cpf, cidade, estado, endereco, segmento, telefone, celular, email, gc_id').eq('id', clienteId).single();
      return data;
    },
    enabled: !!clienteId,
  });

  const handleSelectTemplate = (tplId: string) => {
    if (templateId && produtos.length > 0) {
      if (!confirm('Trocar template vai limpar os produtos. Continuar?')) return;
    }
    setTemplateId(tplId);
    const tpl = proposalTemplates.find((t) => t.id === tplId);
    if (tpl) {
      if (!titulo) setTitulo(tpl.defaultTitle);
      if (!descricao) setDescricao(tpl.defaultDescription);
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
    // Try to get price from default table
    if (defaultTabelaPrecoId && produtosGcMap) {
      const novoPreco = getPrecoFromTabela(p.id, defaultTabelaPrecoId);
      if (novoPreco !== null) preco = novoPreco;
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
      tabelaPrecoId: defaultTabelaPrecoId || undefined,
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

  const toPrintStatus = (value: string): 'draft' | 'sent' | 'approved' | 'rejected' => {
    if (value === 'enviada') return 'sent';
    if (value === 'aprovada') return 'approved';
    if (value === 'recusada') return 'rejected';
    return 'draft';
  };

  const buildPrintProposal = (): Partial<ProposalPrintType> => ({
    number: numero,
    createdAt: proposta?.created_at ? new Date(proposta.created_at) : new Date(),
    validUntil: validadeAte,
    client: {
      id: clienteSelecionado?.id || clienteId || '',
      name: clienteSelecionado?.razao_social || clienteSelecionado?.nome || 'Cliente',
      email: clienteSelecionado?.email || undefined,
      phone: clienteSelecionado?.telefone || clienteSelecionado?.celular || undefined,
      address: clienteSelecionado?.endereco || undefined,
      cnpj: clienteSelecionado?.cnpj || undefined,
    },
    title: titulo,
    description: descricao,
    products: produtos.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      unit: p.unit,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      totalPrice: p.totalPrice,
      discount: p.discount,
      photoUrl: p.photoUrl,
    })),
    termsConditions: termos.map((t) => ({ id: t.id, title: t.title, description: t.description })),
    images: imagens.map((img) => ({ id: img.id, url: img.url, name: img.name || 'Imagem' })),
    totalValue: total,
    status: toPrintStatus(status),
    companyName: company.name,
    companyPhone: company.phone,
    companyEmail: company.email || undefined,
    templateId: templateId || undefined,
    opcoesPagamento,
    taxaJuros,
    descontoAVista,
  });

  const handleSave = async (newStatus?: string) => {
    if (!titulo.trim()) { toast({ title: 'Informe o título da proposta', variant: 'destructive' }); return; }
    if (uploadingAnexos) { toast({ title: 'Aguarde o upload dos anexos terminar', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
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
        anexos: anexos as any,
        valor_total: total,
        desconto_total: descontoTotal,
        validade_dias: parseInt(validadeDias) || 10,
        validade_ate: validadeAte.toISOString(),
        observacoes_internas: observacoesInternas || null,
        forma_pagamento: formaPagamento || null,
        num_parcelas: numParcelas,
        entrada_percent: entradaPercent,
        taxa_juros: 2.303,
        condicoes_pagamento: JSON.stringify({ forma2: formaPagamento2, parcelas2: numParcelas2, texto: condicoesPagamento || '', descontoAVista, entradaPercent2, taxaJurosCartao, taxaJurosCartao2 }),
        prazo_entrega: prazoEntrega || null,
      };

      if (isNew) {
        const created = await createProposta(payload);
        toast({ title: '💾 Proposta salva!' });
        navigate(`/propostas/${created.id}`, { replace: true });
      } else {
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

  const getPublicProposalBaseUrl = () => {
    const envBaseUrl = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;
    if (envBaseUrl) return envBaseUrl.replace(/\/$/, '');

    const hostname = window.location.hostname;
    const isPreviewHost =
      hostname.includes('--id-preview--') ||
      hostname.includes('id-preview--') ||
      hostname.endsWith('.lovableproject.com');

    if (isPreviewHost) {
      return 'https://proposal-palooza-07.lovable.app';
    }

    return window.location.origin;
  };

  const handleSendLink = async () => {
    await handleSave('enviada');
    const uuid = proposta?.link_publico_uuid || linkUuid;
    if (uuid) {
      const url = `${getPublicProposalBaseUrl()}/p/${uuid}`;
      setShareUrl(url);
      setShareOpen(true);
    }
  };

  const handleExportPdf = async () => {
    try {
      await printProposal(buildPrintProposal(), company);
    } catch (err: any) {
      toast({ title: 'Erro ao exportar PDF', description: err?.message, variant: 'destructive' });
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

  const handleAnexoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user?.id) return;
    setUploadingAnexos(true);
    try {
      for (const file of Array.from(files)) {
        const fileId = crypto.randomUUID();
        const ext = file.name.split('.').pop() || 'bin';
        const path = `${user.id}/${fileId}.${ext}`;
        const { error } = await supabase.storage.from('proposals').upload(path, file, { upsert: false });
        if (error) {
          toast({ title: `Erro ao enviar ${file.name}`, description: error.message, variant: 'destructive' });
          continue;
        }
        setAnexos((prev) => [...prev, {
          id: fileId,
          storagePath: path,
          name: file.name,
          type: file.type,
          size: file.size,
        }]);
      }
    } finally {
      setUploadingAnexos(false);
      e.target.value = '';
    }
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
            <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => handleSave()} disabled={saving || uploadingAnexos}>
              <Save className="h-3.5 w-3.5" /> {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button size="sm" className="gap-1.5 shrink-0" onClick={handleSendLink} disabled={saving || uploadingAnexos}>
              <Send className="h-3.5 w-3.5" /> Enviar Link
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={handleExportPdf} disabled={saving || uploadingAnexos}>
              <Printer className="h-3.5 w-3.5" /> PDF
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{clienteSelecionado.razao_social || clienteSelecionado.nome}</p>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setClienteId(''); setClienteBusca(''); }}>Trocar</Button>
                </div>
                {clienteSelecionado.nome !== clienteSelecionado.razao_social && clienteSelecionado.razao_social && (
                  <p className="text-xs text-muted-foreground">Nome fantasia: {clienteSelecionado.nome}</p>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {clienteSelecionado.cnpj && <p><span className="font-medium text-foreground">CNPJ:</span> {clienteSelecionado.cnpj}</p>}
                  {clienteSelecionado.cpf && <p><span className="font-medium text-foreground">CPF:</span> {clienteSelecionado.cpf}</p>}
                  {clienteSelecionado.segmento && <p><span className="font-medium text-foreground">Segmento:</span> {clienteSelecionado.segmento}</p>}
                  {(clienteSelecionado.telefone || clienteSelecionado.celular) && (
                    <p><span className="font-medium text-foreground">Tel:</span> {clienteSelecionado.telefone || clienteSelecionado.celular}</p>
                  )}
                  {clienteSelecionado.email && <p><span className="font-medium text-foreground">Email:</span> {clienteSelecionado.email}</p>}
                  {(clienteSelecionado.cidade || clienteSelecionado.estado) && (
                    <p><span className="font-medium text-foreground">Cidade:</span> {[clienteSelecionado.cidade, clienteSelecionado.estado].filter(Boolean).join(' / ')}</p>
                  )}
                </div>
                {clienteSelecionado.endereco && (
                  <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Endereço:</span> {clienteSelecionado.endereco}</p>
                )}
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
                {tabelasPreco.length > 0 && p.gcProdutoId && (
                  <div>
                    <Label className="text-[10px]">Tabela de Preço</Label>
                    <Select value={p.tabelaPrecoId || ''} onValueChange={(v) => handleProductTabelaChange(i, v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Tabela..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tabelasPreco.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nome} {t.principal ? '⭐' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
            {/* Selectable saved terms */}
            {(() => {
              const available = savedTerms.filter(st =>
                st.templateIds.length === 0 || (templateId && st.templateIds.includes(templateId))
              );
              if (available.length === 0) return (
                <p className="text-sm text-muted-foreground">Nenhum termo disponível para este template.</p>
              );
              return (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Selecione os termos desejados:</p>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 border rounded-lg p-2">
                    {available.map((st) => {
                      const isSelected = termos.some(t => t.id === st.id);
                      return (
                        <label
                          key={st.id}
                          className={`flex items-start gap-2 p-2 rounded-md cursor-pointer transition-colors text-sm ${
                            isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setTermos(prev => prev.filter(t => t.id !== st.id));
                              } else {
                                setTermos(prev => [...prev, { id: st.id, title: st.title, description: st.description }]);
                              }
                            }}
                            className="mt-0.5 rounded border-border"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{st.title}</span>
                            <p className="text-xs text-muted-foreground line-clamp-2">{st.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Selected terms summary */}
            {termos.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Termos selecionados ({termos.length}):</p>
                {termos.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm border rounded-md p-2">
                    <span className="flex-1 font-medium truncate">{t.title}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => setTermos(prev => prev.filter(x => x.id !== t.id))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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

        {/* Section 7b: Anexos */}
        <Section title={`Anexos (${anexos.length})`} icon="📎" defaultOpen={false}>
          <div className="space-y-3">
            <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" onChange={handleAnexoUpload} className="hidden" id="anexo-upload" />
            <Button size="sm" variant="outline" className="gap-1" onClick={() => document.getElementById('anexo-upload')?.click()}>
              <FileText className="h-3 w-3" /> Adicionar Anexo
            </Button>
            <p className="text-xs text-muted-foreground">PDF, Word, Excel, PowerPoint, TXT, CSV</p>
            {anexos.length > 0 && (
              <div className="space-y-2">
                {anexos.map((anexo: any, i: number) => (
                  <div key={anexo.id} className="flex items-center gap-2 border rounded-md p-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{anexo.name}</p>
                      <p className="text-xs text-muted-foreground">{(anexo.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => setAnexos((prev) => prev.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

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

            {/* À Vista — sempre visível */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3 space-y-2">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">💵 À Vista (PIX / Transferência)</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Desconto à vista (%)</Label>
                  <Input type="number" min={0} max={100} step={0.5} value={descontoAVista || ''} onChange={(e) => setDescontoAVista(parseFloat(e.target.value) || 0)} className="h-8" placeholder="0" />
                </div>
                <div className="flex items-end">
                  <p className="text-sm font-bold text-primary">
                    {formatBRL(total * (1 - (descontoAVista || 0) / 100))}
                    {descontoAVista > 0 && <span className="text-xs font-normal text-muted-foreground ml-1">(-{descontoAVista}%)</span>}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Opção 1 de Pagamento */}
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Opção 1</Badge>
                <Select value={formaPagamento} onValueChange={(v) => {
                  setFormaPagamento(v);
                  if (v === 'leasing' && numParcelas < 12) setNumParcelas(36);
                }}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                    <SelectItem value="leasing">Leasing / Locação</SelectItem>
                    <SelectItem value="financiamento">Financiamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formaPagamento && formaPagamento !== 'leasing' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Entrada (%)</Label>
                    <Input type="number" min={0} max={100} value={entradaPercent || ''} onChange={(e) => setEntradaPercent(parseFloat(e.target.value) || 0)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Nº Parcelas</Label>
                    <Input type="number" min={1} max={120} value={numParcelas} onChange={(e) => setNumParcelas(parseInt(e.target.value) || 1)} className="h-8" />
                  </div>
                </div>
              )}
              {formaPagamento === 'cartao' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Juros cartão (% a.m.)</Label>
                    <Input type="number" min={0} max={10} step={0.01} value={taxaJurosCartao || ''} onChange={(e) => setTaxaJurosCartao(parseFloat(e.target.value) || 0)} className="h-8" placeholder="0" />
                  </div>
                  <div className="flex items-end">
                    <p className="text-sm font-bold text-primary">
                      {formatBRL(taxaJurosCartao > 0 ? calcPMT(total * (1 - (entradaPercent || 0) / 100), taxaJurosCartao, numParcelas || 1) : (total * (1 - (entradaPercent || 0) / 100)) / (numParcelas || 1))}/mês
                    </p>
                  </div>
                </div>
              )}
              {formaPagamento && formaPagamento !== 'leasing' && formaPagamento !== 'cartao' && (
                <div className="flex items-end">
                  <p className="text-sm font-bold text-primary">
                    {entradaPercent > 0 && <span className="text-xs font-normal text-muted-foreground mr-1">Entrada: {formatBRL(total * entradaPercent / 100)} + </span>}
                    {formatBRL((total * (1 - (entradaPercent || 0) / 100)) / (numParcelas || 1))}/mês
                  </p>
                </div>
              )}
              {formaPagamento === 'leasing' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Prazo (meses)</Label>
                    <Input type="number" min={1} max={60} value={numParcelas || ''} onChange={(e) => setNumParcelas(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)} className="h-8" />
                  </div>
                  <div className="flex items-end">
                    <p className="text-sm font-bold text-primary">{formatBRL(calcPMT(total, taxaJuros, numParcelas || 36))}/mês</p>
                  </div>
                </div>
              )}
            </div>

            {/* Opção 2 de Pagamento */}
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Opção 2</Badge>
                <Select value={formaPagamento2} onValueChange={(v) => {
                  setFormaPagamento2(v);
                  if (v === 'leasing' && numParcelas2 < 12) setNumParcelas2(36);
                }}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                    <SelectItem value="leasing">Leasing / Locação</SelectItem>
                    <SelectItem value="financiamento">Financiamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formaPagamento2 && formaPagamento2 !== 'leasing' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Entrada (%)</Label>
                    <Input type="number" min={0} max={100} value={entradaPercent2 || ''} onChange={(e) => setEntradaPercent2(parseFloat(e.target.value) || 0)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Nº Parcelas</Label>
                    <Input type="number" min={1} max={120} value={numParcelas2} onChange={(e) => setNumParcelas2(parseInt(e.target.value) || 1)} className="h-8" />
                  </div>
                </div>
              )}
              {formaPagamento2 === 'cartao' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Juros cartão (% a.m.)</Label>
                    <Input type="number" min={0} max={10} step={0.01} value={taxaJurosCartao2 || ''} onChange={(e) => setTaxaJurosCartao2(parseFloat(e.target.value) || 0)} className="h-8" placeholder="0" />
                  </div>
                  <div className="flex items-end">
                    <p className="text-sm font-bold text-primary">
                      {formatBRL(taxaJurosCartao2 > 0 ? calcPMT(total * (1 - (entradaPercent2 || 0) / 100), taxaJurosCartao2, numParcelas2 || 1) : (total * (1 - (entradaPercent2 || 0) / 100)) / (numParcelas2 || 1))}/mês
                    </p>
                  </div>
                </div>
              )}
              {formaPagamento2 && formaPagamento2 !== 'leasing' && formaPagamento2 !== 'cartao' && (
                <div className="flex items-end">
                  <p className="text-sm font-bold text-primary">
                    {entradaPercent2 > 0 && <span className="text-xs font-normal text-muted-foreground mr-1">Entrada: {formatBRL(total * entradaPercent2 / 100)} + </span>}
                    {formatBRL((total * (1 - (entradaPercent2 || 0) / 100)) / (numParcelas2 || 1))}/mês
                  </p>
                </div>
              )}
              {formaPagamento2 === 'leasing' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Prazo (meses)</Label>
                    <Input type="number" min={1} max={60} value={numParcelas2 || ''} onChange={(e) => setNumParcelas2(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)} className="h-8" />
                  </div>
                  <div className="flex items-end">
                    <p className="text-sm font-bold text-primary">{formatBRL(calcPMT(total, taxaJuros, numParcelas2 || 36))}/mês</p>
                  </div>
                </div>
              )}
            </div>

            {/* Leasing benefits summary (if either option is leasing) */}
            {(formaPagamento === 'leasing' || formaPagamento2 === 'leasing') && total > 0 && (() => {
              const leasingParcelas = formaPagamento === 'leasing' ? numParcelas : numParcelas2;
              const parcelaLeasing = calcPMT(total, taxaJuros, leasingParcelas || 36);
              return (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 space-y-2 text-sm">
                  <p className="font-medium text-foreground flex items-center gap-1">🏦 Simulação Leasing</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Parcela ({taxaJuros.toFixed(3).replace('.', ',')}% a.m.)</p>
                      <p className="text-lg font-bold text-primary">{formatBRL(parcelaLeasing)}/mês</p>
                    </div>
                    <div className="bg-emerald-100 dark:bg-emerald-900/40 rounded-lg p-2">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Após benefícios fiscais</p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatBRL(parcelaLeasing * (1 - 0.4325))}/mês</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total financiado: {formatBRL(parcelaLeasing * (leasingParcelas || 36))} (juros: {formatBRL(parcelaLeasing * (leasingParcelas || 36) - total)})
                  </p>
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
              );
            })()}

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
      <CatalogPickerModal open={catalogOpen} onClose={() => setCatalogOpen(false)} onSelect={addProductFromCatalog} tabelaPrecoId={defaultTabelaPrecoId} />

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
