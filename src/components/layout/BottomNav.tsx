import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Users, UtensilsCrossed, FileText, MapPin, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isBefore, isToday, startOfDay } from 'date-fns';

const items = [
  { icon: Home, label: 'Hoje', href: '/hoje' },
  { icon: CheckSquare, label: 'Tarefas', href: '/tarefas' },
  { icon: BarChart3, label: 'Pipeline', href: '/pipeline' },
  { icon: MapPin, label: 'Mapa', href: '/mapa' },
  { icon: Users, label: 'Clientes', href: '/clientes' },
  { icon: FileText, label: 'Propostas', href: '/propostas' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const { data: badgeCount = 0 } = useQuery({
    queryKey: ['badge_hoje', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from('atividades')
        .select('data_prevista')
        .eq('vendedor_id', user.id)
        .eq('concluida', false)
        .not('data_prevista', 'is', null);
      const hoje = startOfDay(new Date());
      return (data ?? []).filter((a: any) => {
        const d = new Date(a.data_prevista);
        return isBefore(d, new Date()) || isToday(d);
      }).length;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
      <div className="flex items-center justify-around h-16">
        {items.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          const showBadge = href === '/hoje' && badgeCount > 0;
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-[48px] transition-colors relative',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-0.5">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
