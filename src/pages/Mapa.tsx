import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, InfoWindowF, HeatmapLayerF } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/api/propostas';
import { format, differenceInDays } from 'date-fns';
import {
  MapPin, Search, Layers, Filter, Phone, MessageCircle, ExternalLink,
  Navigation, Users, TrendingUp, Loader2, Menu, X, Crosshair, MapIcon
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const LIBRARIES: ('visualization' | 'places')[] = ['visualization', 'places'];
const MAP_CENTER = { lat: -15.78, lng: -47.93 };

// Status colors for client markers
function getClientStatusColor(ultimaCompra: string | null): string {
  if (!ultimaCompra) return '#6B7280'; // Inativo
  const days = differenceInDays(new Date(), new Date(ultimaCompra));
  if (days <= 30) return '#22C55E'; // Ativo
  if (days <= 60) return '#EAB308'; // Warm
  if (days <= 90) return '#EF4444'; // At-Risk
  return '#6B7280'; // Inativo
}

function getClientStatusLabel(ultimaCompra: string | null): string {
  if (!ultimaCompra) return 'Inativo';
  const days = differenceInDays(new Date(), new Date(ultimaCompra));
  if (days <= 30) return 'Ativo';
  if (days <= 60) return 'Morno';
  if (days <= 90) return 'Em Risco';
  return 'Inativo';
}

// Opportunity stage colors
const ETAPA_COLORS: Record<string, string> = {
  prospeccao: '#64748B',
  qualificacao: '#3B82F6',
  proposta: '#F59E0B',
  negociacao: '#8B5CF6',
  fechamento: '#22C55E',
};

function getOpRadius(valor: number): number {
  if (valor > 100000) return 22;
  if (valor > 50000) return 16;
  if (valor > 20000) return 12;
  return 8;
}

interface ClienteGeo {
  id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  segmento: string | null;
  latitude: number;
  longitude: number;
  total_compras_gc: number | null;
  ultima_compra_gc: string | null;
}

interface OportunidadeGeo {
  id: string;
  titulo: string;
  etapa: string;
  valor_estimado: number | null;
  cliente_id: string | null;
  cliente?: { nome: string; latitude: number | null; longitude: number | null } | null;
}

export default function Mapa() {
  const [mapsKey, setMapsKey] = useState<string>('');
  const [keyLoading, setKeyLoading] = useState(true);

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const { data } = await supabase.functions.invoke('google-maps-key');
        if (data?.key) setMapsKey(data.key);
      } catch (e) {
        console.error('Failed to fetch maps key:', e);
      } finally {
        setKeyLoading(false);
      }
    };
    fetchKey();
  }, []);

  if (keyLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando mapa…</span>
        </div>
      </MainLayout>
    );
  }

  if (!mapsKey) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <MapIcon className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Chave do Google Maps não configurada.</p>
        </div>
      </MainLayout>
    );
  }

  return <MapaInner mapsKey={mapsKey} />;
}

function MapaInner({ mapsKey }: { mapsKey: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, perfil } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);

  const [selectedClient, setSelectedClient] = useState<ClienteGeo | null>(null);
  const [selectedOp, setSelectedOp] = useState<OportunidadeGeo | null>(null);
  const [showClientes, setShowClientes] = useState(true);
  const [showOportunidades, setShowOportunidades] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [busca, setBusca] = useState('');
  const [segmentoFilter, setSegmentoFilter] = useState('todos');
  const [cidadeFilter, setCidadeFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [geocodificando, setGeocodificando] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewportBounds, setViewportBounds] = useState<google.maps.LatLngBounds | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: mapsKey,
    libraries: LIBRARIES,
  });

  // Fetch geocoded clients
  const { data: clientes = [], isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes_geo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes_gc')
        .select('id, nome, razao_social, cnpj, telefone, celular, email, cidade, estado, endereco, segmento, latitude, longitude, total_compras_gc, ultima_compra_gc')
        .eq('geocodificado', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
      if (error) throw error;
      return (data ?? []) as unknown as ClienteGeo[];
    },
  });

  // Fetch opportunities with client location
  const { data: oportunidades = [] } = useQuery({
    queryKey: ['oportunidades_geo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oportunidades')
        .select('id, titulo, etapa, valor_estimado, cliente_id, cliente:clientes_gc!oportunidades_cliente_id_fkey(nome, latitude, longitude)')
        .not('etapa', 'in', '(ganho,perdido)');
      if (error) throw error;
      return (data ?? []) as unknown as OportunidadeGeo[];
    },
  });

  // Count pending geocoding
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['geo_pending_count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('clientes_gc')
        .select('*', { count: 'exact', head: true })
        .or('geocodificado.is.null,geocodificado.eq.false')
        .not('cidade', 'is', null);
      return count ?? 0;
    },
  });

  // Derived: unique segments and cities
  const segmentos = useMemo(() => {
    const set = new Set(clientes.map(c => c.segmento).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [clientes]);

  const cidades = useMemo(() => {
    const set = new Set(clientes.map(c => c.cidade).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [clientes]);

  // Filtered clients
  const filteredClientes = useMemo(() => {
    let list = clientes;
    if (segmentoFilter !== 'todos') list = list.filter(c => c.segmento === segmentoFilter);
    if (cidadeFilter !== 'todos') list = list.filter(c => c.cidade === cidadeFilter);
    if (statusFilter !== 'todos') {
      list = list.filter(c => getClientStatusLabel(c.ultima_compra_gc) === statusFilter);
    }
    if (busca.length >= 2) {
      const q = busca.toLowerCase();
      list = list.filter(c => c.nome.toLowerCase().includes(q) || c.cnpj?.includes(q) || c.cidade?.toLowerCase().includes(q));
    }
    // Viewport filter
    if (viewportBounds) {
      list = list.filter(c => viewportBounds.contains({ lat: c.latitude, lng: c.longitude }));
    }
    return list;
  }, [clientes, segmentoFilter, cidadeFilter, statusFilter, busca, viewportBounds]);

  // Filtered opportunities (only those with geo)
  const filteredOps = useMemo(() => {
    return oportunidades.filter(op => {
      const c = op.cliente as any;
      return c?.latitude && c?.longitude;
    });
  }, [oportunidades]);

  // KPIs
  const kpis = useMemo(() => ({
    clientes: filteredClientes.length,
    ops: filteredOps.length,
    pipeline: filteredOps.reduce((s, o) => s + (o.valor_estimado ?? 0), 0),
  }), [filteredClientes, filteredOps]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    if (!isLoaded || !showHeatmap) return [];
    return filteredOps.map(op => {
      const c = op.cliente as any;
      return {
        location: new google.maps.LatLng(c.latitude, c.longitude),
        weight: Math.max(op.valor_estimado ?? 1000, 1000) / 1000,
      };
    });
  }, [isLoaded, showHeatmap, filteredOps]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Fit bounds
    if (clientes.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      clientes.forEach(c => bounds.extend({ lat: c.latitude, lng: c.longitude }));
      map.fitBounds(bounds, 50);
    }
  }, [clientes]);

  const onMapIdle = useCallback(() => {
    const bounds = mapRef.current?.getBounds();
    if (bounds) setViewportBounds(bounds);
  }, []);

  // Draw markers manually via useEffect
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    // Clear old markers
    markersRef.current.forEach(m => (m.map = null));
    markersRef.current = [];
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }

    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    // Client markers
    if (showClientes) {
      filteredClientes.forEach(c => {
        const color = getClientStatusColor(c.ultima_compra_gc);
        const size = Math.min(24, Math.max(8, (c.total_compras_gc ?? 0) / 5000 + 8));
        const el = document.createElement('div');
        el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;`;
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current!,
          position: { lat: c.latitude, lng: c.longitude },
          content: el,
          title: c.nome,
        });
        marker.addListener('click', () => { setSelectedClient(c); setSelectedOp(null); });
        markers.push(marker);
      });
    }

    // Opportunity markers
    if (showOportunidades) {
      filteredOps.forEach(op => {
        const cl = op.cliente as any;
        if (!cl?.latitude || !cl?.longitude) return;
        const color = ETAPA_COLORS[op.etapa] || '#64748B';
        const size = getOpRadius(op.valor_estimado ?? 0);
        const el = document.createElement('div');
        el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;opacity:${showHeatmap ? 0.4 : 1};`;
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current!,
          position: { lat: cl.latitude, lng: cl.longitude },
          content: el,
          title: op.titulo,
        });
        marker.addListener('click', () => { setSelectedOp(op); setSelectedClient(null); });
        markers.push(marker);
      });
    }

    markersRef.current = markers;

    // Clustering
    if (markers.length > 10) {
      clustererRef.current = new MarkerClusterer({
        map: mapRef.current!,
        markers,
      });
    }

    return () => {
      markers.forEach(m => (m.map = null));
      if (clustererRef.current) clustererRef.current.clearMarkers();
    };
  }, [isLoaded, filteredClientes, filteredOps, showClientes, showOportunidades, showHeatmap]);

  const centerOnClient = (c: ClienteGeo) => {
    mapRef.current?.panTo({ lat: c.latitude, lng: c.longitude });
    mapRef.current?.setZoom(15);
    setSelectedClient(c);
    setSelectedOp(null);
    if (isMobile) setSidebarOpen(false);
  };

  const handleGeocodificar = async () => {
    setGeocodificando(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocodificar-clientes');
      if (error) throw error;
      toast({ title: `✅ Geocodificação concluída`, description: `${data.geocoded} clientes geocodificados, ${data.errors} erros` });
      queryClient.invalidateQueries({ queryKey: ['clientes_geo'] });
      queryClient.invalidateQueries({ queryKey: ['geo_pending_count'] });
    } catch (e: any) {
      toast({ title: 'Erro na geocodificação', description: e.message, variant: 'destructive' });
    } finally {
      setGeocodificando(false);
    }
  };

  const openWhatsApp = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    const num = clean.startsWith('55') ? clean : `55${clean}`;
    window.open(`https://wa.me/${num}`, '_blank');
  };

  const openRoute = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  // Sidebar content (reused in desktop and mobile)
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <MapIcon className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-sm">Mapa Comercial</h2>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, CNPJ, cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Layers */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Layers className="h-3.5 w-3.5" /> Camadas
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Clientes</Label>
            <Switch checked={showClientes} onCheckedChange={setShowClientes} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" /> Oportunidades</Label>
            <Switch checked={showOportunidades} onCheckedChange={setShowOportunidades} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">🔥 Heatmap</Label>
            <Switch checked={showHeatmap} onCheckedChange={setShowHeatmap} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="h-3.5 w-3.5" /> Filtros
        </div>
        <Select value={segmentoFilter} onValueChange={setSegmentoFilter}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Segmento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os segmentos</SelectItem>
            {segmentos.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cidadeFilter} onValueChange={setCidadeFilter}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as cidades</SelectItem>
            {cidades.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="Ativo">🟢 Ativo</SelectItem>
            <SelectItem value="Morno">🟡 Morno</SelectItem>
            <SelectItem value="Em Risco">🔴 Em Risco</SelectItem>
            <SelectItem value="Inativo">⚫ Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">{kpis.clientes}</p>
            <p className="text-[10px] text-muted-foreground">Clientes</p>
          </div>
          <div>
            <p className="text-lg font-bold">{kpis.ops}</p>
            <p className="text-[10px] text-muted-foreground">Oportunidades</p>
          </div>
          <div>
            <p className="text-lg font-bold text-primary">{formatBRL(kpis.pipeline)}</p>
            <p className="text-[10px] text-muted-foreground">Pipeline</p>
          </div>
        </div>
      </div>

      {/* Geocoding button */}
      {pendingCount > 0 && (
        <div className="p-4 border-b border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleGeocodificar}
            disabled={geocodificando}
          >
            {geocodificando ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Geocodificando...</> : <><Crosshair className="h-3 w-3 mr-1" /> Geocodificar {pendingCount} pendentes</>}
          </Button>
        </div>
      )}

      {/* Client list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredClientes.slice(0, 50).map(c => {
            const statusColor = getClientStatusColor(c.ultima_compra_gc);
            return (
              <button
                key={c.id}
                onClick={() => centerOnClient(c)}
                className="w-full text-left p-3 rounded-lg hover:bg-accent/50 transition-colors border border-transparent hover:border-border"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.segmento && `${c.segmento} · `}{c.cidade}/{c.estado}
                    </p>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: statusColor }} />
                </div>
                {c.total_compras_gc && c.total_compras_gc > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">💰 {formatBRL(c.total_compras_gc)}</p>
                )}
              </button>
            );
          })}
          {filteredClientes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente nesta área</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  if (!keyLoading && !mapsKey) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-3">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <h2 className="text-lg font-semibold">API Key do Google Maps não configurada</h2>
            <p className="text-sm text-muted-foreground">Configure GOOGLE_MAPS_API_KEY nos secrets do projeto.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (keyLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-0px)] -m-4 md:-m-6 relative">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex w-80 border-r border-border bg-card flex-col shrink-0">
          {sidebarContent}
        </div>

        {/* Mobile sidebar trigger */}
        <div className="lg:hidden absolute top-3 left-3 z-20">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="secondary" className="shadow-lg">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              {sidebarContent}
            </SheetContent>
          </Sheet>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {!isLoaded ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={MAP_CENTER}
              zoom={5}
              onLoad={onMapLoad}
              onIdle={onMapIdle}
              options={{
                mapId: 'wedo-commercial-map',
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: true,
                mapTypeControl: true,
                fullscreenControl: true,
              }}
            >
              {/* Heatmap */}
              {showHeatmap && heatmapData.length > 0 && (
                <HeatmapLayerF
                  data={heatmapData}
                  options={{
                    radius: 40,
                    opacity: 0.6,
                    gradient: [
                      'rgba(0, 0, 255, 0)',
                      'rgba(0, 128, 255, 0.6)',
                      'rgba(0, 255, 0, 0.7)',
                      'rgba(255, 255, 0, 0.8)',
                      'rgba(255, 0, 0, 0.9)',
                    ],
                  }}
                />
              )}

              {/* Client InfoWindow */}
              {selectedClient && (
                <InfoWindowF
                  position={{ lat: selectedClient.latitude, lng: selectedClient.longitude }}
                  onCloseClick={() => setSelectedClient(null)}
                >
                  <div className="max-w-xs space-y-2 p-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm" style={{ color: '#111827' }}>{selectedClient.razao_social || selectedClient.nome}</h3>
                      <div className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: getClientStatusColor(selectedClient.ultima_compra_gc) }} />
                    </div>
                    {selectedClient.cnpj && <p className="text-xs" style={{ color: '#6B7280' }}>CNPJ: {selectedClient.cnpj}</p>}
                    <hr style={{ borderColor: '#E5E7EB' }} />
                    {selectedClient.telefone && <p className="text-xs" style={{ color: '#374151' }}>📞 {selectedClient.telefone}</p>}
                    {selectedClient.email && <p className="text-xs" style={{ color: '#374151' }}>📧 {selectedClient.email}</p>}
                    {selectedClient.endereco && <p className="text-xs" style={{ color: '#374151' }}>📍 {selectedClient.endereco} — {selectedClient.cidade}/{selectedClient.estado}</p>}
                    <hr style={{ borderColor: '#E5E7EB' }} />
                    <div className="text-xs" style={{ color: '#374151' }}>
                      {selectedClient.segmento && <p>🏷️ {selectedClient.segmento}</p>}
                      <p>📊 {getClientStatusLabel(selectedClient.ultima_compra_gc)}</p>
                      {selectedClient.total_compras_gc && selectedClient.total_compras_gc > 0 && <p>💰 Total: {formatBRL(selectedClient.total_compras_gc)}</p>}
                    </div>
                    <div className="flex gap-1 pt-1">
                      <button
                        onClick={() => navigate(`/cliente/${selectedClient.id}`)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: '#0066FF', color: 'white' }}
                      >Ver Perfil</button>
                      <button
                        onClick={() => openRoute(selectedClient.latitude, selectedClient.longitude)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: '#E5E7EB', color: '#374151' }}
                      >Rota</button>
                      {(selectedClient.celular || selectedClient.telefone) && (
                        <button
                          onClick={() => openWhatsApp(selectedClient.celular || selectedClient.telefone!)}
                          className="text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: '#22C55E', color: 'white' }}
                        >WhatsApp</button>
                      )}
                      {selectedClient.telefone && (
                        <a href={`tel:${selectedClient.telefone}`} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#E5E7EB', color: '#374151' }}>📞</a>
                      )}
                    </div>
                  </div>
                </InfoWindowF>
              )}

              {/* Opportunity InfoWindow */}
              {selectedOp && (() => {
                const cl = selectedOp.cliente as any;
                return cl?.latitude && cl?.longitude ? (
                  <InfoWindowF
                    position={{ lat: cl.latitude, lng: cl.longitude }}
                    onCloseClick={() => setSelectedOp(null)}
                  >
                    <div className="max-w-xs space-y-2 p-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      <h3 className="font-bold text-sm" style={{ color: '#111827' }}>💰 {selectedOp.titulo}</h3>
                      <p className="text-xs" style={{ color: '#6B7280' }}>🏢 {cl.nome}</p>
                      <p className="text-xs" style={{ color: '#374151' }}>Etapa: {selectedOp.etapa}</p>
                      {selectedOp.valor_estimado && <p className="text-xs font-semibold" style={{ color: '#111827' }}>Valor: {formatBRL(selectedOp.valor_estimado)}</p>}
                      <button
                        onClick={() => navigate(`/oportunidades/${selectedOp.id}`)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: '#0066FF', color: 'white' }}
                      >Ver Oportunidade</button>
                    </div>
                  </InfoWindowF>
                ) : null;
              })()}
            </GoogleMap>
          )}
        </div>
      </div>
    </MainLayout>
  );
}