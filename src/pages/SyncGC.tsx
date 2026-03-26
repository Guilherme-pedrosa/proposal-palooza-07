import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGC } from '@/contexts/GCContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Wifi, WifiOff, Users, Package, Loader2
} from 'lucide-react';

export default function SyncGC() {
  const {
    isSyncingClientes, isSyncingProdutos,
    lastSyncClientes, lastSyncProdutos,
    syncClientes, syncProdutos, testarConexao,
  } = useGC();

  const [conexaoStatus, setConexaoStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [conexaoMsg, setConexaoMsg] = useState('');
  const [logFilter, setLogFilter] = useState<string>('todas');

  // Test connection on mount
  useEffect(() => {
    handleTestarConexao();
  }, []);

  const handleTestarConexao = async () => {
    setConexaoStatus('testing');
    const result = await testarConexao();
    setConexaoStatus(result.ok ? 'ok' : 'error');
    setConexaoMsg(result.mensagem);
  };

  // Counters
  const { data: countClientes = 0 } = useQuery({
    queryKey: ['count_clientes_gc'],
    queryFn: async () => {
      const { count } = await supabase.from('clientes_gc').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const { data: countProdutos = 0 } = useQuery({
    queryKey: ['count_produtos_gc'],
    queryFn: async () => {
      const { count } = await supabase.from('produtos_gc').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  // Sync logs
  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['gc_sync_log', logFilter],
    queryFn: async () => {
      let query = supabase.from('gc_sync_log').select('*').order('created_at', { ascending: false }).limit(20);
      if (logFilter !== 'todas') {
        query = query.eq('entidade', logFilter);
      }
      const { data } = await query;
      return (data ?? []) as any[];
    },
  });

  const formatDate = (d: Date | string | null) => {
    if (!d) return '—';
    return format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const statusBadge = (status: string | null) => {
    if (status === 'sucesso') return <Badge className="bg-green-100 text-green-700 border-0">✅ Sucesso</Badge>;
    if (status === 'erro') return <Badge className="bg-red-100 text-red-700 border-0">❌ Erro</Badge>;
    if (status === 'parcial') return <Badge className="bg-yellow-100 text-yellow-700 border-0">⚠️ Parcial</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sincronização GestãoClick</h1>
          <p className="text-sm text-muted-foreground">Status da integração com o ERP</p>
        </div>

        {/* Connection status */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {conexaoStatus === 'testing' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              {conexaoStatus === 'ok' && <Wifi className="h-5 w-5 text-green-600" />}
              {conexaoStatus === 'error' && <WifiOff className="h-5 w-5 text-red-600" />}
              {conexaoStatus === 'idle' && <Wifi className="h-5 w-5 text-muted-foreground" />}
              <div>
                <p className="font-medium text-sm">
                  {conexaoStatus === 'testing' && 'Testando conexão...'}
                  {conexaoStatus === 'ok' && 'Conexão OK ✅'}
                  {conexaoStatus === 'error' && 'Conexão com problemas'}
                  {conexaoStatus === 'idle' && 'Verificando...'}
                </p>
                {conexaoMsg && <p className="text-xs text-muted-foreground">{conexaoMsg}</p>}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleTestarConexao} disabled={conexaoStatus === 'testing'}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Testar
            </Button>
          </CardContent>
        </Card>

        {/* Counters */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{countClientes}</p>
              <p className="text-xs text-muted-foreground">Clientes no CRM</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{countProdutos}</p>
              <p className="text-xs text-muted-foreground">Produtos no CRM</p>
            </CardContent>
          </Card>
        </div>

        {/* Sync actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Clientes
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <p className="text-xs text-muted-foreground">Última sync: {formatDate(lastSyncClientes)}</p>
              <Button className="w-full gap-2" onClick={syncClientes} disabled={isSyncingClientes}>
                {isSyncingClientes ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {isSyncingClientes ? 'Sincronizando...' : 'Sincronizar Clientes'}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" /> Produtos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <p className="text-xs text-muted-foreground">Última sync: {formatDate(lastSyncProdutos)}</p>
              <Button className="w-full gap-2" onClick={syncProdutos} disabled={isSyncingProdutos}>
                {isSyncingProdutos ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {isSyncingProdutos ? 'Sincronizando...' : 'Sincronizar Produtos'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sync log */}
        <Card>
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Log de Sincronizações</CardTitle>
            <Select value={logFilter} onValueChange={setLogFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="clientes">Clientes</SelectItem>
                <SelectItem value="produtos">Produtos</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loadingLogs ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum log encontrado</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{log.entidade}</Badge>
                        {statusBadge(log.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.acao} · {formatDate(log.created_at)}
                      </p>
                      {log.detalhes && (
                        <p className="text-xs text-muted-foreground">
                          {log.detalhes.total !== undefined && `${log.detalhes.total} registros`}
                          {log.detalhes.erros > 0 && ` · ${log.detalhes.erros} erros`}
                          {log.detalhes.paginas && ` · ${log.detalhes.paginas} páginas`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
