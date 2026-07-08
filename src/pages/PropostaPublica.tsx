import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, ChevronDown, Clock, FileText, Phone, Mail } from 'lucide-react';
import {
  fetchPropostaByUuid, registrarVisualizacao, aprovarProposta, formatBRL,
  STATUS_PROPOSTA, type PropostaRow, type StatusProposta,
} from '@/lib/api/propostas';
import { supabase } from '@/integrations/supabase/client';
import logoWedoDefault from '@/assets/logo-wedo.png';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCpf, isValidCpf, onlyDigitsCpf } from '@/lib/cpf';
import { toast } from 'sonner';

export default function PropostaPublica() {
  const { uuid } = useParams();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [aprovada, setAprovada] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [nomeAprov, setNomeAprov] = useState('');
  const [cpfAprov, setCpfAprov] = useState('');
  const [aprovando, setAprovando] = useState(false);

  // Load company settings directly (works for anon users via public RLS)
  const { data: companyData } = useQuery({
    queryKey: ['company_settings_public'],
    queryFn: async () => {
      const { data } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: proposta, isLoading, refetch } = useQuery({
    queryKey: ['proposta_publica', uuid],
    queryFn: () => fetchPropostaByUuid(uuid!),
    enabled: !!uuid,
  });

  // Register view
  useEffect(() => {
    if (proposta && proposta.status !== 'aprovada' && proposta.status !== 'recusada') {
      registrarVisualizacao(proposta.id, proposta);
    }
  }, [proposta?.id]);

  const handleAprovar = async () => {
    if (!proposta) return;
    const nome = nomeAprov.trim();
    if (nome.length < 3 || !nome.includes(' ')) {
      toast.error('Informe seu nome completo');
      return;
    }
    if (!isValidCpf(cpfAprov)) {
      toast.error('CPF inválido');
      return;
    }
    try {
      setAprovando(true);
      await aprovarProposta(proposta.id, { nome, cpf: onlyDigitsCpf(cpfAprov) });
      setAprovada(true);
      setConfirmOpen(false);
      toast.success('Proposta aprovada com sucesso!');
    } finally {
      setAprovando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!proposta) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold mb-2">Proposta não encontrada</h2>
            <p className="text-sm text-muted-foreground">Este link pode estar inválido ou expirado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const produtos = (proposta.produtos ?? []) as any[];
  const termos = (proposta.termos_condicoes ?? []) as any[];
  const isExpirada = proposta.validade_ate && new Date(proposta.validade_ate) < new Date();
  const isAprovada = aprovada || proposta.status === 'aprovada';
  const isCancelada = proposta.status === 'recusada';
  const diasRestantes = proposta.validade_ate ? differenceInDays(new Date(proposta.validade_ate), new Date()) : null;
  const companyName = companyData?.name || 'WeDo Cozinhas';
  const companyLogo = (!logoError && companyData?.logo_url) ? companyData.logo_url : logoWedoDefault;

  const subtotal = produtos.reduce((s: number, p: any) => s + (p.quantity || 0) * (p.unitPrice || 0), 0);
  const descontoTotal = produtos.reduce((s: number, p: any) => s + ((p.quantity || 0) * (p.unitPrice || 0) * ((p.discount || 0) / 100)), 0);
  const total = subtotal - descontoTotal;

  // Parse new flexible payment options from condicoes_pagamento JSON
  let opcoesPagamento: { id: string; forma: string; parcelas: number; entrada: number; juros: number }[] = [];
  let descontoAVista = 0;
  let descontoAVistaTipo: 'percent' | 'value' = 'percent';
  let textoCondicoes = '';

  if (proposta.condicoes_pagamento) {
    try {
      const parsed = JSON.parse(proposta.condicoes_pagamento);
      if (parsed.opcoesPagamento) {
        opcoesPagamento = parsed.opcoesPagamento;
        descontoAVista = parsed.descontoAVista || 0;
        descontoAVistaTipo = parsed.descontoAVistaTipo || 'percent';
        textoCondicoes = parsed.texto || '';
      } else {
        // Legacy format — treat condicoes_pagamento as plain text
        textoCondicoes = proposta.condicoes_pagamento;
      }
    } catch {
      textoCondicoes = proposta.condicoes_pagamento;
    }
  }

  // Fallback to old single fields if no opcoesPagamento
  if (opcoesPagamento.length === 0 && proposta.forma_pagamento) {
    opcoesPagamento = [{
      id: 'legacy',
      forma: proposta.forma_pagamento,
      parcelas: proposta.num_parcelas || 1,
      entrada: proposta.entrada_percent || 0,
      juros: proposta.forma_pagamento === 'leasing' ? 2.303 : 0,
    }];
  }

  const hasLeasing = opcoesPagamento.some(o => o.forma === 'leasing');
  const isManutencaoEletricaCivil = proposta.template_id === 'manutencao_eletrica_civil';

  const calcPMT = (pv: number, rate: number, n: number): number => {
    if (rate === 0) return pv / n;
    const r = rate / 100;
    return pv * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  };

  const formaLabel = (f: string) => {
    const map: Record<string, string> = { boleto: 'Boleto Bancário', cartao: 'Cartão de Crédito', leasing: 'Leasing / Locação', financiamento: 'Financiamento' };
    return map[f] || f;
  };

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img src={companyLogo} alt={`Logo ${companyName}`} className="h-14 w-auto object-contain" onError={() => setLogoError(true)} />
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {isManutencaoEletricaCivil ? 'Manutenção operacional predial leve' : 'Soluções para Cozinhas Profissionais'}
          </p>
          <Separator />
          <p className="text-lg font-semibold">{isManutencaoEletricaCivil ? 'PROPOSTA TÉCNICO-COMERCIAL' : 'PROPOSTA COMERCIAL'}</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-medium">{proposta.numero}</span>
            {proposta.versao > 1 && <Badge variant="outline" className="text-[10px]">Rev. {proposta.versao}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            Emitida em {proposta.created_at ? format(new Date(proposta.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '—'}
            {proposta.validade_ate && ` · Válida até ${format(new Date(proposta.validade_ate), "dd/MM/yyyy")}`}
          </p>
        </div>

        {/* Status banners */}
        {isExpirada && !isAprovada && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-700 font-medium">⛔ Esta proposta está expirada</p>
            <p className="text-sm text-red-600 mt-1">Solicite uma nova proposta ao seu consultor.</p>
          </div>
        )}
        {isAprovada && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-green-700 font-medium">✅ Esta proposta foi aprovada. Obrigado!</p>
            <p className="text-sm text-green-600 mt-1">Nossa equipe entrará em contato em breve.</p>
          </div>
        )}
        {isCancelada && (
          <div className="bg-muted border border-border rounded-lg p-4 text-center">
            <p className="text-muted-foreground">Esta proposta não está mais disponível.</p>
          </div>
        )}

        {/* Countdown */}
        {!isExpirada && !isAprovada && !isCancelada && diasRestantes !== null && diasRestantes >= 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <p className="text-amber-800 text-sm font-medium">
              <Clock className="inline h-4 w-4 mr-1" /> Esta proposta expira em {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Client */}
        {proposta.cliente && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Destinatário</p>
              <p className="font-semibold">{proposta.cliente.razao_social || proposta.cliente.nome}</p>
              {proposta.cliente.cnpj && <p className="text-sm text-muted-foreground">CNPJ: {proposta.cliente.cnpj}</p>}
            </CardContent>
          </Card>
        )}

        {/* Scope */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold text-lg mb-2">{proposta.titulo}</h2>
            {proposta.descricao && (() => {
              const parts = proposta.descricao.split('•').map(s => s.trim()).filter(Boolean);
              const intro = parts[0];
              const bullets = parts.slice(1);
              return (
                <div>
                  <p className="text-sm text-muted-foreground mb-3" style={{ lineHeight: '1.7' }}>{intro}</p>
                  {bullets.length > 0 && (
                    <ul className="space-y-1.5">
                      {bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {isManutencaoEletricaCivil && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Abrangência do atendimento</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border p-3 bg-background">
                    <p className="text-sm font-semibold mb-2">Elétrica de baixa tensão</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Correções em pontos, tomadas, interruptores e luminárias</li>
                      <li>• Substituição de componentes e ajustes operacionais</li>
                      <li>• Regularizações localizadas sem ampliação de carga</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border p-3 bg-background">
                    <p className="text-sm font-semibold mb-2">Civil leve</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Reparos localizados e recomposição de acabamentos</li>
                      <li>• Troca pontual de piso, revestimentos e rejuntes</li>
                      <li>• Intervenções sem caráter de obra ou reforma estrutural</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-sm font-semibold mb-1">Diretriz de escopo</p>
                <p className="text-sm text-muted-foreground">
                  Este modelo foi estruturado para manutenção leve e corretiva localizada. Necessidades que envolvam obra, ampliação de infraestrutura ou adequações de maior porte devem ser tratadas em orçamento complementar.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products */}
        {produtos.length > 0 && (
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Itens da Proposta</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {produtos.map((p: any, i: number) => (
                <div key={i} className="flex items-start gap-3 border-b last:border-0 pb-3 last:pb-0">
                  {p.photoUrl && <img src={p.photoUrl} alt={p.name || 'Produto'} className="w-12 h-12 rounded object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{p.name}</p>
                    {p.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>}
                    {p.observation && <p className="text-xs text-muted-foreground mt-1">Obs.: {p.observation}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Qtd: {p.quantity} · Preço: {formatBRL(p.unitPrice)}
                      {(p.discount ?? 0) > 0 && ` · Desc: ${p.discount}%`}
                    </p>
                  </div>
                  <span className="font-medium text-sm shrink-0">{formatBRL(p.totalPrice)}</span>
                </div>
              ))}

              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></div>
                {descontoTotal > 0 && <div className="flex justify-between text-red-600"><span>Desconto</span><span>-{formatBRL(descontoTotal)}</span></div>}
                <Separator />
                <div className="flex justify-between font-bold text-lg"><span>TOTAL</span><span>{formatBRL(total)}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Conditions */}
        {(opcoesPagamento.length > 0 || descontoAVista > 0) && total > 0 && (
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Condições de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              {/* À Vista */}
              {descontoAVista > 0 && (
                <div className="text-center py-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-1">À Vista (PIX / Transferência)</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatBRL(descontoAVistaTipo === 'percent' ? total * (1 - descontoAVista / 100) : total - descontoAVista)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Desconto: {descontoAVistaTipo === 'percent' ? `${descontoAVista}%` : formatBRL(descontoAVista)}
                  </p>
                </div>
              )}

              {/* Dynamic payment options */}
              {opcoesPagamento.length > 0 && (
                <div className={`grid gap-3 ${opcoesPagamento.length === 1 ? 'grid-cols-1' : opcoesPagamento.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                  {opcoesPagamento.map((op, idx) => {
                    const saldo = total * (1 - (op.entrada || 0) / 100);
                    const juros = op.forma === 'leasing' ? 2.303 : (op.juros || 0);
                    const parcela = juros > 0 ? calcPMT(saldo, juros, op.parcelas) : saldo / op.parcelas;

                    return (
                      <div key={op.id} className="rounded-lg border p-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Opção {idx + 1}</p>
                        <p className="text-xs text-muted-foreground">{formaLabel(op.forma)}</p>
                        {(op.entrada || 0) > 0 && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span>Entrada ({op.entrada}%)</span>
                              <span className="font-medium">{formatBRL(total * op.entrada / 100)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Saldo</span>
                              <span className="font-medium">{formatBRL(saldo)}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between font-bold text-lg">
                          <span>{op.parcelas}x de</span>
                          <span className="text-primary">
                            {formatBRL(parcela)}
                            {(op.parcelas || 1) > 1 && <span className="text-sm font-normal">/{(op as any).periodicidade || 'mês'}</span>}
                            {(op.parcelas || 1) === 1 && (op as any).periodicidade && <span className="text-sm font-normal">/{(op as any).periodicidade}</span>}
                          </span>
                        </div>
                        {juros > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            Juros: {juros.toFixed(2).replace('.', ',')}% a.m.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {textoCondicoes && (
                <p className="text-sm text-muted-foreground whitespace-pre-line border-t pt-2">{textoCondicoes}</p>
              )}
              {proposta.prazo_entrega && (
                <p className="text-sm text-muted-foreground">
                  <strong>Prazo:</strong> {proposta.prazo_entrega}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Leasing Fiscal Benefits */}
        {hasLeasing && total > 0 && (() => {
          const leasingOp = opcoesPagamento.find(o => o.forma === 'leasing')!;
          const saldoL = total * (1 - (leasingOp.entrada || 0) / 100);
          const parcelaL = calcPMT(saldoL, 2.303, leasingOp.parcelas);
          return (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Benefício Fiscal — Leasing</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Empresas no regime de <strong>Lucro Real</strong> podem contabilizar as parcelas de locação como despesa operacional dedutível, com economia potencial de até <strong>43,25%</strong> do valor do contrato.
                </p>
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <tbody>
                      {[
                        { nome: 'IRPJ', aliq: '25%', val: total * 0.25 },
                        { nome: 'CSLL', aliq: '9%', val: total * 0.09 },
                        { nome: 'PIS', aliq: '1,65%', val: total * 0.0165 },
                        { nome: 'COFINS', aliq: '7,6%', val: total * 0.076 },
                      ].map((t, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                          <td className="px-3 py-2 font-medium">{t.nome} ({t.aliq})</td>
                          <td className="px-3 py-2 text-right font-semibold text-emerald-700">{formatBRL(t.val)}</td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                        <td className="px-3 py-2 font-bold">Economia potencial</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">{formatBRL(total * 0.4325)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="rounded-lg p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">
                    Mensalidade após benefícios fiscais
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {formatBRL(parcelaL * (1 - 0.4325))}
                    <span className="text-sm font-normal text-emerald-600 dark:text-emerald-400">/mês</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Parcela de {formatBRL(parcelaL)} com aproveitamento de créditos de PIS e COFINS (9,25%) e deduções de IRPJ (25%) e CSLL (9%) sobre a despesa de locação.
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Estimativa de economia tributária potencial, sujeita ao regime tributário, existência de lucro tributável, enquadramento da operação, uso do bem na atividade e validação contábil/fiscal.
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Base legal: Decreto 3.000/99 · Lei 10.833/03 · Lei 10.865/02.
                </p>
              </CardContent>
            </Card>
          );
        })()}

        {/* Terms */}
        {termos.length > 0 && (
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Termos e Condições</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {termos.map((t: any, i: number) => (
                <Collapsible key={i}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-left py-2 text-sm font-medium hover:text-primary">
                    {t.title}
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p className="text-sm text-muted-foreground pb-2 whitespace-pre-line">{t.description}</p>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Approval button */}
        {!isExpirada && !isAprovada && !isCancelada && (
          <Button className="w-full gap-2 h-12 text-base" onClick={() => setConfirmOpen(true)}>
            <CheckCircle2 className="h-5 w-5" /> APROVAR ESTA PROPOSTA
          </Button>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-1 pt-4 pb-8">
          <p className="font-semibold">{companyName}</p>
          <p>CNPJ: {companyData?.cnpj || ''}</p>
          <div className="flex items-center justify-center gap-3">
            {companyData?.phone && <span><Phone className="inline h-3 w-3 mr-1" />{companyData.phone}</span>}
            {companyData?.email && <span><Mail className="inline h-3 w-3 mr-1" />{companyData.email}</span>}
          </div>
          <p className="mt-2 opacity-50">Documento gerado pelo CRM WeDo</p>
        </div>
      </div>

      {/* Approval dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={(o) => !aprovando && setConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar aprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Para aprovar esta proposta, informe seu nome completo e CPF. Esses dados ficarão registrados como confirmação do aceite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="aprov-nome">Nome completo</Label>
              <Input
                id="aprov-nome"
                value={nomeAprov}
                onChange={(e) => setNomeAprov(e.target.value)}
                placeholder="Seu nome completo"
                maxLength={120}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aprov-cpf">CPF</Label>
              <Input
                id="aprov-cpf"
                value={cpfAprov}
                onChange={(e) => setCpfAprov(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="off"
              />
              {cpfAprov && !isValidCpf(cpfAprov) && (
                <p className="text-xs text-destructive">CPF inválido</p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={aprovando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleAprovar(); }}
              disabled={aprovando || !nomeAprov.trim() || !isValidCpf(cpfAprov)}
            >
              {aprovando ? 'Aprovando...' : 'Confirmar Aprovação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
