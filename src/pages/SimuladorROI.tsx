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
} from 'lucide-react';
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
  prato_ifood: string;
  preco_venda: number;
  insumo_match: string;
  custo_insumo_kg: number;
  rendimento_final: number;
  porcao_g: number;
  kg_bruto_necessario: number;
  custo_proteina_porcao: number;
  participacao_vendas: number;
  porcoes_dia: number;
  custo_mensal: number;
  tipo_coccao: string;
  usa_oleo: boolean;
}

interface AnaliseResult {
  restaurante: {
    nome: string;
    nota_ifood: number;
    qtd_pratos_cardapio: number;
    ticket_medio_ifood: number;
    tipo_operacao_inferido: string;
    metodo_coccao_predominante: string;
    categorias: string[];
  };
  pratos_analisados: PratoAnalisado[];
  totais_mensais: {
    proteinas_reais: number;
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

  // ── BLOCO B: iFood ──
  const [ifoodUrl, setIfoodUrl] = useState('');
  const [refeicoesDia, setRefeicoesDia] = useState(200);
  const [diasMes, setDiasMes] = useState(26);
  const [analisando, setAnalisando] = useState(false);
  const [analiseResult, setAnaliseResult] = useState<AnaliseResult | null>(null);

  // ── BLOCO C: CUSTOS (auto-preenchidos pela análise) ──
  const [custoProteinas, setCustoProteinas] = useState(0);
  const [custoEnergia, setCustoEnergia] = useState(0);
  const [custoKwh, setCustoKwh] = useState(0.80);
  const [custoGordura, setCustoGordura] = useState(0);
  const [horasEconomizadas, setHorasEconomizadas] = useState(0);
  const [custoHora, setCustoHora] = useState(23);
  const [custoAgua, setCustoAgua] = useState(270);

  // ── BLOCO D: PERCENTUAIS ──
  const [pctProteinas, setPctProteinas] = useState(20);
  const [pctEnergia, setPctEnergia] = useState(50);
  const [pctGordura, setPctGordura] = useState(80);
  const [pctMaoDeObra, setPctMaoDeObra] = useState(40);
  const [pctAgua, setPctAgua] = useState(true);

  const [gerando, setGerando] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

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

  // ── ANÁLISE iFOOD ──
  const handleAnalisar = async () => {
    if (!ifoodUrl) {
      toast.error('Cole o link do iFood do cliente');
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
        body: { ifood_url: ifoodUrl, refeicoes_dia: refeicoesDia, dias_mes: diasMes },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro na análise');

      const result = data.data as AnaliseResult;
      setAnaliseResult(result);
      toast.success(`Cardápio de "${result.restaurante.nome}" analisado com sucesso!`);
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
    setCustoProteinas(t.proteinas_reais);
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
    const econProteinas = custoProteinas * (pctProteinas / 100);
    const econEnergia = custoEnergia * (pctEnergia / 100);
    const econGordura = custoGordura * (pctGordura / 100);
    const econMaoDeObra = horasEconomizadas * custoHora * (pctMaoDeObra / 100);
    const econAgua = pctAgua ? custoAgua : 0;
    const mensal = econProteinas + econEnergia + econGordura + econMaoDeObra + econAgua;
    const anual = mensal * 12;
    const paybackMeses = mensal > 0 ? Math.ceil(valorInvestimento / mensal) : 0;
    const roi12m = valorInvestimento > 0
      ? ((anual - valorInvestimento) / valorInvestimento) * 100
      : 0;
    const em5anos = anual * 5;

    return {
      proteinas: econProteinas,
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
  }, [custoProteinas, custoEnergia, custoGordura, horasEconomizadas, custoHora, custoAgua, pctProteinas, pctEnergia, pctGordura, pctMaoDeObra, pctAgua, valorInvestimento]);

  // ── GRÁFICO DE PAYBACK ──
  const chartData = useMemo(() => {
    const meses = [];
    for (let i = 0; i <= 36; i++) {
      meses.push({
        mes: i,
        economiaAcumulada: economia.mensal * i,
        investimento: valorInvestimento,
      });
    }
    return meses;
  }, [economia.mensal, valorInvestimento]);

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

  const clientesFiltrados = (clientes ?? []).filter(
    (c: any) => c.nome?.toLowerCase().includes(clienteSearch.toLowerCase())
  );

  // ── TABELA ECONOMIA PARA PDF ──
  const tabelaEconomia = [
    {
      categoria: `Proteínas (−${pctProteinas}%)`,
      atual: custoProteinas,
      comRational: custoProteinas - economia.proteinas,
      economia: economia.proteinas,
      icon: '🥩',
    },
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

  /* ═══════════════════════════════════════════════ */
  /*  RENDER                                        */
  /* ═══════════════════════════════════════════════ */

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calculator className="h-6 w-6 text-[#87B537]" />
              Simulador de Retorno do Investimento
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Analise o cardápio real do restaurante e calcule o payback do equipamento Rational
            </p>
          </div>
          {economia.mensal > 0 && (
            <Button
              onClick={handleGerarPdf}
              disabled={gerando}
              className="bg-[#87B537] hover:bg-[#6f9a2c] text-white"
              size="lg"
            >
              {gerando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Gerar Relatório PDF
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── COLUNA ESQUERDA: FORMULÁRIO ── */}
          <div className="lg:col-span-2 space-y-6">
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
                        <Command>
                          <CommandInput placeholder="Buscar..." value={clienteSearch} onValueChange={setClienteSearch} />
                          <CommandList>
                            <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                            <CommandGroup>
                              {clientesFiltrados.slice(0, 15).map((c: any) => (
                                <CommandItem
                                  key={c.id}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* BLOCO B: Análise iFood */}
            <Card className="border-[#87B537]/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-[#87B537]" />
                  Analisar Cardápio do Cliente (iFood)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
                  <div className="space-y-2">
                    <Label>Link iFood do restaurante</Label>
                    <Input
                      placeholder="https://www.ifood.com.br/delivery/..."
                      value={ifoodUrl}
                      onChange={(e) => setIfoodUrl(e.target.value)}
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
                    <p className="text-xs text-muted-foreground">Extraindo pratos do iFood e calculando custos prato a prato</p>
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
                          <span className="font-semibold text-lg">{analiseResult.restaurante.nome}</span>
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1 text-yellow-500" />
                            {analiseResult.restaurante.nota_ifood}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          📋 {analiseResult.restaurante.qtd_pratos_cardapio} pratos
                          {' • '}🍖 Predominante: {analiseResult.restaurante.metodo_coccao_predominante}
                          {' • '}💰 Ticket médio: {formatBRL(analiseResult.restaurante.ticket_medio_ifood)}
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
                          {analiseResult.pratos_analisados.slice(0, 10).map((p, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium text-sm">{p.prato_ifood}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{p.insumo_match}</TableCell>
                              <TableCell className="text-right text-sm">{formatBRL(p.custo_proteina_porcao)}</TableCell>
                              <TableCell className="text-right text-sm">{(p.participacao_vendas * 100).toFixed(0)}%</TableCell>
                              <TableCell className="text-right text-sm font-medium">{formatBRL(p.custo_mensal)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

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
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Proteínas/mês (R$)</Label>
                    <Input type="number" value={custoProteinas} onChange={(e) => setCustoProteinas(Number(e.target.value))} />
                  </div>
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

            {/* BLOCO D: Percentuais de Economia */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Percentuais de Economia (Rational)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Proteínas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-2">
                      <Flame className="h-4 w-4 text-red-500" /> Proteínas
                    </Label>
                    <span className="text-sm font-mono">
                      <span className="text-[#87B537] font-bold">{pctProteinas}%</span>
                      <span className="text-muted-foreground ml-2 text-xs">(Rational: até 25%)</span>
                    </span>
                  </div>
                  <Slider value={[pctProteinas]} onValueChange={([v]) => setPctProteinas(v)} min={0} max={30} step={1} />
                </div>

                {/* Energia */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" /> Energia
                    </Label>
                    <span className="text-sm font-mono">
                      <span className="text-[#87B537] font-bold">{pctEnergia}%</span>
                      <span className="text-muted-foreground ml-2 text-xs">(Rational: até 70%)</span>
                    </span>
                  </div>
                  <Slider value={[pctEnergia]} onValueChange={([v]) => setPctEnergia(v)} min={0} max={70} step={5} />
                </div>

                {/* Gordura */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-amber-600" /> Gordura/Óleo
                    </Label>
                    <span className="text-sm font-mono">
                      <span className="text-[#87B537] font-bold">{pctGordura}%</span>
                      <span className="text-muted-foreground ml-2 text-xs">(Rational: até 95%)</span>
                    </span>
                  </div>
                  <Slider value={[pctGordura]} onValueChange={([v]) => setPctGordura(v)} min={0} max={95} step={5} />
                </div>

                {/* Mão de obra */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" /> Mão de obra
                    </Label>
                    <span className="text-sm font-mono">
                      <span className="text-[#87B537] font-bold">{pctMaoDeObra}%</span>
                      <span className="text-muted-foreground ml-2 text-xs">(Rational: até 60%)</span>
                    </span>
                  </div>
                  <Slider value={[pctMaoDeObra]} onValueChange={([v]) => setPctMaoDeObra(v)} min={0} max={60} step={5} />
                </div>

                {/* Água */}
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-400" /> Eliminação total de tratamento de água
                    <span className="text-xs text-muted-foreground">(iCareSystem)</span>
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
            {/* Barra verde topo */}
            <div style={{ background: '#87B537', height: '8px', width: '100%' }} />
            <div style={{ padding: '28px 40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#87B537', fontWeight: 600 }}>
                  WeDo Cozinhas Profissionais — Revenda Autorizada Rational
                </span>
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A2E', margin: '16px 0 4px' }}>
                ANÁLISE DE RETORNO DO INVESTIMENTO
              </h2>
              <p style={{ fontSize: '13px', color: '#666', margin: '0 0 20px' }}>
                Simulação para: <strong>{clienteSelecionado?.nome || 'Cliente'}</strong>
                {clienteSelecionado?.cidade && ` | ${clienteSelecionado.cidade}/${clienteSelecionado.estado}`}
                {' • '}Data: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>

              {/* Card investimento */}
              <div style={{
                background: '#1A1A2E',
                borderRadius: '12px',
                padding: '20px 28px',
                marginBottom: '24px',
                color: '#fff',
              }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>INVESTIMENTO</div>
                <div style={{ fontSize: '14px', margin: '4px 0' }}>{equipamento} × {quantidade}</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#87B537' }}>{formatBRL(valorInvestimento)}</div>
              </div>

              {/* Tabela economia */}
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Economia Operacional Projetada
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '24px' }}>
                <thead>
                  <tr style={{ background: '#f4f4f5', borderBottom: '2px solid #e4e4e7' }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#444' }}>Categoria</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, color: '#444' }}>Custo Atual</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, color: '#444' }}>Com Rational</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, color: '#87B537' }}>Economia</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaEconomia.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e4e4e7' }}>
                      <td style={{ padding: '10px 12px' }}>{item.icon} {item.categoria}</td>
                      <td style={{ textAlign: 'right', padding: '10px 12px' }}>{formatBRL(item.atual)}</td>
                      <td style={{ textAlign: 'right', padding: '10px 12px' }}>{formatBRL(item.comRational)}</td>
                      <td style={{ textAlign: 'right', padding: '10px 12px', color: '#87B537', fontWeight: 600 }}>{formatBRL(item.economia)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #1A1A2E', fontWeight: 700 }}>
                    <td style={{ padding: '12px' }}>ECONOMIA MENSAL</td>
                    <td colSpan={2}></td>
                    <td style={{ textAlign: 'right', padding: '12px', color: '#87B537', fontSize: '16px' }}>{formatBRL(economia.mensal)}</td>
                  </tr>
                  <tr style={{ fontWeight: 700 }}>
                    <td style={{ padding: '8px 12px' }}>ECONOMIA ANUAL</td>
                    <td colSpan={2}></td>
                    <td style={{ textAlign: 'right', padding: '8px 12px', color: '#87B537', fontSize: '16px' }}>{formatBRL(economia.anual)}</td>
                  </tr>
                </tbody>
              </table>

              {/* 3 Cards */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ flex: 1, background: '#f0fdf4', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>📅 Payback</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#87B537', margin: '8px 0' }}>{economia.paybackMeses}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>meses</div>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>O forno se paga em {economia.paybackMeses} meses</div>
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>💰 Economia Anual</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#87B537', margin: '8px 0' }}>{formatBRL(economia.anual)}</div>
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>📈 Em 5 anos</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#87B537', margin: '8px 0' }}>{formatBRL(economia.em5anos)}</div>
                </div>
              </div>

              {/* Footer P1 */}
              {analiseResult && (
                <div style={{ fontSize: '11px', color: '#888', borderTop: '1px solid #e4e4e7', paddingTop: '12px' }}>
                  📊 Baseado no cardápio real de <strong>{analiseResult.restaurante.nome}</strong> (iFood ⭐ {analiseResult.restaurante.nota_ifood})
                  {' • '}{analiseResult.restaurante.qtd_pratos_cardapio} pratos analisados
                  {' • '}Cocção predominante: {analiseResult.restaurante.metodo_coccao_predominante}
                  {' • '}Volume: {refeicoesDia} refeições/dia | Percentuais conservadores
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
            }}
          >
            <div style={{ background: '#87B537', height: '8px', width: '100%' }} />
            <div style={{ padding: '28px 40px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1A1A2E', marginBottom: '20px' }}>
                QUANDO SEU INVESTIMENTO SE PAGA
              </h2>

              {/* Gráfico */}
              <div style={{ width: '714px', height: '360px', marginBottom: '24px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                    <defs>
                      <linearGradient id="greenArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#87B537" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#87B537" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis
                      dataKey="mes"
                      label={{ value: 'Meses', position: 'bottom', offset: -5, fontSize: 11 }}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip formatter={(v: number) => formatBRL(v)} labelFormatter={(l) => `Mês ${l}`} />
                    <Area
                      type="monotone"
                      dataKey="economiaAcumulada"
                      stroke="#87B537"
                      fill="url(#greenArea)"
                      strokeWidth={2.5}
                      name="Economia acumulada"
                    />
                    <ReferenceLine
                      y={valorInvestimento}
                      stroke="#e74c3c"
                      strokeDasharray="8 4"
                      strokeWidth={2}
                      label={{
                        value: `Investimento: ${formatBRL(valorInvestimento)}`,
                        position: 'right',
                        fontSize: 10,
                        fill: '#e74c3c',
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Destaque */}
              <div style={{
                background: '#87B537',
                borderRadius: '12px',
                padding: '20px 28px',
                color: '#fff',
                marginBottom: '24px',
                fontSize: '14px',
                lineHeight: '1.6',
              }}>
                Com base na operação de <strong>{refeicoesDia} refeições/dia</strong>,
                o investimento de <strong>{formatBRL(valorInvestimento)}</strong> se paga em apenas{' '}
                <strong>{economia.paybackMeses} meses</strong>. A partir daí,{' '}
                <strong>{formatBRL(economia.mensal)}/mês</strong> é economia direta no caixa.
              </div>

              {/* Argumentos */}
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E', marginBottom: '16px', textTransform: 'uppercase' }}>
                Por que investir em Rational:
              </h3>
              <div style={{ fontSize: '13px', lineHeight: '2', color: '#333' }}>
                <div>✅ {pctProteinas}% menos perda de peso na cocção — mais porções por kg</div>
                <div>✅ {pctEnergia}% menos energia — economia na conta de luz</div>
                <div>✅ {pctGordura}% menos gordura — redução de compra e descarte</div>
                <div>✅ {pctMaoDeObra}% mais eficiência — equipe produz mais em menos tempo</div>
                {pctAgua && <div>✅ Zero custo com tratamento de água (iCareSystem)</div>}
              </div>

              {/* Disclaimers */}
              <div style={{
                marginTop: '40px',
                borderTop: '1px solid #e4e4e7',
                paddingTop: '16px',
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
