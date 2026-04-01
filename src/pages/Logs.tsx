import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Shield, Search, Filter, User, Clock, Globe, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';

const TIPO_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: 'Login', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  logout: { label: 'Logout', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
  navegacao: { label: 'Navegação', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  criar: { label: 'Criação', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  editar: { label: 'Edição', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  excluir: { label: 'Exclusão', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  acao: { label: 'Ação', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' },
};

const PAGE_SIZE = 50;

export default function Logs() {
  const { perfil } = useAuth();
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroUsuario, setFiltroUsuario] = useState<string>('todos');
  const [pagina, setPagina] = useState(0);

  const isAllowed = perfil === 'admin' || perfil === 'gestor';

  // Fetch usuarios for filter
  const { data: usuarios } = useQuery({
    queryKey: ['usuarios_log_filter'],
    queryFn: async () => {
      const { data } = await supabase.from('usuarios').select('id, nome').order('nome');
      return data || [];
    },
    enabled: isAllowed,
  });

  // Fetch logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit_logs', filtroTipo, filtroUsuario, busca, pagina],
    queryFn: async () => {
      let query = (supabase.from('audit_log' as any) as any)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE - 1);

      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo);
      }
      if (filtroUsuario !== 'todos') {
        query = query.eq('usuario_id', filtroUsuario);
      }
      if (busca) {
        query = query.ilike('acao', `%${busca}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      return { logs: data || [], total: count || 0 };
    },
    enabled: isAllowed,
  });

  // Map usuario_id to name
  const usuarioMap = new Map((usuarios || []).map((u: any) => [u.id, u.nome]));

  if (!isAllowed) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Shield className="h-16 w-16 mb-4" />
          <p className="text-lg font-medium">Acesso restrito</p>
          <p className="text-sm">Apenas administradores e gestores podem acessar os logs do sistema.</p>
        </div>
      </MainLayout>
    );
  }

  const totalPages = Math.ceil((logs?.total || 0) / PAGE_SIZE);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Logs do Sistema</h1>
            <p className="text-muted-foreground text-sm">
              {logs?.total || 0} registros encontrados
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ação..."
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPagina(0); }}
                  className="pl-9"
                />
              </div>
              <Select value={filtroTipo} onValueChange={(v) => { setFiltroTipo(v); setPagina(0); }}>
                <SelectTrigger className="w-full sm:w-44">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {Object.entries(TIPO_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroUsuario} onValueChange={(v) => { setFiltroUsuario(v); setPagina(0); }}>
                <SelectTrigger className="w-full sm:w-52">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os usuários</SelectItem>
                  {(usuarios || []).map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Log entries */}
        <Card>
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="divide-y">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (logs?.logs || []).length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <p>Nenhum registro encontrado</p>
                </div>
              ) : (
                (logs?.logs || []).map((log: any) => {
                  const tipoInfo = TIPO_LABELS[log.tipo] || { label: log.tipo, color: 'bg-muted text-muted-foreground' };
                  return (
                    <div key={log.id} className="flex items-start gap-4 px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`${tipoInfo.color} border-0 text-xs font-medium`}>
                            {tipoInfo.label}
                          </Badge>
                          <span className="font-medium text-sm truncate">
                            {log.acao}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {usuarioMap.get(log.usuario_id) || 'Desconhecido'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </span>
                          {log.pagina && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {log.pagina}
                            </span>
                          )}
                        </div>
                        {log.detalhes && Object.keys(log.detalhes).length > 0 && (
                          <pre className="mt-1 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 overflow-x-auto max-w-full">
                            {JSON.stringify(log.detalhes, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Página {pagina + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={pagina >= totalPages - 1} onClick={() => setPagina(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
