import { useState } from 'react';
import { MapPin, LogIn, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { iniciarCheckin, finalizarCheckout, type VisitaComCliente } from '@/lib/api/visitas';
import { CheckoutFormDialog } from './CheckoutFormDialog';

interface CheckInOutButtonProps {
  clienteId: string;
  clienteNome: string;
  vendedorId: string;
  oportunidadeId?: string;
  visitaEmAndamento?: VisitaComCliente | null;
  onSuccess: () => void;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não disponível'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

export function CheckInOutButton({
  clienteId,
  clienteNome,
  vendedorId,
  oportunidadeId,
  visitaEmAndamento,
  onSuccess,
}: CheckInOutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const isCheckedIn = visitaEmAndamento?.cliente_id === clienteId && visitaEmAndamento?.status === 'em_andamento';

  const handleCheckin = async () => {
    setLoading(true);
    try {
      const pos = await getCurrentPosition();
      await iniciarCheckin({
        cliente_id: clienteId,
        vendedor_id: vendedorId,
        oportunidade_id: oportunidadeId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      toast.success(`📍 Check-in em ${clienteNome} realizado!`);
      onSuccess();
    } catch (e: any) {
      if (e.code === 1) {
        toast.error('Permita o acesso à localização para fazer check-in');
      } else {
        toast.error('Erro ao fazer check-in: ' + (e.message || 'Tente novamente'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutSubmit = async (formData: {
    resultado: string;
    proxima_acao?: string;
    proxima_data?: string;
    satisfacao?: number;
    observacoes?: string;
  }) => {
    if (!visitaEmAndamento) return;
    setLoading(true);
    try {
      const pos = await getCurrentPosition();
      await finalizarCheckout({
        visita_id: visitaEmAndamento.id,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        ...formData,
      });
      toast.success(`✅ Check-out de ${clienteNome} concluído!`);
      setShowCheckout(false);
      onSuccess();
    } catch (e: any) {
      toast.error('Erro ao fazer check-out: ' + (e.message || 'Tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  if (isCheckedIn) {
    return (
      <>
        <Button
          onClick={() => setShowCheckout(true)}
          disabled={loading}
          variant="destructive"
          className="gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Check-out
        </Button>
        <CheckoutFormDialog
          open={showCheckout}
          onOpenChange={setShowCheckout}
          clienteNome={clienteNome}
          onSubmit={handleCheckoutSubmit}
          loading={loading}
        />
      </>
    );
  }

  // If there's a visit in progress at another client, show disabled
  if (visitaEmAndamento && visitaEmAndamento.status === 'em_andamento') {
    return (
      <Button disabled variant="outline" className="gap-2 text-muted-foreground">
        <MapPin className="h-4 w-4" />
        Em visita: {visitaEmAndamento.cliente?.nome || 'outro cliente'}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleCheckin}
      disabled={loading}
      className="gap-2 bg-green-600 hover:bg-green-700 text-white"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
      Check-in
    </Button>
  );
}
