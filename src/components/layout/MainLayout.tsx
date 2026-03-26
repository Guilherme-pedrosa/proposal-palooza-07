import { useState, useEffect, ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AppHeader } from './AppHeader';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children?: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
      setMobileOpen(false);
    }
  }, [isMobile]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen w-full bg-muted">
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={isMobile ? false : collapsed}
        onToggle={() => isMobile ? setMobileOpen(!mobileOpen) : setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-200",
          isMobile ? "ml-0" : (collapsed ? "ml-16" : "ml-60")
        )}
      >
        <AppHeader
          onMenuClick={() => setMobileOpen(true)}
          showMenuButton={isMobile}
        />

        {/* Content area */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden page-enter">
          <div className="mx-auto max-w-7xl space-y-4">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
