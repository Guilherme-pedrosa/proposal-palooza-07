import { useState } from 'react';
import { WAIButton } from '@/components/WAIButton';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  fetchProdutoById,
  badgeEstoque,
  formatBRL,
  categoriaChips,
  uploadProductPhoto,
  updateProductPhotos,
  type ProdutoGCRow,
} from '@/lib/api/produtosGC';
import {
  ArrowLeft,
  Star,
  Download,
  Share2,
  Plus,
  Camera,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  Snowflake,
  FlaskConical,
  Wrench,
} from 'lucide-react';

const categoriaIcons: Record<string, React.ReactNode> = {
  forno_combinado: <UtensilsCrossed className="h-4 w-4" />,
  refrigeracao: <Snowflake className="h-4 w-4" />,
  quimicos: <FlaskConical className="h-4 w-4" />,
  servico: <Wrench className="h-4 w-4" />,
};

function PhotoCarousel({ fotos, nome }: { fotos: string[]; nome: string }) {
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  if (fotos.length === 0) {
    return (
      <div className="aspect-[4/3] bg-muted flex flex-col items-center justify-center text-muted-foreground">
        <UtensilsCrossed className="h-16 w-16 mb-2" />
        <span className="text-sm text-center px-4">{nome}</span>
      </div>
    );
  }

  return (
    <>
      <div className="relative aspect-[4/3] bg-muted cursor-pointer" onClick={() => setFullscreen(true)}>
        <img src={fotos[current]} alt={nome} className="w-full h-full object-cover" />
        {fotos.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + fotos.length) % fotos.length); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % fotos.length); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {fotos.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === current ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-3xl p-0 bg-black border-none">
          <img src={fotos[current]} alt={nome} className="w-full h-auto" />
        </DialogContent>
      </Dialog>
    </>
  );
}

function PhotoManager({ produto, onUpdate }: { produto: ProdutoGCRow; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const currentPhotos = [
    ...(produto.foto_url ? [produto.foto_url] : []),
    ...(produto.fotos_urls ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 5MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // Client-side resize
      const resized = await resizeImage(file, 1200, 0.85);
      const url = await uploadProductPhoto(produto.gc_id, resized);
      const newPhotos = [...currentPhotos, url];
      await updateProductPhotos(produto.id, newPhotos[0], newPhotos);
      toast({ title: '✅ Foto salva com sucesso' });
      onUpdate();
    } catch (err: any) {
      toast({ title: 'Erro ao enviar foto', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (url: string) => {
    const newPhotos = currentPhotos.filter((u) => u !== url);
    try {
      await updateProductPhotos(produto.id, newPhotos[0] ?? null as any, newPhotos);
      toast({ title: 'Foto removida' });
      onUpdate();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Camera className="h-4 w-4" /> Gerenciar Fotos
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Fotos — {produto.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {currentPhotos.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                  <img src={url} className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleDelete(url)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                      Principal
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

async function resizeImage(file: File, maxWidth: number, quality: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = (maxWidth / w) * h;
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => resolve(new File([blob!], file.name, { type: 'image/jpeg' })),
        'image/jpeg',
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function CatalogoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { perfil } = useAuth();

  const { data: produto, isLoading } = useQuery({
    queryKey: ['produto_gc', id],
    queryFn: () => fetchProdutoById(id!),
    enabled: !!id,
  });

  const handleShare = async () => {
    if (!produto) return;
    const text = `${produto.nome}${produto.preco_venda ? ` — ${formatBRL(produto.preco_venda)}` : ''}`;
    if (navigator.share) {
      await navigator.share({ title: produto.nome, text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['produto_gc', id] });
    queryClient.invalidateQueries({ queryKey: ['produtos_gc'] });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
        <div className="space-y-3 mt-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
        </div>
      </MainLayout>
    );
  }

  if (!produto) {
    return (
      <MainLayout>
        <div className="text-center py-12 text-muted-foreground">
          <p>Produto não encontrado.</p>
          <Button variant="link" onClick={() => navigate('/catalogo')}>Voltar ao catálogo</Button>
        </div>
      </MainLayout>
    );
  }

  const badge = badgeEstoque(produto.estoque_atual, produto.tipo);
  const badgeColors: Record<string, string> = {
    green: 'bg-emerald-500 text-white',
    yellow: 'bg-amber-500 text-white',
    red: 'bg-red-500 text-white',
    blue: 'bg-blue-500 text-white',
  };

  const allPhotos = [
    ...(produto.foto_url ? [produto.foto_url] : []),
    ...(produto.fotos_urls ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const catLabel = categoriaChips.find((c) => c.value === produto.categoria)?.label || produto.categoria;
  const isAdmin = perfil === 'admin' || perfil === 'gestor';

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/catalogo')} className="gap-1 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Catálogo
        </Button>

        {/* Carousel */}
        <Card className="overflow-hidden">
          <PhotoCarousel fotos={allPhotos} nome={produto.nome} />
        </Card>

        {/* Info */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs gap-1">
                  {categoriaIcons[produto.categoria ?? '']}
                  {catLabel}
                </Badge>
                {produto.destaque && (
                  <Badge className="bg-amber-400 text-amber-900 text-xs gap-1">
                    <Star className="h-3 w-3" /> Destaque
                  </Badge>
                )}
              </div>
              <h1 className="text-xl font-bold">{produto.nome}</h1>
              {produto.codigo && (
                <p className="text-xs text-muted-foreground">Código: {produto.codigo}</p>
              )}
            </div>
          </div>

          {/* Prices */}
          <div className="space-y-1">
            {produto.preco_venda != null && (
              <p className="text-2xl font-bold text-emerald-600">
                💰 {formatBRL(produto.preco_venda)}
              </p>
            )}
            {produto.preco_locacao_mensal != null && (
              <p className="text-base text-blue-600 font-medium">
                🔵 Locação: {formatBRL(produto.preco_locacao_mensal)}/mês
              </p>
            )}
          </div>

          {/* Stock badge */}
          <span className={`inline-block text-sm px-3 py-1 rounded-full font-medium ${badgeColors[badge.variant]}`}>
            {badge.label}
          </span>

          <Separator />

          {/* Description */}
          {produto.descricao && (
            <div>
              <h3 className="font-semibold text-sm mb-1">Descrição Técnica</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{produto.descricao}</p>
            </div>
          )}

          {/* Technical file */}
          {produto.ficha_tecnica_url && (
            <Button variant="outline" size="sm" asChild className="gap-2">
              <a href={produto.ficha_tecnica_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" /> Baixar Ficha Técnica (PDF)
              </a>
            </Button>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <WAIButton
              variant="inline"
              contexto={{
                oportunidade: {
                  titulo: `Consulta sobre ${produto.nome}`,
                  etapa: 'catalogo',
                  tipo_venda: produto.categoria || undefined,
                  valor_estimado: produto.preco_venda,
                  produtos_interesse: `${produto.nome} (${produto.codigo || ''})`,
                },
              }}
            />
            <Button className="flex-1 gap-2">
              <Plus className="h-4 w-4" /> Adicionar à Proposta
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Photo manager for admin */}
          {isAdmin && (
            <div className="pt-2">
              <PhotoManager produto={produto} onUpdate={refetch} />
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
