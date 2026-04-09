import { useState, useEffect, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Calculator, FileText, Download, Search, TrendingUp,
  DollarSign, Clock, Zap, Check, Droplets, Flame, Star,
  ExternalLink, Loader2, UtensilsCrossed, ChefHat,
  Save, FolderOpen, Trash2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/* ═══════════════════════════════════════════════ */
/*  HELPERS                                        */
/* ═══════════════════════════════════════════════ */

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatNum = (v: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(v);

const EQUIPAMENTOS = [
  'iCombi Pro 6-1/1', 'iCombi Pro 10-1/1', 'iCombi Pro 10-2/1',
  'iCombi Pro 20-1/1', 'iCombi Pro 20-2/1', 'iCombi Classic 6-1/1',
  'iCombi Classic 10-1/1', 'iCombi Classic 10-2/1', 'iCombi Classic 20-1/1',
  'iVario Pro 2-S', 'iVario Pro L',
];

/* ═══════════════════════════════════════════════ */
/*  TIPOS                                          */
/* ═══════════════════════════════════════════════ */

interface PratoAnalisado {
  prato: string;
  preco_venda: number;
  insumo_match: string;
  custo_porcao: number;
  participacao_vendas: number;
  porcoes_dia: number;
  custo_mensal: number;
  tipo_coccao: string;
  usa_oleo: boolean;
}

interface MateriaPrimaCategoria {
  kg_mes: number;
  preco_medio_kg: number;
  custo_mensal: number;
  itens: string[];
}

interface MateriasPrimas {
  carnes: MateriaPrimaCategoria;
  aves: MateriaPrimaCategoria;
  legumes_guarnicoes: MateriaPrimaCategoria;
  pescados: MateriaPrimaCategoria;
}

interface AnaliseResult {
  restaurante: {
    nome: string;
    nota_ifood?: number;
    qtd_pratos_cardapio: number;
    ticket_medio?: number;
    tipo_operacao_inferido: string;
    metodo_coccao_predominante: string;
    categorias: string[];
  };
  pratos_analisados: PratoAnalisado[];
  materias_primas: MateriasPrimas;
  totais_mensais: {
    energia_kwh: number;
    custo_kwh_usado: number;
    energia_reais: number;
    gordura_litros: number;
    gordura_reais: number;
    horas_cozinha: number;
    custo_hora: number;
    mao_obra_reais: number;
    agua_descalcificacao_reais: number;
    custo_total_operacional: number;
    // legacy field kept for backward compat
    proteinas_reais?: number;
  };
  resumo_economia_rational: {
    economia_proteina_20pct: number;
    economia_energia_50pct: number;
    economia_gordura_80pct: number;
    economia_mao_obra_40pct: number;
    economia_agua_100pct: number;
    economia_mensal_total: number;
    economia_anual: number;
  };
}

/* ═══════════════════════════════════════════════ */
/*  Matéria-prima state helper                     */
/* ═══════════════════════════════════════════════ */

interface CategoriaMP {
  label: string;
  icon: string;
  kgMes: number;
  precoKg: number;
  pctEconomia: number;
}

const DEFAULT_CATEGORIAS_MP: CategoriaMP[] = [
  { label: 'Carnes', icon: '🥩', kgMes: 0, precoKg: 0, pctEconomia: 25 },
  { label: 'Aves', icon: '🍗', kgMes: 0, precoKg: 0, pctEconomia: 25 },
  { label: 'Legumes / Guarnições', icon: '🥦', kgMes: 0, precoKg: 0, pctEconomia: 25 },
  { label: 'Pescados', icon: '🐟', kgMes: 0, precoKg: 0, pctEconomia: 25 },
];

/* ═══════════════════════════════════════════════ */
/*  COMPONENTE PRINCIPAL                          */
/* ═══════════════════════════════════════════════ */

export default function SimuladorROI() {
  const { user } = useAuth();
  const pdfRef = useRef<HTMLDivElement>(null);

  // ── BLOCO A: CLIENTE + EQUIPAMENTO ──
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [propostaId, setPropostaId] = useState('');
  const [equipamento, setEquipamento] = useState('iCombi Pro 10-1/1');
  const [quantidade, setQuantidade] = useState(1);
  const [valorInvestimento, setValorInvestimento] = useState(0);
  const [manualMode, setManualMode] = useState(false);

  // ── BLOCO B: Cardápio ──
  const [cardapioUrl, setCardapioUrl] = useState('');
  const [refeicoesDia, setRefeicoesDia] = useState(200);
  const [diasMes, setDiasMes] = useState(26);
  const [analisando, setAnalisando] = useState(false);
  const [analiseResult, setAnaliseResult] = useState<AnaliseResult | null>(null);

  // ── BLOCO C: CUSTOS ──
  // Matérias-primas por categoria (4 linhas)
  const [categoriasMP, setCategoriasMP] = useState<CategoriaMP[]>(DEFAULT_CATEGORIAS_MP);

  const [custoEnergia, setCustoEnergia] = useState(0);
  const [custoKwh, setCustoKwh] = useState(0.80);
  const [custoGordura, setCustoGordura] = useState(0);
  const [horasEconomizadas, setHorasEconomizadas] = useState(0);
  const [custoHora, setCustoHora] = useState(23);
  const [custoAgua, setCustoAgua] = useState(0);

  // ── BLOCO D: PERCENTUAIS (não-MP) ──
  const [pctEnergia, setPctEnergia] = useState(50);
  const [pctGordura, setPctGordura] = useState(80);
  const [pctMaoDeObra, setPctMaoDeObra] = useState(40);
  const [pctAgua, setPctAgua] = useState(true);

  const [gerando, setGerando] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  // Helper to update a single categoria MP field
  const updateCategoriaMP = (index: number, field: keyof CategoriaMP, value: number) => {
    setCategoriasMP(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  // ── QUERIES ──
  const { data: clientes } = useQuery({
    queryKey: ['clientes_roi'],
    queryFn: async () => {
      const all: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase
          .from('clientes_gc')
          .select('id, nome, razao_social, cidade, estado, cnpj')
          .eq('ativo', true)
          .order('nome')
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });

  const { data: propostas } = useQuery({
    queryKey: ['propostas_roi', clienteSelecionado?.id],
    queryFn: async () => {
      if (!clienteSelecionado) return [];
      const { data } = await supabase
        .from('propostas')
        .select('id, numero, titulo, valor_total, produtos')
        .eq('cliente_id', clienteSelecionado.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!clienteSelecionado,
  });

  // Auto-preenche da proposta
  useEffect(() => {
    if (!propostaId || !propostas) return;
    const p = propostas.find((x: any) => x.id === propostaId);
    if (!p) return;
    setValorInvestimento(p.valor_total || 0);
    const prods = Array.isArray(p.produtos) ? p.produtos : [];
    if (prods.length > 0) {
      const first = prods[0] as any;
      if (first?.nome) setEquipamento(first.nome);
      if (first?.quantidade) setQuantidade(first.quantidade);
    }
  }, [propostaId, propostas]);

  // ── ANÁLISE CARDÁPIO ──
  const handleAnalisar = async () => {
    if (!cardapioUrl) {
      toast.error('Cole o link do cardápio do cliente');
      return;
    }
    if (!refeicoesDia || refeicoesDia < 10) {
      toast.error('Informe o volume de refeições por dia (mínimo 10)');
      return;
    }

    setAnalisando(true);
    setAnaliseResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-restaurant-menu', {
        body: { cardapio_url: cardapioUrl, refeicoes_dia: refeicoesDia, dias_mes: diasMes },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro na análise');

      const result = data.data as AnaliseResult;
      setAnaliseResult(result);
      if (data.completeness?.is_complete === false) {
        toast.warning(`Análise parcial: ${data.completeness.analyzed_dishes}/${data.completeness.expected_dishes} pratos processados.`);
      } else {
        toast.success(`Cardápio de "${result.restaurante.nome}" analisado com sucesso!`);
      }
    } catch (err: any) {
      console.error('Erro ao analisar:', err);
      toast.error(err.message || 'Erro ao analisar cardápio');
    } finally {
      setAnalisando(false);
    }
  };

  const handleUsarValoresAnalise = () => {
    if (!analiseResult) return;
    const t = analiseResult.totais_mensais;
    const mp = analiseResult.materias_primas;

    // Fill 4 categories from analysis
    if (mp) {
      const keys: Array<{ key: keyof MateriasPrimas; idx: number }> = [
        { key: 'carnes', idx: 0 },
        { key: 'aves', idx: 1 },
        { key: 'legumes_guarnicoes', idx: 2 },
        { key: 'pescados', idx: 3 },
      ];
      setCategoriasMP(prev => prev.map((cat, i) => {
        const mapping = keys.find(k => k.idx === i);
        if (!mapping || !mp[mapping.key]) return cat;
        const src = mp[mapping.key];
        return { ...cat, kgMes: src.kg_mes || 0, precoKg: src.preco_medio_kg || 0 };
      }));
    } else if (t.proteinas_reais) {
      // Legacy fallback: dump all into carnes
      setCategoriasMP(prev => prev.map((cat, i) => i === 0
        ? { ...cat, kgMes: Math.round(t.proteinas_reais! / 35), precoKg: 35 }
        : cat
      ));
    }

    setCustoEnergia(t.energia_reais);
    setCustoKwh(t.custo_kwh_usado);
    setCustoGordura(t.gordura_reais);
    setHorasEconomizadas(t.horas_cozinha);
    setCustoHora(t.custo_hora);
    setCustoAgua(t.agua_descalcificacao_reais);
    toast.success('Valores preenchidos com base na análise!');
  };

  // ── CÁLCULOS ──
  const economia = useMemo(() => {
    // Economia por categoria de MP
    const econMP = categoriasMP.map(c => ({
      label: c.label,
      icon: c.icon,
      custoAtual: c.kgMes * c.precoKg,
      pct: c.pctEconomia,
      economia: c.kgMes * c.precoKg * (c.pctEconomia / 100),
    }));
    const totalEconMP = econMP.reduce((s, c) => s + c.economia, 0);

    const econEnergia = custoEnergia * (pctEnergia / 100);
    const econGordura = custoGordura * (pctGordura / 100);
    const econMaoDeObra = horasEconomizadas * custoHora * (pctMaoDeObra / 100);
    const econAgua = pctAgua ? custoAgua : 0;
    const mensal = totalEconMP + econEnergia + econGordura + econMaoDeObra + econAgua;
    const anual = mensal * 12;
    const paybackMeses = mensal > 0 ? Math.ceil(valorInvestimento / mensal) : 0;
    const roi12m = valorInvestimento > 0
      ? ((anual - valorInvestimento) / valorInvestimento) * 100
      : 0;
    const em5anos = anual * 5;

    return {
      mp: econMP,
      totalMP: totalEconMP,
      energia: econEnergia,
      gordura: econGordura,
      maoDeObra: econMaoDeObra,
      agua: econAgua,
      mensal,
      anual,
      paybackMeses,
      roi12m,
      em5anos,
    };
  }, [categoriasMP, custoEnergia, custoGordura, horasEconomizadas, custoHora, custoAgua, pctEnergia, pctGordura, pctMaoDeObra, pctAgua, valorInvestimento]);

  // ── GRÁFICO DE PAYBACK ──
  const chartData = useMemo(() => {
    const meses = [];
    for (let i = 0; i <= 36; i++) {
      meses.push({
        mes: i,
        economiaAcumulada: economia.mensal * i,
        investimento: valorInvestimento,
        isPayback: economia.paybackMeses > 0 && i === economia.paybackMeses,
        beforePayback: i <= economia.paybackMeses ? economia.mensal * i : undefined,
        afterPayback: i >= economia.paybackMeses ? economia.mensal * i : undefined,
      });
    }
    return meses;
  }, [economia.mensal, economia.paybackMeses, valorInvestimento]);

  // ── PDF ──
  const handleGerarPdf = async () => {
    if (!pdfRef.current) return;
    setShowPdf(true);
    setGerando(true);

    await new Promise((r) => setTimeout(r, 500));

    try {
      const pages = pdfRef.current.querySelectorAll('.pdf-page');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = 210;
      const pdfH = 297;

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
      }

      const nomeCliente = clienteSelecionado?.nome || 'Cliente';
      pdf.save(`ROI_${nomeCliente.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGerando(false);
    }
  };

  const clientesFiltrados = useMemo(() => {
    const termo = clienteSearch.trim().toLowerCase();
    if (!termo) return clientes ?? [];

    return (clientes ?? []).filter((c: any) => {
      const nome = c.nome?.toLowerCase() ?? '';
      const razaoSocial = c.razao_social?.toLowerCase() ?? '';
      const cidade = c.cidade?.toLowerCase() ?? '';
      const estado = c.estado?.toLowerCase() ?? '';
      const cnpj = c.cnpj?.replace(/\D/g, '') ?? '';
      const termoNumerico = termo.replace(/\D/g, '');

      return (
        nome.includes(termo) ||
        razaoSocial.includes(termo) ||
        cidade.includes(termo) ||
        estado.includes(termo) ||
        (termoNumerico.length > 0 && cnpj.includes(termoNumerico))
      );
    });
  }, [clientes, clienteSearch]);

  // ── TABELA ECONOMIA PARA PDF ──
  const tabelaEconomia = [
    ...economia.mp.map(c => ({
      categoria: `${c.label} (−${c.pct}%)`,
      atual: c.custoAtual,
      comRational: c.custoAtual - c.economia,
      economia: c.economia,
      icon: c.icon,
    })),
    {
      categoria: `Energia (−${pctEnergia}%)`,
      atual: custoEnergia,
      comRational: custoEnergia - economia.energia,
      economia: economia.energia,
      icon: '⚡',
    },
    {
      categoria: `Gordura (−${pctGordura}%)`,
      atual: custoGordura,
      comRational: custoGordura - economia.gordura,
      economia: economia.gordura,
      icon: '🫒',
    },
    {
      categoria: `Mão de obra (−${pctMaoDeObra}%)`,
      atual: horasEconomizadas * custoHora,
      comRational: horasEconomizadas * custoHora - economia.maoDeObra,
      economia: economia.maoDeObra,
      icon: '👨‍🍳',
    },
    {
      categoria: 'Trat. água (−100%)',
      atual: custoAgua,
      comRational: 0,
      economia: economia.agua,
      icon: '💧',
    },
  ];

  // ── SALVAR / CARREGAR SIMULAÇÕES ──
  const [salvando, setSalvando] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);

  const { data: simulacoesSalvas, refetch: refetchSimulacoes } = useQuery({
    queryKey: ['simulacoes_roi', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('simulacoes_roi')
        .select('*')
        .order('updated_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const handleSalvar = async () => {
    if (!user) { toast.error('Faça login para salvar'); return; }
    const nome = clienteSelecionado?.nome || 'Simulação sem cliente';
    setSalvando(true);
    try {
      const payload = {
        vendedor_id: user.id,
        nome_restaurante: nome,
        url_cardapio: cardapioUrl || null,
        materias_primas: categoriasMP as any,
        custo_energia: custoEnergia,
        custo_gordura: custoGordura,
        custo_mao_obra: horasEconomizadas * custoHora,
        custo_agua: custoAgua,
        refeicoes_dia: refeicoesDia,
        dias_mes: diasMes,
        resultado_analise: analiseResult as any,
        economia_mensal: economia.mensal,
        economia_anual: economia.anual,
      };
      const { error } = await supabase.from('simulacoes_roi').insert(payload);
      if (error) throw error;
      toast.success('Simulação salva!');
      refetchSimulacoes();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const handleCarregar = (sim: any) => {
    const mp = sim.materias_primas;
    if (Array.isArray(mp) && mp.length === 4) {
      setCategoriasMP(mp.map((c: any, i: number) => ({
        ...DEFAULT_CATEGORIAS_MP[i],
        kgMes: c.kgMes ?? 0,
        precoKg: c.precoKg ?? 0,
        pctEconomia: c.pctEconomia ?? 25,
      })));
    }
    setCustoEnergia(sim.custo_energia ?? 0);
    setCustoGordura(sim.custo_gordura ?? 0);
    setCustoAgua(sim.custo_agua ?? 0);
    setRefeicoesDia(sim.refeicoes_dia ?? 200);
    setDiasMes(sim.dias_mes ?? 26);
    setCardapioUrl(sim.url_cardapio ?? '');
    if (sim.resultado_analise) setAnaliseResult(sim.resultado_analise);
    setLoadDialogOpen(false);
    toast.success(`Simulação "${sim.nome_restaurante}" carregada!`);
  };

  const handleExcluirSimulacao = async (id: string) => {
    const { error } = await supabase.from('simulacoes_roi').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else { toast.success('Excluída'); refetchSimulacoes(); }
  };

  /* ═══════════════════════════════════════════════ */
  /*  RENDER                                        */
  /* ═══════════════════════════════════════════════ */

  return (
    <MainLayout>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calculator className="h-6 w-6 text-[#87B537]" />
              Simulador de Retorno do Investimento
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Analise o cardápio real do restaurante e calcule o payback do equipamento Rational
            </p>
          </div>
            <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleSalvar} disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
            <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderOpen className="h-4 w-4 mr-1" /> Carregar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Simulações salvas</DialogTitle>
                </DialogHeader>
                {!simulacoesSalvas?.length ? (
                  <p className="text-muted-foreground text-sm py-4">Nenhuma simulação salva.</p>
                ) : (
                  <div className="space-y-2">
                    {simulacoesSalvas.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                        <button onClick={() => handleCarregar(s)} className="text-left flex-1">
                          <p className="font-medium text-sm">{s.nome_restaurante}</p>
                          <p className="text-xs text-muted-foreground">
                            Economia: {formatBRL(s.economia_mensal)}/mês · {new Date(s.updated_at).toLocaleDateString('pt-BR')}
                          </p>
                        </button>
                        <Button variant="ghost" size="icon" onClick={() => handleExcluirSimulacao(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>
            {economia.mensal > 0 && (
              <Button
                onClick={handleGerarPdf}
                disabled={gerando}
                className="bg-[#87B537] hover:bg-[#6f9a2c] text-white"
                size="sm"
              >
                {gerando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
                Gerar PDF
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* ── COLUNA ESQUERDA: FORMULÁRIO ── */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* BLOCO A: Cliente + Proposta */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4" /> Cliente & Equipamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cliente autocomplete */}
                  <div className="space-y-2">
                    <Label>Buscar cliente</Label>
                    <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start font-normal">
                          {clienteSelecionado ? clienteSelecionado.nome : 'Selecionar cliente...'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[350px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput placeholder="Buscar..." value={clienteSearch} onValueChange={setClienteSearch} />
                          <CommandList>
                            <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                            <CommandGroup>
                              {clientesFiltrados.slice(0, 50).map((c: any) => (
                                <CommandItem
                                  key={c.id}
                                  value={`${c.nome} ${c.razao_social ?? ''} ${c.cidade ?? ''} ${c.estado ?? ''} ${c.cnpj ?? ''}`}
                                  onSelect={() => {
                                    setClienteSelecionado(c);
                                    setClienteOpen(false);
                                    setClienteSearch('');
                                    setPropostaId('');
                                  }}
                                >
                                  <div>
                                    <div className="font-medium">{c.nome}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {c.cidade}/{c.estado} {c.cnpj && `• ${c.cnpj}`}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Proposta */}
                  <div className="space-y-2">
                    <Label>Vincular à proposta</Label>
                    <Select value={propostaId} onValueChange={setPropostaId}>
                      <SelectTrigger>
                        <SelectValue placeholder={clienteSelecionado ? 'Selecione...' : 'Selecione um cliente primeiro'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(propostas ?? []).map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.numero} — {p.titulo} ({formatBRL(p.valor_total || 0)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Equipamento manual */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Equipamento</Label>
                    <Select value={equipamento} onValueChange={setEquipamento}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EQUIPAMENTOS.map((e) => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min={1}
                      value={quantidade}
                      onChange={(e) => setQuantidade(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor do investimento (R$)</Label>
                    <Input
                      type="number"
                      value={valorInvestimento}
                      onChange={(e) => setValorInvestimento(Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BLOCO B: Análise Cardápio */}
            <Card className="border-[#87B537]/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-[#87B537]" />
                  Analisar Cardápio do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                  <div className="space-y-2">
                    <Label>Link do cardápio online</Label>
                    <Input
                      placeholder="iFood, Goomer, site do restaurante..."
                      value={cardapioUrl}
                      onChange={(e) => setCardapioUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Refeições/dia</Label>
                    <Input
                      type="number"
                      min={10}
                      value={refeicoesDia}
                      onChange={(e) => setRefeicoesDia(Number(e.target.value))}
                      className="w-28"
                    />
                  </div>
                  <Button
                    onClick={handleAnalisar}
                    disabled={analisando}
                    className="bg-[#87B537] hover:bg-[#6f9a2c] text-white"
                  >
                    {analisando ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Analisar
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Dias operação/mês</Label>
                    <Input
                      type="number"
                      value={diasMes}
                      onChange={(e) => setDiasMes(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                </div>

                {/* Loading */}
                {analisando && (
                  <div className="bg-muted/50 rounded-lg p-6 text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#87B537]" />
                    <p className="text-sm text-muted-foreground">
                      Analisando cardápio{clienteSelecionado ? ` de ${clienteSelecionado.nome}` : ''}...
                    </p>
                    <p className="text-xs text-muted-foreground">Extraindo pratos do cardápio e calculando custos prato a prato</p>
                  </div>
                )}

                {/* Resultado */}
                {analiseResult && (
                  <div className="bg-[#87B537]/5 border border-[#87B537]/20 rounded-lg p-4 space-y-4">
                    {/* Header restaurante */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-[#87B537]" />
                          <span className="font-semibold text-lg">{analiseResult.restaurante?.nome ?? clienteSelecionado?.nome ?? 'Restaurante'}</span>
                          {analiseResult.restaurante?.nota_ifood ? (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1 text-yellow-500" />
                              {analiseResult.restaurante.nota_ifood}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          📋 {analiseResult.restaurante?.qtd_pratos_cardapio ?? '—'} pratos
                          {' • '}🍖 Predominante: {analiseResult.restaurante?.metodo_coccao_predominante ?? '—'}
                          {analiseResult.restaurante?.ticket_medio ? `${' • '}💰 Ticket médio: ${formatBRL(analiseResult.restaurante.ticket_medio)}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Tabela de pratos */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Prato</TableHead>
                            <TableHead>Insumo</TableHead>
                            <TableHead className="text-right">R$/porção</TableHead>
                            <TableHead className="text-right">% venda</TableHead>
                            <TableHead className="text-right">Custo/mês</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analiseResult.pratos_analisados.map((p, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium text-sm">{p.prato}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{p.insumo_match}</TableCell>
                              <TableCell className="text-right text-sm">{formatBRL(p.custo_porcao)}</TableCell>
                              <TableCell className="text-right text-sm">{(p.participacao_vendas * 100).toFixed(0)}%</TableCell>
                              <TableCell className="text-right text-sm font-medium">{formatBRL(p.custo_mensal)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Matérias-primas resumo da análise */}
                    {analiseResult.materias_primas && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {([
                          { key: 'carnes' as const, label: '🥩 Carnes' },
                          { key: 'aves' as const, label: '🍗 Aves' },
                          { key: 'legumes_guarnicoes' as const, label: '🥦 Legumes' },
                          { key: 'pescados' as const, label: '🐟 Pescados' },
                        ]).map(({ key, label }) => {
                          const cat = analiseResult.materias_primas[key];
                          if (!cat || cat.custo_mensal === 0) return null;
                          return (
                            <div key={key} className="bg-background rounded-lg p-3 border text-sm">
                              <div className="font-medium text-xs text-muted-foreground">{label}</div>
                              <div className="font-bold">{formatBRL(cat.custo_mensal)}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatNum(cat.kg_mes)} kg × {formatBRL(cat.preco_medio_kg)}/kg
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Botões */}
                    <div className="flex gap-3">
                      <Button onClick={handleUsarValoresAnalise} className="bg-[#87B537] hover:bg-[#6f9a2c] text-white">
                        <Check className="h-4 w-4 mr-2" /> Usar esses valores
                      </Button>
                      <Button variant="outline" onClick={() => setAnaliseResult(null)}>
                        Preencher manualmente
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BLOCO C: Custos Operacionais */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Custos Operacionais Mensais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Matérias-primas — 4 categorias */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Consumo de Matérias-Primas por Mês</Label>
                  
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground text-xs">
                          <th className="text-left py-2 pr-2">Categoria</th>
                          <th className="text-right py-2 px-2">Kg/mês</th>
                          <th className="text-right py-2 px-2">R$/kg</th>
                          <th className="text-center py-2 px-2 w-[120px]">Economia %</th>
                          <th className="text-right py-2 pl-2">Economia R$</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoriasMP.map((cat, i) => {
                          const econVal = cat.kgMes * cat.precoKg * (cat.pctEconomia / 100);
                          return (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-2 pr-2 font-medium">{cat.icon} {cat.label}</td>
                              <td className="py-2 px-2">
                                <Input
                                  type="number"
                                  min={0}
                                  className="w-24 h-8 text-right text-sm"
                                  value={cat.kgMes || ''}
                                  onChange={(e) => updateCategoriaMP(i, 'kgMes', Number(e.target.value))}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  className="w-24 h-8 text-right text-sm"
                                  value={cat.precoKg || ''}
                                  onChange={(e) => updateCategoriaMP(i, 'precoKg', Number(e.target.value))}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex items-center gap-1 justify-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={30}
                                    className="w-16 h-8 text-center text-sm font-bold text-[#87B537]"
                                    value={cat.pctEconomia}
                                    onChange={(e) => {
                                      const v = Math.min(30, Math.max(0, Number(e.target.value) || 0));
                                      updateCategoriaMP(i, 'pctEconomia', v);
                                    }}
                                  />
                                  <span className="text-xs text-[#87B537] font-bold">%</span>
                                </div>
                              </td>
                              <td className="py-2 pl-2 text-right font-medium text-[#87B537]">
                                {formatBRL(econVal)}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="font-bold border-t-2">
                          <td className="py-2 pr-2" colSpan={4}>Total economia matérias-primas</td>
                          <td className="py-2 pl-2 text-right text-[#87B537]">{formatBRL(economia.totalMP)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="sm:hidden space-y-3">
                    {categoriasMP.map((cat, i) => {
                      const econVal = cat.kgMes * cat.precoKg * (cat.pctEconomia / 100);
                      return (
                        <div key={i} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{cat.icon} {cat.label}</span>
                            <span className="font-bold text-[#87B537] text-sm">{formatBRL(econVal)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Kg/mês</Label>
                              <Input
                                type="number"
                                min={0}
                                className="h-8 text-sm text-right"
                                value={cat.kgMes || ''}
                                onChange={(e) => updateCategoriaMP(i, 'kgMes', Number(e.target.value))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">R$/kg</Label>
                              <Input
                                type="number"
                                min={0}
                                step={0.5}
                                className="h-8 text-sm text-right"
                                value={cat.precoKg || ''}
                                onChange={(e) => updateCategoriaMP(i, 'precoKg', Number(e.target.value))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Economia %</Label>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={30}
                                  className="h-8 text-sm text-center font-bold text-[#87B537]"
                                  value={cat.pctEconomia}
                                  onChange={(e) => {
                                    const v = Math.min(30, Math.max(0, Number(e.target.value) || 0));
                                    updateCategoriaMP(i, 'pctEconomia', v);
                                  }}
                                />
                                <span className="text-xs text-[#87B537] font-bold">%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between font-bold text-sm pt-2 border-t-2">
                      <span>Total economia MP</span>
                      <span className="text-[#87B537]">{formatBRL(economia.totalMP)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Outros custos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Energia/mês (R$)</Label>
                    <Input type="number" value={custoEnergia} onChange={(e) => setCustoEnergia(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Custo kWh (R$)</Label>
                    <Input type="number" step="0.01" value={custoKwh} onChange={(e) => setCustoKwh(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Gordura/óleo (R$/mês)</Label>
                    <Input type="number" value={custoGordura} onChange={(e) => setCustoGordura(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Horas cozinha/mês</Label>
                    <Input type="number" value={horasEconomizadas} onChange={(e) => setHorasEconomizadas(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Custo hora (R$)</Label>
                    <Input type="number" value={custoHora} onChange={(e) => setCustoHora(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Trat. água (R$/mês)</Label>
                    <Input type="number" value={custoAgua} onChange={(e) => setCustoAgua(Number(e.target.value))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BLOCO D: Percentuais de Economia (não-MP) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Percentuais de Economia (Rational)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Energia */}
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm flex items-center gap-2 flex-1 min-w-0">
                    <Zap className="h-4 w-4 text-yellow-500 shrink-0" /> Energia
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">(até 70%)</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={70}
                      className="w-16 h-8 text-center text-sm font-bold text-[#87B537]"
                      value={pctEnergia}
                      onChange={(e) => setPctEnergia(Math.min(70, Math.max(0, Number(e.target.value) || 0)))}
                    />
                    <span className="text-xs text-[#87B537] font-bold">%</span>
                  </div>
                </div>

                {/* Gordura */}
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm flex items-center gap-2 flex-1 min-w-0">
                    <Droplets className="h-4 w-4 text-amber-600 shrink-0" /> Gordura/Óleo
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">(até 95%)</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={95}
                      className="w-16 h-8 text-center text-sm font-bold text-[#87B537]"
                      value={pctGordura}
                      onChange={(e) => setPctGordura(Math.min(95, Math.max(0, Number(e.target.value) || 0)))}
                    />
                    <span className="text-xs text-[#87B537] font-bold">%</span>
                  </div>
                </div>

                {/* Mão de obra */}
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm flex items-center gap-2 flex-1 min-w-0">
                    <Clock className="h-4 w-4 text-blue-500 shrink-0" /> Mão de obra
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">(até 60%)</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      className="w-16 h-8 text-center text-sm font-bold text-[#87B537]"
                      value={pctMaoDeObra}
                      onChange={(e) => setPctMaoDeObra(Math.min(60, Math.max(0, Number(e.target.value) || 0)))}
                    />
                    <span className="text-xs text-[#87B537] font-bold">%</span>
                  </div>
                </div>

                {/* Água */}
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm flex items-center gap-2 flex-1 min-w-0">
                    <Droplets className="h-4 w-4 text-blue-400 shrink-0" /> Trat. água
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">(iCareSystem)</span>
                  </Label>
                  <Switch checked={pctAgua} onCheckedChange={setPctAgua} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── COLUNA DIREITA: PREVIEW ── */}
          <div className="space-y-4">
            <div className="sticky top-20 space-y-4">
              {/* Economia cards */}
              <Card className="bg-gradient-to-br from-[#87B537]/10 to-[#87B537]/5 border-[#87B537]/30">
                <CardContent className="pt-6 space-y-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Economia Mensal</p>
                    <p className="text-3xl font-bold text-[#87B537]">{formatBRL(economia.mensal)}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Economia Anual</p>
                      <p className="text-lg font-bold text-foreground">{formatBRL(economia.anual)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Em 5 anos</p>
                      <p className="text-lg font-bold text-foreground">{formatBRL(economia.em5anos)}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-background rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Payback</p>
                      <p className="text-2xl font-bold text-[#87B537]">
                        {economia.paybackMeses > 0 ? `${economia.paybackMeses}` : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">meses</p>
                    </div>
                    <div className="bg-background rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">ROI 12m</p>
                      <p className="text-2xl font-bold text-[#87B537]">
                        {economia.roi12m > 0 ? `${formatNum(economia.roi12m)}%` : '—'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mini-breakdown */}
              <Card>
                <CardContent className="pt-4 space-y-2">
                  {tabelaEconomia.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.icon} {item.categoria}</span>
                      <span className="font-medium text-[#87B537]">{formatBRL(item.economia)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Botão PDF */}
              {economia.mensal > 0 && (
                <Button
                  onClick={handleGerarPdf}
                  disabled={gerando}
                  className="w-full bg-[#87B537] hover:bg-[#6f9a2c] text-white h-12 text-base"
                >
                  {gerando ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <FileText className="h-5 w-5 mr-2" />}
                  📄 Gerar Relatório PDF
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* PDF HIDDEN RENDER                              */}
        {/* ═══════════════════════════════════════════════ */}
        <div
          ref={pdfRef}
          className={showPdf ? 'block' : 'hidden'}
          style={{ position: 'absolute', left: '-9999px', top: 0 }}
        >
          {/* PÁGINA 1 */}
          <div
            className="pdf-page"
            style={{
              width: '794px',
              height: '1123px',
              background: '#fff',
              fontFamily: 'Inter, sans-serif',
              padding: '0',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ background: 'linear-gradient(90deg, #87B537, #6f9a2c)', height: '8px', width: '100%' }} />
            <div style={{ padding: '28px 40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#87B537', fontWeight: 600 }}>
                  WeDo Cozinhas Profissionais — Revenda Autorizada Rational
                </span>
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0A1628', margin: '16px 0 4px' }}>
                ANÁLISE DE RETORNO DO INVESTIMENTO
              </h2>
              <p style={{ fontSize: '13px', color: '#666', margin: '0 0 20px' }}>
                Simulação para: <strong>{clienteSelecionado?.nome || 'Cliente'}</strong>
                {clienteSelecionado?.cidade && ` | ${clienteSelecionado.cidade}/${clienteSelecionado.estado}`}
                {' • '}Data: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>

              {/* Card investimento */}
              <div style={{
                background: '#0A1628',
                borderRadius: '12px',
                padding: '20px 28px',
                marginBottom: '24px',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(10,22,40,0.3)',
              }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>INVESTIMENTO</div>
                <div style={{ fontSize: '16px', margin: '4px 0', fontWeight: 600 }}>{equipamento} × {quantidade}</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#87B537' }}>{formatBRL(valorInvestimento)}</div>
              </div>

              {/* Tabela economia */}
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0A1628', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Economia Operacional Projetada
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ background: '#2E4A1A', color: '#fff' }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Categoria</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Custo Atual</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Com Rational</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Economia/Mês</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaEconomia.map((item, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff', borderBottom: '1px solid #e4e4e7' }}>
                      <td style={{ padding: '10px 12px' }}>{item.icon} {item.categoria}</td>
                      <td style={{ textAlign: 'right', padding: '10px 12px' }}>{formatBRL(item.atual)}</td>
                      <td style={{ textAlign: 'right', padding: '10px 12px' }}>{formatBRL(item.comRational)}</td>
                      <td style={{ textAlign: 'right', padding: '10px 12px', color: '#2E7D32', fontWeight: 700 }}>{formatBRL(item.economia)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '3px solid #0A1628', fontWeight: 700, background: '#f0f7e6' }}>
                    <td style={{ padding: '12px' }}>ECONOMIA MENSAL</td>
                    <td colSpan={2}></td>
                    <td style={{ textAlign: 'right', padding: '12px', color: '#2E7D32', fontSize: '16px' }}>{formatBRL(economia.mensal)}</td>
                  </tr>
                  <tr style={{ fontWeight: 700, background: '#e8f5e9' }}>
                    <td style={{ padding: '10px 12px' }}>ECONOMIA ANUAL</td>
                    <td colSpan={2}></td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', color: '#1B5E20', fontSize: '16px' }}>{formatBRL(economia.anual)}</td>
                  </tr>
                </tbody>
              </table>

              {/* 3 Cards de destaque */}
              <div style={{ display: 'flex', gap: '14px', marginBottom: '20px' }}>
                <div style={{ flex: 1, background: '#E8F5E9', borderRadius: '12px', padding: '18px', textAlign: 'center', border: '1px solid #A5D6A7', boxShadow: '0 2px 8px rgba(46,125,50,0.1)' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555' }}>📅 Payback</div>
                  <div style={{ fontSize: '36px', fontWeight: 800, color: '#2E7D32', margin: '6px 0' }}>{economia.paybackMeses}</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#2E7D32' }}>meses</div>
                  <div style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>O forno se paga em {economia.paybackMeses} meses</div>
                </div>
                <div style={{ flex: 1, background: '#C8E6C9', borderRadius: '12px', padding: '18px', textAlign: 'center', border: '1px solid #81C784', boxShadow: '0 2px 8px rgba(27,94,32,0.1)' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555' }}>💰 Economia Anual</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#1B5E20', margin: '6px 0' }}>{formatBRL(economia.anual)}</div>
                </div>
                <div style={{ flex: 1, background: '#A5D6A7', borderRadius: '12px', padding: '18px', textAlign: 'center', border: '1px solid #66BB6A', boxShadow: '0 2px 8px rgba(27,94,32,0.15)' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#444' }}>📈 Em 5 anos</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#1B5E20', margin: '6px 0' }}>{formatBRL(economia.em5anos)}</div>
                </div>
              </div>

              {/* Footer P1 */}
              {analiseResult && (
                <div style={{ fontSize: '10px', color: '#888', borderTop: '1px solid #e4e4e7', paddingTop: '10px' }}>
                  📊 Baseado no cardápio real de <strong>{analiseResult.restaurante?.nome ?? clienteSelecionado?.nome ?? 'Restaurante'}</strong>
                  {analiseResult.restaurante?.nota_ifood ? ` (⭐ ${analiseResult.restaurante.nota_ifood})` : ''}
                  {' • '}{analiseResult.restaurante?.qtd_pratos_cardapio ?? '—'} pratos analisados
                  {' • '}Cocção predominante: {analiseResult.restaurante?.metodo_coccao_predominante ?? '—'}
                  {' • '}Volume: {refeicoesDia} refeições/dia
                </div>
              )}
            </div>
          </div>

          {/* PÁGINA 2 */}
          <div
            className="pdf-page"
            style={{
              width: '794px',
              height: '1123px',
              background: '#fff',
              fontFamily: 'Inter, sans-serif',
              padding: '0',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ background: 'linear-gradient(90deg, #87B537, #6f9a2c)', height: '8px', width: '100%' }} />
            <div style={{ padding: '28px 40px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0A1628', marginBottom: '16px' }}>
                QUANDO SEU INVESTIMENTO SE PAGA
              </h2>

              {/* Gráfico */}
              <div style={{ width: '714px', height: '420px', marginBottom: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 60, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="redArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFCDD2" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#FFCDD2" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="greenAreaPdf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C8E6C9" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#C8E6C9" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 10 }}
                      interval={2}
                      label={{ value: 'Meses', position: 'bottom', offset: 0, fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip formatter={(v: number) => formatBRL(v)} labelFormatter={(l) => `Mês ${l}`} />
                    <Area
                      type="monotone"
                      dataKey="beforePayback"
                      stroke="#E53935"
                      fill="url(#redArea)"
                      strokeWidth={2}
                      name="Antes do payback"
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="afterPayback"
                      stroke="#2E7D32"
                      fill="url(#greenAreaPdf)"
                      strokeWidth={2.5}
                      name="Após payback"
                      connectNulls={false}
                      dot={(props: any) => {
                        if (props.payload?.isPayback) {
                          return (
                            <g key={`payback-dot-${props.cx}`}>
                              <circle cx={props.cx} cy={props.cy} r={8} fill="#2E7D32" stroke="#fff" strokeWidth={3} />
                              <text x={props.cx} y={props.cy - 16} textAnchor="middle" fill="#2E7D32" fontSize={11} fontWeight={700}>
                                PAYBACK: mês {props.payload.mes}
                              </text>
                            </g>
                          );
                        }
                        return <circle key={`dot-${props.cx}`} cx={0} cy={0} r={0} fill="none" />;
                      }}
                    />
                    <ReferenceLine
                      y={valorInvestimento}
                      stroke="#E53935"
                      strokeDasharray="8 4"
                      strokeWidth={2}
                      label={{
                        value: `Investimento: ${formatBRL(valorInvestimento)}`,
                        position: 'left',
                        fontSize: 11,
                        fill: '#E53935',
                        fontWeight: 'bold',
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Destaque verde */}
              <div style={{
                background: 'linear-gradient(135deg, #87B537, #6f9a2c)',
                borderRadius: '12px',
                padding: '20px 28px',
                color: '#fff',
                marginBottom: '20px',
                fontSize: '14px',
                lineHeight: '1.6',
                boxShadow: '0 4px 16px rgba(135,181,55,0.3)',
              }}>
                Com base na operação de <strong>{refeicoesDia} refeições/dia</strong>,
                o investimento de <strong>{formatBRL(valorInvestimento)}</strong> se paga em apenas{' '}
                <strong>{economia.paybackMeses} meses</strong>. A partir daí,{' '}
                <strong>{formatBRL(economia.mensal)}/mês</strong> é economia direta no caixa.
              </div>

              {/* Argumentos */}
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0A1628', marginBottom: '12px', textTransform: 'uppercase' }}>
                Por que investir em Rational:
              </h3>
              <div style={{ fontSize: '13px', lineHeight: '2.2', color: '#333', flex: 1 }}>
                {categoriasMP.some(c => c.kgMes > 0) && (
                  <div>✅ Até {Math.max(...categoriasMP.filter(c => c.kgMes > 0).map(c => c.pctEconomia))}% menos perda de peso na cocção — mais porções por kg</div>
                )}
                <div>✅ {pctEnergia}% menos energia — economia na conta de luz</div>
                <div>✅ {pctGordura}% menos gordura — redução de compra e descarte</div>
                <div>✅ {pctMaoDeObra}% mais eficiência — equipe produz mais em menos tempo</div>
                {pctAgua && <div>✅ Zero custo com tratamento de água (iCareSystem)</div>}
              </div>

              {/* Disclaimers */}
              <div style={{
                borderTop: '1px solid #e4e4e7',
                paddingTop: '12px',
                fontSize: '9px',
                color: '#aaa',
                lineHeight: '1.6',
              }}>
                Simulação com percentuais conservadores — resultados reais podem superar esta projeção.<br />
                * Ref: RATIONAL AG vs cocção tradicional.<br />
                * Custos de insumos: base CEPEA/Scot/CEAGESP (abril 2026)<br />
                <strong>WeDo Cozinhas Profissionais | Revenda Autorizada Rational</strong><br />
                Gerado em: {new Date().toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
