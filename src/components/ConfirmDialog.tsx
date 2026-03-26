import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  aberto: boolean;
  titulo: string;
  descricao: string;
  textoBotao?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  variante?: 'destructive' | 'default';
}

export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  textoBotao = 'Confirmar',
  onConfirmar,
  onCancelar,
  variante = 'destructive',
}: ConfirmDialogProps) {
  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onCancelar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button variant={variante} onClick={onConfirmar}>
            {textoBotao}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
