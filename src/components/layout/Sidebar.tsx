import { Link, useLocation } from 'react-router-dom';
import { 
  FileText, 
  PlusCircle, 
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logoWedo from '@/assets/logo-wedo.png';

const menuItems = [
  {
    title: 'Nova Proposta',
    href: '/nova-proposta',
    icon: PlusCircle,
  },
  {
    title: 'Propostas',
    href: '/propostas',
    icon: FileText,
  },
  {
    title: 'Termos e Condições',
    href: '/termos',
    icon: ClipboardList,
  },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 gradient-primary">
      <div className="flex h-full flex-col px-4 py-6">
        {/* Logo */}
        <div className="mb-8 px-2">
          <img 
            src={logoWedo} 
            alt="WeDo Cozinhas" 
            className="h-12 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <p className="text-xs text-white/70 mt-2">Sistema de Propostas</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/20 pt-4">
          <p className="px-2 text-xs text-white/60">
            © 2025 PropostaPro
          </p>
        </div>
      </div>
    </aside>
  );
}
