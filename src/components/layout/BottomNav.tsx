import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Users, UtensilsCrossed, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { icon: Home, label: 'Hoje', href: '/hoje' },
  { icon: BarChart3, label: 'Pipeline', href: '/pipeline' },
  { icon: Users, label: 'Clientes', href: '/clientes' },
  { icon: UtensilsCrossed, label: 'Catálogo', href: '/catalogo' },
  { icon: FileText, label: 'Propostas', href: '/propostas' },
];

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
      <div className="flex items-center justify-around h-16">
        {items.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-[48px] transition-colors',
                isActive
                  ? 'text-[hsl(0,78%,56%)]'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
