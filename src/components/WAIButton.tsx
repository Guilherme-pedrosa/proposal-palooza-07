import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { WAIChat } from './WAIChat';
import type { WAIContexto } from '@/hooks/useWAI';

interface WAIButtonProps {
  contexto: WAIContexto;
  variant?: 'fab' | 'inline' | 'header';
}

export function WAIButton({ contexto, variant = 'inline' }: WAIButtonProps) {
  const [aberto, setAberto] = useState(false);

  if (variant === 'fab') {
    return (
      <>
        <button
          onClick={() => setAberto(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center z-40 hover:scale-105 transition-transform"
          aria-label="Abrir assistente WAI"
        >
          <Sparkles className="w-6 h-6 text-primary-foreground" />
          <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 rounded-full">
            WAI
          </span>
        </button>

        <Sheet open={aberto} onOpenChange={setAberto}>
          <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-2xl">
            <WAIChat contexto={contexto} onClose={() => setAberto(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 px-3 py-2 bg-sidebar text-sidebar-foreground text-sm rounded-lg hover:opacity-90 transition-opacity"
      >
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-medium">💡 WAI</span>
      </button>

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent side="right" className="w-full sm:w-[420px] p-0">
          <WAIChat contexto={contexto} onClose={() => setAberto(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
