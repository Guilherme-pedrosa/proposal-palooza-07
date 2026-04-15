import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
import { fetchProdutosGC, formatBRL, categoriaChips, type ProdutoGCRow, type CategoriaChip } from '@/lib/api/produtosGC';
import { tabelasPrecoApi, type PrecoProduto } from '@/lib/api/tabelasPreco';

interface CatalogPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (produto: ProdutoGCRow, precoCalculado: number) => void;
  tabelaPrecoId?: string;
}

export function CatalogPickerModal({ open, onClose, onSelect, tabelaPrecoId }: CatalogPickerModalProps) {
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<CategoriaChip>('todos');

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos_gc_catalogo'],
    queryFn: fetchProdutosGC,
    enabled: open,
  });

  const { data: precosTabela = [] } = useQuery({
    queryKey: ['precos_tabela_modal', tabelaPrecoId],
    queryFn: () => tabelasPrecoApi.getPrecosPorTabela(tabelaPrecoId!),
    enabled: open && !!tabelaPrecoId,
  });

  // Build a map of produto_id -> price for quick lookup
  const precoMap = new Map<string, number>();
  for (const p of precosTabela) {
    if (p.valor_venda > 0) {
      precoMap.set(p.produto_id, p.valor_venda);
    }
  }

  const filtered = produtos.filter((p) => {
    const matchBusca = !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(busca.toLowerCase());
    const matchCat = categoria === 'todos' || p.categoria?.toLowerCase().includes(categoria);
    return matchBusca && matchCat;
  });

  const getPreco = (p: ProdutoGCRow): number => {
    if (tabelaPrecoId && precoMap.has(p.id)) {
      return precoMap.get(p.id)!;
    }
    return p.preco_venda || 0;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Buscar no Catálogo WeDo</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar produto..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {categoriaChips.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategoria(c.value)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                categoria === c.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-accent'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum produto encontrado</p>
          ) : (
            filtered.map((p) => {
              const preco = getPreco(p);
              const isFromTable = tabelaPrecoId && precoMap.has(p.id);
              return (
                <button
                  key={p.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent text-left transition-colors"
                  onClick={() => { onSelect(p, preco); onClose(); }}
                >
                  {p.foto_url ? (
                    <img src={p.foto_url} alt={p.nome} className="w-12 h-12 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-lg shrink-0">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.categoria} · {p.unidade}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-medium text-primary">{formatBRL(preco)}</span>
                    {isFromTable && (
                      <p className="text-[10px] text-muted-foreground">tabela</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
