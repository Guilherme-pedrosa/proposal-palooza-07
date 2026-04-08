import { useState, useEffect, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  DollarSign, Clock, Zap, Check,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/* ═══════════════════════════════════════════════ */
/*  CONSTANTES DE MERCADO                         */
/* ═══════════════════════════════════════════════ */

type TipoOperacao =
  | 'buffet_self_service'
  | 'a_la_carte_casual'
  | 'fine_dining'
  | 'hamburgueria'
  | 'churrascaria'
  | 'padaria'
  | 'pizzaria'
  | 'cozinha_industrial'
  | 'hotel'
  | 'hospital';

const TIPO_LABELS: Record<TipoOperacao, string> = {
  buffet_self_service: 'Buffet Self-Service / Por Quilo',
  a_la_carte_casual: 'À La Carte Casual',
  fine_dining: 'Fine Dining',
  hamburgueria: 'Hamburgueria / Fast Casual',
  churrascaria: 'Churrascaria / Steakhouse',
  padaria: 'Padaria / Confeitaria',
  pizzaria: 'Pizzaria',
  cozinha_industrial: 'Cozinha Industrial / Refeitório',
  hotel: 'Hotel / Resort',
  hospital: 'Hospital / UAN',
};

const PROTEINA_POR_REFEICAO: Record<TipoOperacao, number> = {
  buffet_self_service: 3.38,
  a_la_carte_casual: 10.40,
  fine_dining: 34.65,
  hamburgueria: 2.88,
  churrascaria: 15.60,
  padaria: 1.56,
  pizzaria: 3.12,
  cozinha_industrial: 2.60,
  hotel: 7.80,
  hospital: 2.34,
};

const GORDURA_POR_REFEICAO: Record<TipoOperacao, number> = {
  buffet_self_service: 0.28,
  a_la_carte_casual: 0.18,
  fine_dining: 0.12,
  hamburgueria: 0.70,
  churrascaria: 0.10,
  padaria: 0.22,
  pizzaria: 0.15,
  cozinha_industrial: 0.20,
  hotel: 0.18,
  hospital: 0.16,
};

const CUSTO_HORA: Record<TipoOperacao, number> = {
  buffet_self_service: 21,
  a_la_carte_casual: 25,
  fine_dining: 35,
  hamburgueria: 20,
  churrascaria: 23,
  padaria: 20,
  pizzaria: 20,
  cozinha_industrial: 19,
  hotel: 25,
  hospital: 22,
};

const REFEICOES_SUGESTOES = [50, 100, 150, 200, 300, 500, 800, 1000];

const DIAS_MES = 26;

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatNum = (v: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(v);

/* ═══════════════════════════════════════════════ */
/*  COMPONENTE PRINCIPAL                          */
/* ═══════════════════════════════════════════════ */

export default function SimuladorROI() {
  const { user } = useAuth();
  const pdfRef = useRef<HTMLDivElement>(null);

  // ── BLOCO 1: CLIENTE + EQUIPAMENTO ──
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [propostaId, setPropostaId] = useState('');
  const [equipamento, setEquipamento] = useState('iCombi Pro');
  const [quantidade, setQuantidade] = useState(1);
  const [valorInvestimento, setValorInvestimento] = useState(0);
  const [manualMode, setManualMode] = useState(false);

  // ── BLOCO 2: PERFIL ──
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacao>('buffet_self_service');
  const [refeicoesDia, setRefeicoesDia] = useState(200);

  // ── BLOCO 3: CUSTOS (auto-preenchidos, editáveis) ──
  const [custoProteinas, setCustoProteinas] = useState(0);
  const [custoEnergia, setCustoEnergia] = useState(0);
  const [custoKwh, setCustoKwh] = useState(0.80);
  const [custoGordura, setCustoGordura] = useState(0);
  const [horasEconomizadas, setHorasEconomizadas] = useState(0);
  const [custoHora, setCustoHora] = useState(21);
  const [custoAgua, setCustoAgua] = useState(0);

  // ── BLOCO 4: PERCENTUAIS ──
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
      const { data } = await supabase
        .from('clientes_gc')
        .select('id, nome, razao_social, cidade, estado, cnpj')
        .eq('ativo', true)
        .order('nome');
      return data ?? [];
    },
  });

  const { data: propostas } = useQuery({
    queryKey: ['propostas_roi', clienteSelecionado?.id],
    queryFn: async () => {
      if (!clienteSelecionado) return [];
      const { data } = await supabase
        .from('propostas')
        .select('id, numero, titulo, produtos, valor_total, status')
        .eq('cliente_id', clienteSelecionado.id)
        .in('status', ['rascunho', 'enviada', 'visualizada'])
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!clienteSelecionado,
  });

  const clientesFiltrados = useMemo(() => {
    if (!clientes || !clienteSearch) return clientes?.slice(0, 20) ?? [];
    const q = clienteSearch.toLowerCase();
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      (c.razao_social && c.razao_social.toLowerCase().includes(q)) ||
      (c.cnpj && c.cnpj.includes(q))
    ).slice(0, 20);
  }, [clientes, clienteSearch]);

  // ── AUTO-PREENCHER CUSTOS quando muda tipo/refeições ──
  useEffect(() => {
    const r = refeicoesDia;
    const t = tipoOperacao;
    setCustoProteinas(r * DIAS_MES * PROTEINA_POR_REFEICAO[t]);
    setCustoEnergia(r * DIAS_MES * 1.3);
    setCustoGordura(r * GORDURA_POR_REFEICAO[t] * DIAS_MES);
    setHorasEconomizadas((r / 200) * 528);
    setCustoHora(CUSTO_HORA[t]);
    setCustoAgua((r / 200) * 270);
  }, [tipoOperacao, refeicoesDia]);

  // ── Vincular proposta ──
  useEffect(() => {
    if (!propostaId || !propostas) return;
    const p = propostas.find((x: any) => x.id === propostaId);
    if (!p) return;
    const prods = (p.produtos ?? []) as any[];
    if (prods.length > 0) {
      setEquipamento(prods[0].name || 'iCombi Pro');
      setQuantidade(prods.reduce((s: number, pr: any) => s + (pr.quantity || 1), 0));
    }
    setValorInvestimento(p.valor_total || 0);
    setManualMode(false);
  }, [propostaId, propostas]);

  // ── CÁLCULOS ──
  const energiaMes = custoEnergia * custoKwh;
  const maoObraMes = horasEconomizadas * custoHora;

  const econProteinas = custoProteinas * (pctProteinas / 100);
  const econEnergia = energiaMes * (pctEnergia / 100);
  const econGordura = custoGordura * (pctGordura / 100);
  const econMaoDeObra = maoObraMes * (pctMaoDeObra / 100);
  const econAgua = pctAgua ? custoAgua : 0;

  const economiaMensal = econProteinas + econEnergia + econGordura + econMaoDeObra + econAgua;
  const economiaAnual = economiaMensal * 12;
  const paybackMeses = valorInvestimento > 0 && economiaMensal > 0
    ? Math.ceil(valorInvestimento / economiaMensal) : 0;
  const economia5anos = economiaMensal * 60;

  // ── GRÁFICO PAYBACK ──
  const chartData = useMemo(() => {
    const pts = [];
    for (let m = 0; m <= 36; m++) {
      pts.push({
        mes: m,
        economia: economiaMensal * m,
        investimento: valorInvestimento,
      });
    }
    return pts;
  }, [economiaMensal, valorInvestimento]);

  // ── GERAR PDF ──
  const handleGerarPdf = async () => {
    if (!pdfRef.current) return;
    setShowPdf(true);
    setGerando(true);

    // Wait for render
    await new Promise(r => setTimeout(r, 500));

    try {
      const el = pdfRef.current;
      const pages = el.querySelectorAll('.pdf-page');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const pageH = 297;

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const ratio = canvas.width / canvas.height;
        let imgW = pageW;
        let imgH = pageW / ratio;
        if (imgH > pageH) {
          imgH = pageH;
          imgW = pageH * ratio;
        }
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
      }

      const nomeArquivo = `ROI_${clienteSelecionado?.nome?.replace(/\s+/g, '_') || 'Simulacao'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(nomeArquivo);
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGerando(false);
    }
  };

  const dataExtenso = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const tabelaEconomia = [
    { label: 'Proteínas', pct: pctProteinas, atual: custoProteinas, economia: econProteinas },
    { label: 'Energia', pct: pctEnergia, atual: energiaMes, economia: econEnergia },
    { label: 'Gordura/Óleo', pct: pctGordura, atual: custoGordura, economia: econGordura },
    { label: 'Mão de obra', pct: pctMaoDeObra, atual: maoObraMes, economia: econMaoDeObra },
    { label: 'Trat. água', pct: pctAgua ? 100 : 0, atual: custoAgua, economia: econAgua },
  ];

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════

  return (
    <MainLayout>
      <div className="mb-4 flex items-center gap-3">
        <Calculator className="h-6 w-6 text-[#87B537]" />
        <div>
          <h1 className="text-xl font-bold">Simulador de Retorno — Rational</h1>
          <p className="text-xs text-muted-foreground">WeDo Cozinhas Profissionais</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ════ COLUNA ESQUERDA: FORMULÁRIO ════ */}
        <div className="space-y-5">

          {/* BLOCO 1: CLIENTE + EQUIPAMENTO */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4 text-[#87B537]" />
                Cliente &amp; Equipamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Buscar cliente */}
              <div className="space-y-1.5">
                <Label className="text-xs">Buscar cliente</Label>
                <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                      {clienteSelecionado
                        ? <span className="truncate">{clienteSelecionado.nome}</span>
                        : <span className="text-muted-foreground">Selecionar cliente...</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Nome, razão social ou CNPJ..."
                        value={clienteSearch}
                        onValueChange={setClienteSearch}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                        <CommandGroup>
                          {clientesFiltrados.map((c: any) => (
                            <CommandItem
                              key={c.id}
                              value={c.nome}
                              onSelect={() => {
                                setClienteSelecionado(c);
                                setClienteOpen(false);
                                setPropostaId('');
                                setManualMode(false);
                              }}
                            >
                              <div>
                                <p className="text-sm font-medium">{c.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {c.cidade}{c.estado ? `/${c.estado}` : ''} {c.cnpj ? `· ${c.cnpj}` : ''}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {clienteSelecionado && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                  <p className="font-medium">{clienteSelecionado.razao_social || clienteSelecionado.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {clienteSelecionado.cidade}{clienteSelecionado.estado ? `/${clienteSelecionado.estado}` : ''}
                  </p>
                </div>
              )}

              {/* Vincular proposta */}
              {clienteSelecionado && propostas && propostas.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Vincular à proposta</Label>
                  <Select value={propostaId} onValueChange={v => { setPropostaId(v); setManualMode(false); }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar proposta..." /></SelectTrigger>
                    <SelectContent>
                      {propostas.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.numero} — {p.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Manual ou resumo do equipamento */}
              {(!propostaId || manualMode) && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Equipamento</Label>
                    <Select value={equipamento} onValueChange={setEquipamento}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['iCombi Pro 6-1/1', 'iCombi Pro 10-1/1', 'iCombi Pro 10-2/1', 'iCombi Pro 20-1/1', 'iCombi Pro 20-2/1', 'iVario Pro'].map(e => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qtd</Label>
                    <Input type="number" min={1} value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Investimento (R$)</Label>
                    <Input type="number" min={0} step={100} value={valorInvestimento} onChange={e => setValorInvestimento(Number(e.target.value))} className="h-9" />
                  </div>
                </div>
              )}

              {propostaId && !manualMode && valorInvestimento > 0 && (
                <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{equipamento} × {quantidade}</p>
                    <p className="text-lg font-bold text-[#87B537]">{formatBRL(valorInvestimento)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setManualMode(true)}>Editar</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* BLOCO 2: PERFIL DA OPERAÇÃO */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#87B537]" />
                Perfil da Operação
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de operação</Label>
                <Select value={tipoOperacao} onValueChange={v => setTipoOperacao(v as TipoOperacao)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Refeições por dia</Label>
                <div className="flex gap-2">
                  <Input type="number" min={10} value={refeicoesDia} onChange={e => setRefeicoesDia(Number(e.target.value))} className="h-9 flex-1" />
                  <div className="flex gap-1 flex-wrap">
                    {REFEICOES_SUGESTOES.slice(0, 4).map(s => (
                      <Button key={s} variant={refeicoesDia === s ? 'default' : 'outline'} size="sm" className="h-9 px-2 text-xs"
                        onClick={() => setRefeicoesDia(s)}>{s}</Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BLOCO 3: CUSTOS ATUAIS */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#87B537]" />
                Custos Atuais (auto-preenchidos)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Proteínas (R$/mês)</Label>
                <Input type="number" step={100} value={Math.round(custoProteinas)} onChange={e => setCustoProteinas(Number(e.target.value))} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Energia (kWh/mês)</Label>
                <Input type="number" step={100} value={Math.round(custoEnergia)} onChange={e => setCustoEnergia(Number(e.target.value))} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Custo kWh (R$)</Label>
                <Input type="number" step={0.05} value={custoKwh} onChange={e => setCustoKwh(Number(e.target.value))} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Gordura/Óleo (R$/mês)</Label>
                <Input type="number" step={50} value={Math.round(custoGordura)} onChange={e => setCustoGordura(Number(e.target.value))} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Horas economizadas/mês</Label>
                <Input type="number" step={10} value={Math.round(horasEconomizadas)} onChange={e => setHorasEconomizadas(Number(e.target.value))} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Custo hora trabalho (R$)</Label>
                <Input type="number" step={1} value={custoHora} onChange={e => setCustoHora(Number(e.target.value))} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Trat. água (R$/mês)</Label>
                <Input type="number" step={10} value={Math.round(custoAgua)} onChange={e => setCustoAgua(Number(e.target.value))} className="h-9" />
              </div>
            </CardContent>
          </Card>

          {/* BLOCO 4: PERCENTUAIS */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#87B537]" />
                Percentuais de Economia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Proteínas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Proteínas <span className="text-muted-foreground">(Rational: até 25%)</span></Label>
                  <Badge variant="outline" className="text-xs font-bold">{pctProteinas}%</Badge>
                </div>
                <Slider value={[pctProteinas]} onValueChange={v => setPctProteinas(v[0])} min={5} max={25} step={1} />
              </div>
              {/* Energia */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Energia <span className="text-muted-foreground">(Rational: até 70%)</span></Label>
                  <Badge variant="outline" className="text-xs font-bold">{pctEnergia}%</Badge>
                </div>
                <Slider value={[pctEnergia]} onValueChange={v => setPctEnergia(v[0])} min={10} max={70} step={1} />
              </div>
              {/* Gordura */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Gordura <span className="text-muted-foreground">(Rational: até 95%)</span></Label>
                  <Badge variant="outline" className="text-xs font-bold">{pctGordura}%</Badge>
                </div>
                <Slider value={[pctGordura]} onValueChange={v => setPctGordura(v[0])} min={20} max={95} step={1} />
              </div>
              {/* Mão de obra */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Mão de obra <span className="text-muted-foreground">(Rational: até 60%)</span></Label>
                  <Badge variant="outline" className="text-xs font-bold">{pctMaoDeObra}%</Badge>
                </div>
                <Slider value={[pctMaoDeObra]} onValueChange={v => setPctMaoDeObra(v[0])} min={10} max={60} step={1} />
              </div>
              {/* Água */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Tratamento de água <span className="text-muted-foreground">(Rational: 100%)</span></Label>
                <Button variant={pctAgua ? 'default' : 'outline'} size="sm" className="h-7 text-xs gap-1"
                  onClick={() => setPctAgua(!pctAgua)}>
                  {pctAgua ? <><Check className="h-3 w-3" /> 100%</> : 'Desligado'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* BOTÃO GERAR */}
          <Button
            className="w-full h-12 text-base gap-2"
            style={{ backgroundColor: '#87B537' }}
            onClick={handleGerarPdf}
            disabled={gerando || valorInvestimento === 0}
          >
            {gerando ? (
              <><Clock className="h-5 w-5 animate-spin" /> Gerando PDF...</>
            ) : (
              <><FileText className="h-5 w-5" /> GERAR RELATÓRIO PDF</>
            )}
          </Button>
        </div>

        {/* ════ COLUNA DIREITA: PREVIEW EM TEMPO REAL ════ */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="border-[#87B537]/30 bg-[#87B537]/5">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Economia Mensal</p>
              <p className="text-3xl font-bold text-[#87B537]">{formatBRL(economiaMensal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Economia Anual</p>
              <p className="text-2xl font-bold">{formatBRL(economiaAnual)}</p>
            </CardContent>
          </Card>
          <Card className={paybackMeses > 0 ? 'border-[#87B537]/40' : ''}>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Payback</p>
              {paybackMeses > 0 ? (
                <>
                  <p className="text-2xl font-bold">{paybackMeses} meses</p>
                  <p className="text-xs text-muted-foreground">O forno se paga em {paybackMeses} meses</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Informe o investimento</p>
              )}
            </CardContent>
          </Card>

          {/* Mini tabela de economia */}
          <Card>
            <CardContent className="p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 font-medium">Categoria</th>
                    <th className="text-right py-1 font-medium">Economia/mês</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaEconomia.map(r => (
                    <tr key={r.label} className="border-b last:border-0">
                      <td className="py-1.5">{r.label} (−{r.pct}%)</td>
                      <td className="py-1.5 text-right font-medium text-[#87B537]">{formatBRL(r.economia)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/*  PDF HIDDEN RENDER (2 páginas A4)              */}
      {/* ═══════════════════════════════════════════════ */}
      <div
        ref={pdfRef}
        style={{ position: 'absolute', left: '-9999px', top: 0 }}
      >
        {/* ━━━ PÁGINA 1 ━━━ */}
        <div className="pdf-page" style={{ width: '794px', minHeight: '1123px', background: '#fff', padding: '0', fontFamily: 'Inter, sans-serif', color: '#1a1a1a', position: 'relative' }}>
          {/* Header */}
          <div style={{ background: '#87B537', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '18px' }}>WeDo Cozinhas Profissionais</span>
            <span style={{ color: '#fff', fontSize: '12px' }}>Revenda Autorizada Rational</span>
          </div>

          <div style={{ padding: '32px 40px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Análise de Retorno do Investimento</h1>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
              Simulação para {clienteSelecionado?.razao_social || clienteSelecionado?.nome || '—'} | {clienteSelecionado?.cidade || ''}{clienteSelecionado?.estado ? `/${clienteSelecionado.estado}` : ''}
            </p>
            <p style={{ fontSize: '11px', color: '#999' }}>{dataExtenso}</p>

            {/* Card investimento */}
            <div style={{ background: '#1A1A2E', borderRadius: '10px', padding: '20px 28px', margin: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#ccc', fontSize: '13px' }}>{equipamento} × {quantidade}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#aaa', fontSize: '11px', textTransform: 'uppercase' }}>Investimento</p>
                <p style={{ color: '#87B537', fontSize: '26px', fontWeight: 800 }}>{formatBRL(valorInvestimento)}</p>
              </div>
            </div>

            {/* Tabela economia */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#87B537', color: '#fff' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Economia</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Custo Atual</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Com Rational</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Economia/Mês</th>
                </tr>
              </thead>
              <tbody>
                {tabelaEconomia.map((r, i) => (
                  <tr key={r.label} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 12px' }}>{r.label} (−{r.pct}%)</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatBRL(r.atual)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatBRL(r.atual - r.economia)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#87B537' }}>{formatBRL(r.economia)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #87B537', fontWeight: 700 }}>
                  <td style={{ padding: '12px' }}>ECONOMIA MENSAL</td>
                  <td></td><td></td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#87B537', fontSize: '15px' }}>{formatBRL(economiaMensal)}</td>
                </tr>
                <tr style={{ fontWeight: 700, background: '#f0fdf4' }}>
                  <td style={{ padding: '12px' }}>ECONOMIA ANUAL</td>
                  <td></td><td></td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#166534', fontSize: '15px' }}>{formatBRL(economiaAnual)}</td>
                </tr>
              </tbody>
            </table>

            {/* 3 cards */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'PAYBACK', val: `${paybackMeses} meses`, color: '#87B537' },
                { label: 'ECONOMIA ANUAL', val: formatBRL(economiaAnual), color: '#166534' },
                { label: 'ECONOMIA 5 ANOS', val: formatBRL(economia5anos), color: '#0f766e' },
              ].map(c => (
                <div key={c.label} style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</p>
                  <p style={{ fontSize: '20px', fontWeight: 800, color: c.color, marginTop: '4px' }}>{c.val}</p>
                </div>
              ))}
            </div>

            {/* Notas */}
            <p style={{ fontSize: '10px', color: '#999' }}>
              Perfil: {TIPO_LABELS[tipoOperacao]}, {formatNum(refeicoesDia)} refeições/dia, {DIAS_MES} dias/mês
            </p>
            <p style={{ fontSize: '10px', color: '#999' }}>
              Percentuais conservadores — resultados reais podem superar a projeção
            </p>
          </div>
        </div>

        {/* ━━━ PÁGINA 2 ━━━ */}
        <div className="pdf-page" style={{ width: '794px', minHeight: '1123px', background: '#fff', padding: '0', fontFamily: 'Inter, sans-serif', color: '#1a1a1a', position: 'relative' }}>
          {/* Header */}
          <div style={{ background: '#87B537', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>WeDo Cozinhas Profissionais</span>
            <span style={{ color: '#fff', fontSize: '11px' }}>Análise de Retorno — {clienteSelecionado?.nome || ''}</span>
          </div>

          <div style={{ padding: '28px 40px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Quando o investimento se paga</h2>

            {/* Gráfico */}
            <div style={{ width: '714px', height: '300px', marginBottom: '24px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#87B537" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#87B537" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} label={{ value: 'Meses', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Area type="monotone" dataKey="economia" stroke="#87B537" fill="url(#gradGreen)" strokeWidth={2} name="Economia acumulada" />
                  <ReferenceLine y={valorInvestimento} stroke="#ef4444" strokeDasharray="8 4" strokeWidth={2}
                    label={{ value: `Investimento: ${formatBRL(valorInvestimento)}`, position: 'right', fontSize: 10, fill: '#ef4444' }}
                  />
                  {paybackMeses > 0 && paybackMeses <= 36 && (
                    <ReferenceLine x={paybackMeses} stroke="#87B537" strokeDasharray="4 4"
                      label={{ value: `Payback: Mês ${paybackMeses}`, position: 'top', fontSize: 11, fill: '#87B537', fontWeight: 700 }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Frase impacto */}
            <div style={{ background: '#f0fdf4', border: '2px solid #87B537', borderRadius: '10px', padding: '20px 24px', marginBottom: '24px' }}>
              <p style={{ fontSize: '15px', lineHeight: 1.6 }}>
                Com base na sua operação de <strong>{formatNum(refeicoesDia)} refeições/dia</strong>,
                o investimento de <strong>{formatBRL(valorInvestimento)}</strong> se paga em apenas <strong>{paybackMeses} meses</strong>.
                A partir daí, <strong>{formatBRL(economiaMensal)}/mês</strong> é economia direta no seu caixa.
              </p>
            </div>

            {/* Bullets */}
            <div style={{ marginBottom: '24px' }}>
              {[
                `${pctProteinas}% menos gasto com proteínas — mais porções por kg`,
                `${pctEnergia}% menos energia — economia na conta de luz`,
                `${pctGordura}% menos gordura — redução de compra e descarte`,
                `${pctMaoDeObra}% mais eficiência — equipe produz mais em menos tempo`,
                `Zero custo com tratamento de água`,
              ].map((txt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ color: '#87B537', fontWeight: 700, fontSize: '14px' }}>✅</span>
                  <span style={{ fontSize: '13px' }}>{txt}</span>
                </div>
              ))}
            </div>

            {/* Rodapé */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: 'auto' }}>
              <p style={{ fontSize: '9px', color: '#999' }}>
                Simulação com percentuais conservadores. *Ref: RATIONAL AG vs cocção tradicional.
              </p>
              <p style={{ fontSize: '9px', color: '#999' }}>
                WeDo Cozinhas Profissionais — Revenda Autorizada Rational | {dataExtenso}
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
