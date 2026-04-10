import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calculator, Search, Trash2, ArrowRight, Plus, TrendingUp,
  Calendar, DollarSign, Utensils
} from 'lucide-react';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function SimulacoesROI() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [excluirId, setExcluirId] = useState<string | null>(null);

  const { data: simulacoes, isLoading } = useQuery({
    queryKey: ['simulacoes_roi_lista', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulacoes_roi')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const handleExcluir = async () => {
    if (!excluirId) return;
    const { error } = await supabase.from('simulacoes_roi').delete().eq('id', excluirId);
    if (error) toast.error('Erro ao excluir');
    else {
      toast.success('Simulação excluída');
      queryClient.invalidateQueries({ queryKey: ['simulacoes_roi_lista'] });
    }
    setExcluirId(null);
  };

  const filtered = (simulacoes ?? []).filter((s: any) =>
    s.nome_restaurante?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              Simulações ROI
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {filtered.length} simulação(ões) salva(s)
            </p>
          </div>
          <Button onClick={() => navigate('/roi')} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Simulação
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do restaurante..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Calculator className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground font-medium">Nenhuma simulação salva</p>
              <p className="text-muted-foreground/70 text-sm mt-1">
                Crie uma nova simulação no Simulador ROI
              </p>
              <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate('/roi')}>
                <Plus className="h-4 w-4" /> Criar Simulação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((sim: any) => (
              <Card
                key={sim.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/roi?sim=${sim.id}`)}
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Utensils className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="font-semibold text-foreground truncate">
                          {sim.nome_restaurante}
                        </h3>
                        {sim.economia_mensal > 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {formatBRL(sim.economia_mensal)}/mês
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(sim.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {sim.refeicoes_dia > 0 && (
                          <span className="flex items-center gap-1">
                            <Utensils className="h-3.5 w-3.5" />
                            {sim.refeicoes_dia} ref/dia
                          </span>
                        )}
                        {sim.economia_anual > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            {formatBRL(sim.economia_anual)}/ano
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setExcluirId(sim.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!excluirId}
        onOpenChange={(o) => !o && setExcluirId(null)}
        title="Excluir simulação?"
        description="Esta ação não pode ser desfeita."
        onConfirm={handleExcluir}
      />
    </MainLayout>
  );
}
