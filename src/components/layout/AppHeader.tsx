import { Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocation } from 'react-router-dom';
import { NotificationCenter } from '@/components/NotificationCenter';

interface AppHeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

const pageMeta: Record<string, { title: string; breadcrumb: string[] }> = {
  '/': { title: 'Dashboard', breadcrumb: [] },
  '/dashboard': { title: 'Dashboard', breadcrumb: ['Gestão'] },
  '/hoje': { title: 'Hoje', breadcrumb: [] },
  '/pipeline': { title: 'Pipeline', breadcrumb: ['Comercial'] },
  '/nova-proposta': { title: 'Nova Proposta', breadcrumb: ['Propostas', 'Nova'] },
  '/propostas': { title: 'Propostas', breadcrumb: ['Comercial'] },
  '/clientes': { title: 'Clientes', breadcrumb: ['Comercial'] },
  '/catalogo': { title: 'Catálogo', breadcrumb: ['Comercial'] },
  '/relatorios': { title: 'Relatórios', breadcrumb: ['Gestão'] },
  '/sync': { title: 'Sync GestãoClick', breadcrumb: ['Gestão'] },
  '/termos': { title: 'Termos e Condições', breadcrumb: ['Configurações'] },
  '/configuracoes': { title: 'Configurações', breadcrumb: ['Empresa'] },
  '/logs': { title: 'Logs do Sistema', breadcrumb: ['Configurações'] },
};

export function AppHeader({ onMenuClick, showMenuButton }: AppHeaderProps) {
  const location = useLocation();

  let currentPage = pageMeta[location.pathname];
  if (!currentPage) {
    if (location.pathname.startsWith('/clientes/') || location.pathname.startsWith('/cliente/')) {
      currentPage = { title: 'Cliente', breadcrumb: ['Comercial', 'Clientes'] };
    } else if (location.pathname.startsWith('/propostas/')) {
      currentPage = { title: 'Proposta', breadcrumb: ['Comercial', 'Propostas'] };
    } else if (location.pathname.startsWith('/oportunidades/')) {
      currentPage = { title: 'Oportunidade', breadcrumb: ['Comercial', 'Pipeline'] };
    } else {
      currentPage = { title: 'Página', breadcrumb: [] };
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-8">
      <div className="flex items-center gap-4 min-w-0">
        {showMenuButton && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-9 w-9 flex-shrink-0 -ml-2">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="text-h1 text-foreground truncate">{currentPage.title}</h1>
          {currentPage.breadcrumb.length > 0 && (
            <div className="breadcrumb hidden sm:flex">
              {currentPage.breadcrumb.map((item, index) => (
                <span key={index} className="flex items-center gap-2">
                  {index > 0 && <span className="breadcrumb-separator">›</span>}
                  <span className={index === currentPage.breadcrumb.length - 1 ? "breadcrumb-current" : ""}>{item}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Buscar propostas, clientes..." className="w-full pl-10 bg-muted border-0 h-10" />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <NotificationCenter />
        <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden">
          <Search className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}
