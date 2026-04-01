import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type TipoLog = 'login' | 'logout' | 'navegacao' | 'criar' | 'editar' | 'excluir' | 'admin' | 'acao';

interface LogPayload {
  tipo: TipoLog;
  acao: string;
  detalhes?: Record<string, unknown>;
  pagina?: string;
}

export function useAuditLog() {
  const { user } = useAuth();
  const location = useLocation();
  const lastPage = useRef<string>('');

  const registrar = useCallback(async (payload: LogPayload) => {
    if (!user) return;

    try {
      await supabase.from('audit_log' as any).insert({
        usuario_id: user.id,
        tipo: payload.tipo,
        acao: payload.acao,
        detalhes: payload.detalhes || {},
        pagina: payload.pagina || location.pathname,
        user_agent: navigator.userAgent,
      } as any);
    } catch (err) {
      console.error('Erro ao registrar log:', err);
    }
  }, [user, location.pathname]);

  // Auto-track page navigation
  useEffect(() => {
    if (!user) return;
    const currentPath = location.pathname;
    if (currentPath === lastPage.current) return;
    lastPage.current = currentPath;

    const pageNames: Record<string, string> = {
      '/hoje': 'Hoje',
      '/pipeline': 'Pipeline',
      '/clientes': 'Clientes',
      '/catalogo': 'Catálogo',
      '/propostas': 'Propostas',
      '/mapa': 'Mapa',
      '/visitas': 'Visitas',
      '/dashboard': 'Dashboard',
      '/relatorios': 'Relatórios',
      '/sync': 'Sincronização GC',
      '/termos': 'Termos e Condições',
      '/configuracoes': 'Configurações',
      '/usuarios': 'Usuários',
      '/logs': 'Logs do Sistema',
    };

    const pageName = pageNames[currentPath] || currentPath;

    registrar({
      tipo: 'navegacao',
      acao: `Acessou ${pageName}`,
      pagina: currentPath,
    });
  }, [location.pathname, user, registrar]);

  return { registrar };
}
