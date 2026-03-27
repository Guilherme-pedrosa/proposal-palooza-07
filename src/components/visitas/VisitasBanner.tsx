import { MapPin, Clock, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatDuracao, type VisitaComCliente } from '@/lib/api/visitas';
import { differenceInMinutes } from 'date-fns';
import { useEffect, useState } from 'react';

interface VisitasBannerProps {
  visita: VisitaComCliente;
  onCheckout: () => void;
}

export function VisitasBanner({ visita, onCheckout }: VisitasBannerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!visita.checkin_at) return;
    const update = () => setElapsed(differenceInMinutes(new Date(), new Date(visita.checkin_at!)));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [visita.checkin_at]);

  return (
    <Card
      className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onCheckout}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <MapPin className="h-5 w-5 text-green-600" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800 dark:text-green-200 truncate">
            📍 Em visita: {visita.cliente?.nome || 'Cliente'}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">
            {visita.cliente?.endereco && `${visita.cliente.endereco} • `}
            {formatDuracao(elapsed)} no local
          </p>
        </div>
        <div className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">
          Toque para check-out →
        </div>
      </div>
    </Card>
  );
}
