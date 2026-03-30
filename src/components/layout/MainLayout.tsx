import { useState, useEffect, ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children?: ReactNode;
  fullscreen?: boolean;
  hideSidebar?: boolean;
  hideHeader?: boolean;
  hideBottomNav?: boolean;
}

export function MainLayout({ children, fullscreen, hideSidebar = false, hideHeader = false, hideBottomNav = false }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
      setMobileOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className={cn("w-full bg-muted", fullscreen ? "h-screen" : "min-h-screen")}>
      {/* Mobile overlay */}
      {isMobile && mobileOpen && !hideSidebar && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {!hideSidebar && (
        <Sidebar
          collapsed={isMobile ? false : collapsed}
          onToggle={() => isMobile ? setMobileOpen(!mobileOpen) : setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
      )}

      <div
        className={cn(
          "flex flex-col transition-all duration-200",
          fullscreen ? "h-screen" : "min-h-screen",
          hideSidebar || isMobile ? "ml-0" : (collapsed ? "ml-16" : "ml-60")
        )}
      >
        {!hideHeader && (
          <AppHeader
            onMenuClick={() => setMobileOpen(true)}
            showMenuButton={isMobile}
          />
        )}

        {/* Content area */}
        <main className={cn(
          "page-enter",
          fullscreen
            ? "flex-1 p-0 overflow-hidden min-h-0"
            : "flex-1 p-4 md:p-8 overflow-x-hidden pb-20 md:pb-8"
        )}>
          <div className={cn(
            fullscreen
              ? "h-full min-h-0"
              : "mx-auto max-w-7xl space-y-4"
          )}>
            {children || <Outlet />}
          </div>
        </main>
      </div>

      {/* Bottom Navigation - mobile only */}
      {isMobile && !hideBottomNav && <BottomNav />}
    </div>
  );
}
