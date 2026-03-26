import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Sparkles, MessageSquare } from 'lucide-react';

interface WAICusto {
  nome: string | null;
  chamadas: number | null;
  tokens_total: number | null;
  custo_usd: number | null;
}

export function WAICustoCard() {
  const [dados, setDados] = useState<WAICusto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('wai_custo_mes')
      .select('*')
      .then(({ data }) => {
        if (data) setDados(data);
        setLoading(false);
      });
  }, []);

  const totalChamadas = dados.reduce((s, d) => s + (d.chamadas ?? 0), 0);
  const totalUSD = dados.reduce((s, d) => s + (d.custo_usd ?? 0), 0);
  const totalBRL = totalUSD * 5.5; // estimativa

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded-xl" />;

  return (
    <div className="bg-card rounded-xl p-5 border">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Uso do WAI — Mês Atual</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-muted rounded-lg p-3 text-center">
          <MessageSquare className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{totalChamadas}</p>
          <p className="text-xs text-muted-foreground">consultas</p>
        </div>
        <div className="bg-muted rounded-lg p-3 text-center">
          <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">
            R$ {totalBRL.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">custo estimado</p>
        </div>
      </div>

      {dados.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">Por vendedor</p>
          {dados.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
              <span className="text-foreground">{d.nome ?? 'Desconhecido'}</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{d.chamadas ?? 0} consultas</span>
                <span className="font-medium">R$ {((d.custo_usd ?? 0) * 5.5).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {dados.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-3">
          Nenhuma consulta WAI registrada neste mês.
        </p>
      )}
    </div>
  );
}
