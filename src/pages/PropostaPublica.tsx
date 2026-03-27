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
import { useCompany } from '@/contexts/CompanyContext';

export default function PropostaPublica() {
  const { uuid } = useParams();
  const { company } = useCompany();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [aprovada, setAprovada] = useState(false);

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
    await aprovarProposta(proposta.id);
    setAprovada(true);
    setConfirmOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!proposta) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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

  const subtotal = produtos.reduce((s: number, p: any) => s + (p.quantity || 0) * (p.unitPrice || 0), 0);
  const descontoTotal = produtos.reduce((s: number, p: any) => s + ((p.quantity || 0) * (p.unitPrice || 0) * ((p.discount || 0) / 100)), 0);
  const total = subtotal - descontoTotal;
  const isLeasing = proposta.forma_pagamento === 'leasing';
  const numParcelas = proposta.num_parcelas || 1;
  const entradaPercent = proposta.entrada_percent || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-[hsl(0,78%,56%)]">WeDo</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Soluções para Cozinhas Profissionais</p>
          <Separator />
          <p className="text-lg font-semibold">PROPOSTA COMERCIAL</p>
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
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-gray-600">Esta proposta não está mais disponível.</p>
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
            {proposta.descricao && <p className="text-sm text-muted-foreground whitespace-pre-line">{proposta.descricao}</p>}
          </CardContent>
        </Card>

        {/* Products */}
        {produtos.length > 0 && (
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Itens da Proposta</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {produtos.map((p: any, i: number) => (
                <div key={i} className="flex items-start gap-3 border-b last:border-0 pb-3 last:pb-0">
                  {p.photoUrl && <img src={p.photoUrl} className="w-12 h-12 rounded object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{p.name}</p>
                    {p.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>}
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
          <p className="font-semibold">{company.name}</p>
          <p>CNPJ: {company.cnpj}</p>
          <div className="flex items-center justify-center gap-3">
            {company.phone && <span><Phone className="inline h-3 w-3 mr-1" />{company.phone}</span>}
            {company.email && <span><Mail className="inline h-3 w-3 mr-1" />{company.email}</span>}
          </div>
          <p className="mt-2 opacity-50">Documento gerado pelo CRM WeDo</p>
        </div>
      </div>

      {/* Approval dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar aprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Ao aprovar, você confirma o interesse nas condições apresentadas nesta proposta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAprovar}>Confirmar Aprovação</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
