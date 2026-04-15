import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Search, Plus, Filter, Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import {
  clientesGCApi,
  calcularSaude,
  saudeConfig,
  segmentoConfig,
  getAvatarColor,
  getInitials,
} from '@/lib/api/clientesGC';
import type { ClienteGC } from '@/types/crm';

type SaudeFilter = 'todos' | 'ativo' | 'morno' | 'risco' | 'inativo';
type SortOption = 'nome' | 'ultima_compra' | 'total_compras';

export default function ClientesGC() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [segmentoFilter, setSegmentoFilter] = useState('todos');
  const [porteFilter, setPorteFilter] = useState('todos');
  const [saudeFilter, setSaudeFilter] = useState<SaudeFilter>('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [sortBy, setSortBy] = useState<SortOption>('nome');

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes_gc'],
    queryFn: clientesGCApi.getAll,
  });

  const estados = useMemo(() => {
    const set = new Set(clientes.map(c => c.estado).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [clientes]);

  const filtered = useMemo(() => {
    let result = clientes.filter(c => {
      const q = search.toLowerCase();
      const cnpjDigits = search.replace(/\D/g, '');
      const matchSearch = !q ||
        c.nome.toLowerCase().includes(q) ||
        (c.razao_social?.toLowerCase().includes(q)) ||
        (cnpjDigits.length > 0 && c.cnpj?.includes(cnpjDigits)) ||
        (c.cidade?.toLowerCase().includes(q));

      const matchSegmento = segmentoFilter === 'todos' || c.segmento === segmentoFilter;
      const matchPorte = porteFilter === 'todos' || c.porte === porteFilter;
      const matchEstado = estadoFilter === 'todos' || c.estado === estadoFilter;
      const matchSaude = saudeFilter === 'todos' || calcularSaude(c.ultima_compra_gc ?? null) === saudeFilter;

      return matchSearch && matchSegmento && matchPorte && matchEstado && matchSaude;
    });

    result.sort((a, b) => {
      if (sortBy === 'nome') return a.nome.localeCompare(b.nome);
      if (sortBy === 'ultima_compra') {
        const da = a.ultima_compra_gc ? new Date(a.ultima_compra_gc).getTime() : 0;
        const db = b.ultima_compra_gc ? new Date(b.ultima_compra_gc).getTime() : 0;
        return db - da;
      }
      return b.total_compras_gc - a.total_compras_gc;
    });

    return result;
  }, [clientes, search, segmentoFilter, porteFilter, estadoFilter, saudeFilter, sortBy]);

  const filterContent = (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Segmento</label>
        <Select value={segmentoFilter} onValueChange={setSegmentoFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {Object.entries(segmentoConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Porte</label>
        <Select value={porteFilter} onValueChange={setPorteFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pequeno">Pequeno</SelectItem>
            <SelectItem value="medio">Médio</SelectItem>
            <SelectItem value="grande">Grande</SelectItem>
            <SelectItem value="rede">Rede</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Saúde</label>
        <Select value={saudeFilter} onValueChange={(v) => setSaudeFilter(v as SaudeFilter)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">🟢 Ativo</SelectItem>
            <SelectItem value="morno">🟡 Morno</SelectItem>
            <SelectItem value="risco">🔴 Em Risco</SelectItem>
            <SelectItem value="inativo">⚫ Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Estado</label>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {estados.map(uf => (
              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Ordenar por</label>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="nome">Nome A-Z</SelectItem>
            <SelectItem value="ultima_compra">Última Compra</SelectItem>
            <SelectItem value="total_compras">Maior Valor Total</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  function diasAtras(data: string | null | undefined): string {
    if (!data) return 'Nunca';
    const dias = Math.floor((Date.now() - new Date(data).getTime()) / (1000 * 60 * 60 * 24));
    if (dias === 0) return 'Hoje';
    if (dias === 1) return 'Ontem';
    return `há ${dias} dias`;
  }

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1>Clientes</h1>
          <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
        </div>
        <Button className="gap-2 hidden md:flex" onClick={() => navigate('/clientes/novo')}>
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, razão social, CNPJ ou cidade..."
            className="pl-10"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="md:max-w-sm md:ml-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="mt-4">{filterContent}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-1">Nenhum cliente encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? 'Tente outra busca' : 'Cadastre o primeiro cliente'}
          </p>
          <Button onClick={() => navigate('/clientes/novo')}>
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar primeiro cliente
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((cliente) => {
            const saude = calcularSaude(cliente.ultima_compra_gc ?? null);
            const cfg = saudeConfig[saude];
            const seg = segmentoConfig[cliente.segmento || 'outro'] || segmentoConfig.outro;
            const initials = getInitials(cliente.nome);
            const avatarColor = getAvatarColor(cliente.nome);

            return (
              <Card
                key={cliente.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none"
                onClick={() => navigate(`/cliente/${cliente.id}`)}
              >
                <CardContent className="flex items-center gap-3 p-3 md:p-4">
                  {/* Avatar */}
                  <div className={`h-10 w-10 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{cliente.nome}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{seg.icon} {cliente.cidade && `${cliente.cidade}-${cliente.estado}`}</span>
                      {cliente.cnpj && <span className="hidden md:inline">· {formatCNPJ(cliente.cnpj)}</span>}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                    <Badge className={`${cfg.color} text-[10px] border-0`}>
                      {cfg.label}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground max-w-[160px] leading-tight">
                      {cfg.motivo}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {diasAtras(cliente.ultima_compra_gc)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* FAB Mobile */}
      <button
        onClick={() => navigate('/clientes/novo')}
        className="fixed bottom-20 right-4 md:hidden h-14 w-14 rounded-full bg-[hsl(0,78%,56%)] text-white shadow-lg flex items-center justify-center hover:bg-[hsl(0,78%,48%)] transition-colors z-40"
      >
        <Plus className="h-6 w-6" />
      </button>
    </MainLayout>
  );
}

function formatCNPJ(cnpj: string): string {
  const c = cnpj.replace(/\D/g, '');
  if (c.length !== 14) return cnpj;
  return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}
