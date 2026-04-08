import { useState, useMemo, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, Star, UtensilsCrossed, Snowflake, FlaskConical, Wrench, WifiOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  fetchProdutosGC,
  getCacheTimestamp,
  badgeEstoque,
  formatBRL,
  categoriaChips,
  type CategoriaChip,
  type FiltroDisponibilidade,
  type ProdutoGCRow,
} from '@/lib/api/produtosGC';

const categoriaIcons: Record<string, React.ReactNode> = {
  forno_combinado: <UtensilsCrossed className="h-4 w-4" />,
  refrigeracao: <Snowflake className="h-4 w-4" />,
  quimicos: <FlaskConical className="h-4 w-4" />,
  servico: <Wrench className="h-4 w-4" />,
};

function ProductCard({ produto, onClick }: { produto: ProdutoGCRow; onClick: () => void }) {
  const badge = badgeEstoque(produto.estoque_atual, produto.tipo);
  const badgeColors: Record<string, string> = {
    green: 'bg-emerald-500 text-white',
    yellow: 'bg-amber-500 text-white',
    red: 'bg-red-500 text-white',
    blue: 'bg-blue-500 text-white',
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border border-border group"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
        {produto.foto_url ? (
          <img
            src={produto.foto_url}
            alt={produto.nome}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
            {categoriaIcons[produto.categoria ?? ''] || <UtensilsCrossed className="h-10 w-10" />}
            <span className="text-xs text-center line-clamp-2">{produto.nome}</span>
          </div>
        )}

        {produto.destaque && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-amber-400 text-amber-900 text-xs gap-1">
              <Star className="h-3 w-3" /> Destaque
            </Badge>
          </div>
        )}

        <div className="absolute bottom-2 left-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeColors[badge.variant]}`}>
            {badge.label}
          </span>
        </div>
      </div>

      <CardContent className="p-3 space-y-1.5">
        <p className="font-semibold text-sm line-clamp-2 leading-tight">{produto.nome}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {categoriaChips.find(c => c.value === produto.categoria)?.label || produto.categoria}
        </p>

        <div className="pt-1">
          {produto.preco_venda != null && (
            <p className="text-base font-bold text-emerald-600">{formatBRL(produto.preco_venda)}</p>
          )}
          {produto.preco_locacao_mensal != null && (
            <p className="text-xs text-blue-600 font-medium">
              🔵 Locação: {formatBRL(produto.preco_locacao_mensal)}/mês
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full" />
      <CardContent className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
      </CardContent>
    </Card>
  );
}

export default function Catalogo() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaChip>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroDisponivel, setFiltroDisponivel] = useState<FiltroDisponibilidade>('todos');
  const [filtroGrupo, setFiltroGrupo] = useState<string>('todos');
  const [apenasDestaques, setApenasDestaques] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos_gc'],
    queryFn: fetchProdutosGC,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Extract unique groups from products
  const grupos = useMemo(() => {
    const set = new Set<string>();
    produtos.forEach((p) => { if (p.categoria) set.add(p.categoria); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [produtos]);

  const filtrados = useMemo(() => {
    return produtos
      .filter((p) => {
        if (categoriaAtiva !== 'todos' && p.categoria !== categoriaAtiva) return false;
        if (filtroGrupo !== 'todos' && p.categoria !== filtroGrupo) return false;
        if (busca) {
          const q = busca.toLowerCase();
          if (
            !p.nome.toLowerCase().includes(q) &&
            !p.codigo?.toLowerCase().includes(q) &&
            !p.descricao?.toLowerCase().includes(q)
          )
            return false;
        }
        if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false;
        if (filtroDisponivel === 'disponivel' && (p.estoque_atual ?? 0) <= 0 && p.tipo !== 'servico') return false;
        if (filtroDisponivel === 'baixo' && (p.estoque_atual ?? 0) > 2) return false;
        if (filtroDisponivel === 'sem_estoque' && (p.estoque_atual ?? 0) > 0) return false;
        if (apenasDestaques && !p.destaque) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.destaque && !b.destaque) return -1;
        if (!a.destaque && b.destaque) return 1;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
  }, [produtos, categoriaAtiva, busca, filtroTipo, filtroDisponivel, filtroGrupo, apenasDestaques]);

  const cacheTime = getCacheTimestamp();

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Catálogo</h1>
            <Badge variant="secondary" className="text-xs">{produtos.length} produtos</Badge>
          </div>
        </div>

        {/* Offline banner */}
        {isOffline && cacheTime && (
          <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2">
            <WifiOff className="h-4 w-4" />
            <span>Usando dados offline — última sync: {new Date(cacheTime).toLocaleString('pt-BR')}</span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category chips + filter button */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
            {categoriaChips.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoriaAtiva(cat.value)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  categoriaAtiva === cat.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="produto">Produto</SelectItem>
                      <SelectItem value="servico">Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Grupo</Label>
                  <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os grupos</SelectItem>
                      {grupos.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Disponibilidade</Label>
                  <Select value={filtroDisponivel} onValueChange={(v) => setFiltroDisponivel(v as FiltroDisponibilidade)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="disponivel">✅ Em estoque</SelectItem>
                      <SelectItem value="baixo">⚠️ Baixo estoque</SelectItem>
                      <SelectItem value="sem_estoque">❌ Sem estoque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Somente destaques</Label>
                  <Switch checked={apenasDestaques} onCheckedChange={setApenasDestaques} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UtensilsCrossed className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhum produto encontrado</p>
            <p className="text-sm">Tente ajustar os filtros ou a busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtrados.map((p) => (
              <ProductCard
                key={p.id}
                produto={p}
                onClick={() => navigate(`/catalogo/${p.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
