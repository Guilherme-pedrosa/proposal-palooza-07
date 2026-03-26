import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Smartphone } from 'lucide-react';

export function PWAInstallBanner() {
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e);
      setTimeout(() => setMostrar(true), 30000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!mostrar || !promptEvent) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-sidebar text-sidebar-foreground rounded-xl p-4 shadow-xl z-50 animate-slide-up">
      <div className="flex items-center gap-3">
        <Smartphone className="h-6 w-6 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Instalar WeDo CRM</p>
          <p className="text-xs text-sidebar-foreground/70">Acesse mais rápido, funciona offline</p>
        </div>
        <Button
          size="sm"
          onClick={() => { promptEvent.prompt(); setMostrar(false); }}
        >
          Instalar
        </Button>
        <button
          onClick={() => setMostrar(false)}
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
          aria-label="Fechar banner de instalação"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
