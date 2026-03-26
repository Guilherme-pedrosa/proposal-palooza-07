import { Button } from '@/components/ui/button';

interface EstadoVazioProps {
  icone: string;
  titulo: string;
  descricao: string;
  ctaLabel?: string;
  ctaOnClick?: () => void;
}

export function EstadoVazio({ icone, titulo, descricao, ctaLabel, ctaOnClick }: EstadoVazioProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <span className="text-5xl mb-4">{icone}</span>
      <h3 className="text-lg font-semibold text-foreground mb-2">{titulo}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">{descricao}</p>
      {ctaLabel && ctaOnClick && (
        <Button onClick={ctaOnClick}>{ctaLabel}</Button>
      )}
    </div>
  );
}
