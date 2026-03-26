import { Link, useLocation } from 'react-router-dom';
import {
  FileText,
  PlusCircle,
  ClipboardList,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState, useEffect } from 'react';
import logoWedoDefault from '@/assets/logo-wedo.png';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
  defaultOpen?: boolean;
}

const menuGroups: MenuGroup[] = [
  {
    label: '',
    items: [
      { title: 'Dashboard', icon: PlusCircle, href: '/' },
    ],
    defaultOpen: true,
  },
  {
    label: 'Comercial',
    items: [
      { title: 'Clientes', icon: Building2, href: '/clientes' },
      { title: 'Propostas', icon: FileText, href: '/propostas' },
    ],
    defaultOpen: true,
  },
  {
    label: 'Configurações',
    items: [
      { title: 'Termos e Condições', icon: ClipboardList, href: '/termos' },
      { title: 'Empresa', icon: Settings, href: '/configuracoes' },
    ],
  },
];

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { company } = useCompany();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const newOpenGroups: Record<string, boolean> = {};
    menuGroups.forEach((group) => {
      if (group.defaultOpen) newOpenGroups[group.label] = true;
      if (group.items.some(item => location.pathname === item.href)) {
        newOpenGroups[group.label] = true;
      }
    });
    setOpenGroups(newOpenGroups);
  }, [location.pathname]);

  useEffect(() => {
    onMobileClose?.();
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        {(!collapsed || mobileOpen) ? (
          <div className="flex items-center gap-2">
            <img
              src={company.logo || logoWedoDefault}
              alt={company.name}
              className="h-10 w-auto max-w-[160px] object-contain"
            />
          </div>
        ) : (
          <span className="text-lg font-bold text-white mx-auto">W</span>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {menuGroups.map((group, groupIndex) => {
            const isOpen = openGroups[group.label] ?? false;

            return (
              <div key={groupIndex} className={cn(group.label && "mt-4")}>
                {/* Group label */}
                {group.label && (!collapsed || mobileOpen) && (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider",
                      "text-sidebar-foreground/50 hover:text-sidebar-foreground/70 transition-colors"
                    )}
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                )}

                {/* Items */}
                <ul
                  className={cn(
                    "space-y-0.5 overflow-hidden transition-all duration-200",
                    !group.label && "space-y-0.5",
                    group.label && (!collapsed || mobileOpen) && !isOpen && "max-h-0 opacity-0",
                    group.label && (!collapsed || mobileOpen) && isOpen && "max-h-[500px] opacity-100"
                  )}
                >
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          className={cn(
                            "sidebar-item",
                            collapsed && !mobileOpen && "justify-center px-2",
                            isActive && "sidebar-item-active"
                          )}
                          title={collapsed && !mobileOpen ? item.title : undefined}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {(!collapsed || mobileOpen) && (
                            <span className="flex-1 truncate text-[13px]">{item.title}</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && !mobileOpen && "justify-center"
        )}>
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-sm font-medium">
              AD
            </AvatarFallback>
          </Avatar>
          {(!collapsed || mobileOpen) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">Admin</p>
              <p className="text-[11px] text-sidebar-foreground/60 truncate">{company.name}</p>
            </div>
          )}
          {(!collapsed || mobileOpen) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={mobileOpen ? onMobileClose : onToggle}
          className={cn(
            "w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && !mobileOpen && "px-2"
          )}
        >
          {mobileOpen ? (
            <>
              <X className="h-4 w-4 mr-2" />
              <span>Fechar</span>
            </>
          ) : collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">Recolher menu</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (mobileOpen !== undefined) {
    return (
      <>
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 hidden md:flex h-screen flex-col bg-sidebar transition-all duration-200",
            collapsed ? "w-16" : "w-60"
          )}
        >
          {sidebarContent}
        </aside>

        {/* Mobile sidebar (drawer) */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 flex md:hidden h-screen w-72 flex-col bg-sidebar transition-transform duration-300 shadow-2xl",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {sidebarContent}
    </aside>
  );
}
