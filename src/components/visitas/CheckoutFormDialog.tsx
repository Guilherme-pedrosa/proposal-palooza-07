import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CheckoutFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteNome: string;
  onSubmit: (data: {
    resultado: string;
    proxima_acao?: string;
    proxima_data?: string;
    satisfacao?: number;
    observacoes?: string;
  }) => void;
  loading: boolean;
}

const resultadoOpcoes = [
  { value: 'positivo', label: '✅ Positivo — Cliente interessado' },
  { value: 'neutro', label: '🔄 Neutro — Acompanhar' },
  { value: 'negativo', label: '❌ Negativo — Sem interesse' },
  { value: 'ausente', label: '🚫 Ausente — Cliente não encontrado' },
  { value: 'demo_realizada', label: '🍳 Demo realizada' },
  { value: 'proposta_entregue', label: '📄 Proposta entregue' },
  { value: 'vistoria_tecnica', label: '🔧 Vistoria técnica concluída' },
];

export function CheckoutFormDialog({ open, onOpenChange, clienteNome, onSubmit, loading }: CheckoutFormDialogProps) {
  const [resultado, setResultado] = useState('');
  const [proximaAcao, setProximaAcao] = useState('');
  const [proximaData, setProximaData] = useState('');
  const [satisfacao, setSatisfacao] = useState<number>(0);
  const [observacoes, setObservacoes] = useState('');

  const handleSubmit = () => {
    if (!resultado) return;
    onSubmit({
      resultado,
      proxima_acao: proximaAcao || undefined,
      proxima_data: proximaData ? new Date(proximaData).toISOString() : undefined,
      satisfacao: satisfacao || undefined,
      observacoes: observacoes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Check-out — {clienteNome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resultado */}
          <div className="space-y-2">
            <Label>Resultado da visita *</Label>
            <Select value={resultado} onValueChange={setResultado}>
              <SelectTrigger>
                <SelectValue placeholder="Como foi a visita?" />
              </SelectTrigger>
              <SelectContent>
                {resultadoOpcoes.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Satisfação */}
          <div className="space-y-2">
            <Label>Receptividade do cliente</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSatisfacao(n)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-6 w-6 ${n <= satisfacao ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Próxima ação */}
          <div className="space-y-2">
            <Label>Próxima ação</Label>
            <Input
              placeholder="Ex: Enviar proposta, Agendar demo..."
              value={proximaAcao}
              onChange={(e) => setProximaAcao(e.target.value)}
            />
          </div>

          {/* Data próxima ação */}
          <div className="space-y-2">
            <Label>Data da próxima ação</Label>
            <Input
              type="datetime-local"
              value={proximaData}
              onChange={(e) => setProximaData(e.target.value)}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Anotações sobre a visita..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!resultado || loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Finalizar Visita
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
