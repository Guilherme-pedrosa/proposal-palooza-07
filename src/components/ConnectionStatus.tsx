import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { WifiOff } from 'lucide-react';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('✅ Conexão restaurada. Sincronizando dados...');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('📶 Sem conexão. Usando dados em cache.', { duration: Infinity, id: 'offline' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-warning text-warning-foreground text-xs text-center py-1 px-2 flex items-center justify-center gap-1.5">
      <WifiOff className="h-3 w-3" />
      Modo offline — dados podem estar desatualizados
    </div>
  );
}
