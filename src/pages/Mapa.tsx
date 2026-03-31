import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, InfoWindowF, HeatmapLayerF } from '@react-google-maps/api';
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
// Sheet removido — sidebar mobile agora é div fixa, sem conflito com Select Portal
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/api/propostas';
import { iniciarCheckin, fetchVisitaEmAndamento, type VisitaComCliente } from '@/lib/api/visitas';
import { HistoricoResumo, ClienteHistoricoPanel } from '@/components/visitas/ClienteHistoricoPanel';
import { LogIn, LogOut } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast as sonnerToast } from 'sonner';
import {
  MapPin, Search, Layers, Filter, Phone, MessageCircle, ExternalLink,
  Navigation, Users, TrendingUp, Loader2, Menu, X, Crosshair, MapIcon, RefreshCw, UserPlus
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const LIBRARIES: ('visualization' | 'places')[] = ['visualization', 'places'];
const MAP_CENTER = { lat: -15.78, lng: -47.93 };

// ─── CNAE groups for filter UI ─────────────────────────────────
const CNAE_GROUPS: { label: string; icon: string; codes: string[] }[] = [
  { label: 'Restaurantes', icon: '🍽️', codes: ['5611201', '5611202', '5611204', '5611205'] },
  { label: 'Lanchonetes', icon: '🥤', codes: ['5611203'] },
  { label: 'Hotéis', icon: '🏨', codes: ['5510801', '5510802', '5510803', '5590601', '5590602', '5590603', '5590699'] },
  { label: 'Hospitais', icon: '🏥', codes: ['8610101', '8610102', '8611801', '8630501'] },
  { label: 'Catering', icon: '🏭', codes: ['5620101', '5620102', '5620103', '5620104', '5612100'] },
  { label: 'Panificação', icon: '🥐', codes: ['1091101', '1091102', '4721102'] },
  { label: 'Alimentação Institucional', icon: '🍱', codes: ['5629801'] },
];

const REGIME_OPTIONS = ['Simples Nacional', 'MEI', 'Lucro Presumido/Real'];
const PORTE_OPTIONS = ['Micro Empresa', 'Empresa de Pequeno Porte', 'Demais'];

// ─── Helpers ───────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getClientStatusColor(ultimaCompra: string | null, financeiroAtrasado?: boolean): string {
  if (financeiroAtrasado) return '#F97316'; // orange
  if (!ultimaCompra) return '#6B7280';
  const days = differenceInDays(new Date(), new Date(ultimaCompra));
  if (days <= 30) return '#22C55E';
  if (days <= 60) return '#EAB308';
  if (days <= 90) return '#EF4444';
  return '#6B7280';
}

function getClientStatusLabel(ultimaCompra: string | null, financeiroAtrasado?: boolean): string {
  if (financeiroAtrasado) return 'Financeiro Atrasado';
  if (!ultimaCompra) return 'Inativo';
  const days = differenceInDays(new Date(), new Date(ultimaCompra));
  if (days <= 30) return 'Ativo';
  if (days <= 60) return 'Morno';
  if (days <= 90) return 'Em Risco';
  return 'Inativo';
}

const ETAPA_COLORS: Record<string, string> = {
  prospeccao: '#64748B', qualificacao: '#3B82F6', proposta: '#F59E0B', negociacao: '#8B5CF6', fechamento: '#22C55E',
};

function getOpRadius(valor: number): number {
  if (valor > 100000) return 22;
  if (valor > 50000) return 16;
  if (valor > 20000) return 12;
  return 8;
}

function formatCNPJ(cnpj: string): string {
  const c = cnpj.replace(/\D/g, '');
  if (c.length !== 14) return cnpj;
  return `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12)}`;
}

interface ClienteGeo {
  id: string; nome: string; razao_social: string | null; cnpj: string | null;
  telefone: string | null; celular: string | null; email: string | null;
  cidade: string | null; estado: string | null; endereco: string | null;
  segmento: string | null; latitude: number; longitude: number;
  total_compras_gc: number | null; ultima_compra_gc: string | null;
  gc_id: string; financeiro_atrasado: boolean | null;
}

interface OportunidadeGeo {
  id: string; titulo: string; etapa: string; valor_estimado: number | null;
  cliente_id: string | null;
  cliente?: { nome: string; latitude: number | null; longitude: number | null } | null;
}

interface ProspectGeo {
  cnpj: string; razao_social: string | null; nome_fantasia: string | null;
  cnae_codigo: string; cnae_descricao: string | null;
  regime_fiscal: string | null; porte: string | null; capital_social: number | null;
  endereco_completo: string | null; cidade: string | null; uf: string | null;
  telefone_1: string | null; telefone_2: string | null; email: string | null;
  latitude: number | null; longitude: number | null; geocodificado: boolean | null;
  eh_cliente_wedo: boolean | null;
}

// ─── Root component ────────────────────────────────────────────
export default function Mapa() {
  const [mapsKey, setMapsKey] = useState<string>('');
  const [keyLoading, setKeyLoading] = useState(true);

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const { data } = await supabase.functions.invoke('google-maps-key');
        if (data?.key) setMapsKey(data.key);
      } catch (e) { console.error('Failed to fetch maps key:', e); }
      finally { setKeyLoading(false); }
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

// ─── Inner Map ─────────────────────────────────────────────────
function MapaInner({ mapsKey }: { mapsKey: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, perfil } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const prospectMarkersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: mapsKey, libraries: LIBRARIES });

  // ─── User geolocation ─────────────────────────────
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      sonnerToast.error('Geolocalização não suportada neste navegador.');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setLocatingUser(false);
        if (mapRef.current) {
          mapRef.current.panTo(loc);
          mapRef.current.setZoom(13);
        }
      },
      (err) => {
        setLocatingUser(false);
        sonnerToast.error('Não foi possível obter sua localização. Verifique as permissões.');
        console.error('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Request location on mount
  useEffect(() => {
    requestUserLocation();
  }, []);

  // ─── Layer & filter state ──────────────────────────
  const [selectedClient, setSelectedClient] = useState<ClienteGeo | null>(null);
  const [selectedOp, setSelectedOp] = useState<OportunidadeGeo | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<ProspectGeo | null>(null);
  const [showClientes, setShowClientes] = useState(true);
  const [showOportunidades, setShowOportunidades] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showProspeccao, setShowProspeccao] = useState(false);
  const [busca, setBusca] = useState('');
  const [segmentoFilter, setSegmentoFilter] = useState('todos');
  const [cidadeFilter, setCidadeFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showFilters, setShowFilters] = useState(true);
  const [geocodificando, setGeocodificando] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewportBounds, setViewportBounds] = useState<google.maps.LatLngBounds | null>(null);

  // Prospect-specific filters
  const [prospCnaes, setProspCnaes] = useState<string[]>([]);
  const [prospRegimes, setProspRegimes] = useState<string[]>([]);
  const [prospPortes, setProspPortes] = useState<string[]>([]);
  const [prospUf, setProspUf] = useState('');
  const [prospCidade, setProspCidade] = useState('');
  const [prospOcultarClientes, setProspOcultarClientes] = useState(false);
  const [convertingCnpj, setConvertingCnpj] = useState<string | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [historicoClienteId, setHistoricoClienteId] = useState<{ id: string; nome: string; gcId?: string } | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  const setAllLayers = (enabled: boolean) => {
    setShowClientes(enabled);
    setShowOportunidades(enabled);
    setShowHeatmap(enabled);
    setShowProspeccao(enabled);
  };

  // Visita em andamento
  const { data: visitaEmAndamento, refetch: refetchVisita } = useQuery({
    queryKey: ['visita_em_andamento', user?.id],
    queryFn: () => fetchVisitaEmAndamento(user!.id),
    enabled: !!user,
  });

  const handleCheckinFromMap = async (cliente: ClienteGeo) => {
    if (!user) return;
    setCheckinLoading(true);
    try {
      const lat = userLocation?.lat || cliente.latitude;
      const lng = userLocation?.lng || cliente.longitude;
      const visita = await iniciarCheckin({
        cliente_id: cliente.id,
        vendedor_id: user.id,
        lat,
        lng,
      });
      sonnerToast.success(`📍 Check-in em ${cliente.nome} realizado!`);
      refetchVisita();
      setSelectedClient(null);
      navigate(`/visita/${visita.id}`);
    } catch (e: any) {
      sonnerToast.error('Erro ao fazer check-in: ' + (e.message || ''));
    } finally {
      setCheckinLoading(false);
    }
  };

  // ─── User location marker ─────────────────────────
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !userLocation) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(userLocation);
      return;
    }
    const blueDotSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="13" fill="#4285F4" fill-opacity="0.2" stroke="#4285F4" stroke-width="1.5"/>
        <circle cx="14" cy="14" r="6" fill="#4285F4" stroke="white" stroke-width="2.5"/>
      </svg>`;
    userMarkerRef.current = new google.maps.Marker({
      position: userLocation,
      map: mapRef.current,
      title: 'Minha localização',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(blueDotSvg),
        scaledSize: new google.maps.Size(28, 28),
        anchor: new google.maps.Point(14, 14),
      },
      zIndex: 999,
      clickable: false,
    });
  }, [isLoaded, mapReady, userLocation]);

  const { data: clientes = [], isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes_geo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes_gc')
        .select('id, gc_id, nome, razao_social, cnpj, telefone, celular, email, cidade, estado, endereco, segmento, latitude, longitude, total_compras_gc, ultima_compra_gc, financeiro_atrasado')
        .eq('geocodificado', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
      if (error) throw error;
      return (data ?? []) as unknown as ClienteGeo[];
    },
  });

  // ─── Data: Opportunities ──────────────────────────
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

  // ─── Data: Pending geocoding count ────────────────
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['geo_pending_count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('clientes_gc')
        .select('*', { count: 'exact', head: true })
        .or('geocodificado.is.null,geocodificado.eq.false')
        .not('cidade', 'is', null)
        .not('estado', 'is', null);
      return count ?? 0;
    },
  });

  // ─── Prospect filter validity ─────────────────────
  const hasProspectBaseFilter = prospCnaes.length > 0 || prospCidade.length > 0;
  const missingProspectUf = hasProspectBaseFilter && !prospUf;
  const prospectFilterValid = hasProspectBaseFilter && !!prospUf;

  // ─── Data: Prospects (only when layer is on + filters valid) ──
  const { data: prospects = [], isLoading: loadingProspects } = useQuery({
    queryKey: ['prospects_geo', prospCnaes, prospRegimes, prospPortes, prospUf, prospCidade, prospOcultarClientes],
    queryFn: async () => {
      // Expand CNAE groups into individual codes
      const allCodes: string[] = [];
      prospCnaes.forEach(groupLabel => {
        const group = CNAE_GROUPS.find(g => g.label === groupLabel);
        if (group) allCodes.push(...group.codes);
      });

      let query = supabase
        .from('prospects_rf')
        .select('cnpj, razao_social, nome_fantasia, cnae_codigo, cnae_descricao, regime_fiscal, porte, capital_social, endereco_completo, cidade, uf, telefone_1, telefone_2, email, latitude, longitude, geocodificado, eh_cliente_wedo')
        .eq('situacao_cadastral', 'Ativa')
        .eq('geocodificado', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (allCodes.length > 0) query = query.in('cnae_codigo', allCodes);
      // regime_fiscal and porte are often NULL in the data — use .or() to include NULLs
      if (prospRegimes.length > 0) {
        const regimeFilter = prospRegimes.map(r => `regime_fiscal.eq.${r}`).join(',');
        query = query.or(`${regimeFilter},regime_fiscal.is.null`);
      }
      if (prospPortes.length > 0) {
        const porteFilter = prospPortes.map(p => `porte.eq.${p}`).join(',');
        query = query.or(`${porteFilter},porte.is.null`);
      }
      if (prospUf) query = query.eq('uf', prospUf);
      if (prospCidade) query = query.eq('cidade', prospCidade);
      if (prospOcultarClientes) query = query.eq('eh_cliente_wedo', false);

      const { data, error } = await query.limit(5000);
      if (error) throw error;
      return (data ?? []) as unknown as ProspectGeo[];
    },
    enabled: showProspeccao && prospectFilterValid,
  });

  // ─── Data: UFs and cities for prospect filters ────
  const { data: prospectUfs = [] } = useQuery({
    queryKey: ['prospect_ufs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prospects_rf')
        .select('uf')
        .eq('situacao_cadastral', 'Ativa')
        .not('uf', 'is', null);
      if (error) throw error;
      const set = new Set((data ?? []).map((d: any) => d.uf).filter(Boolean));
      return Array.from(set).sort() as string[];
    },
    enabled: showProspeccao,
    staleTime: 60000,
  });

  const { data: prospectCidades = [] } = useQuery({
    queryKey: ['prospect_cidades', prospUf],
    queryFn: async () => {
      if (!prospUf) return [];
      const { data, error } = await supabase
        .from('prospects_rf')
        .select('cidade')
        .eq('situacao_cadastral', 'Ativa')
        .eq('uf', prospUf)
        .not('cidade', 'is', null);
      if (error) throw error;
      const set = new Set((data ?? []).map((d: any) => d.cidade).filter(Boolean));
      return Array.from(set).sort() as string[];
    },
    enabled: showProspeccao && !!prospUf,
    staleTime: 60000,
  });

  // ─── Derived: segments, cities, filtered ──────────
  const segmentos = useMemo(() => {
    const set = new Set(clientes.map(c => c.segmento).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [clientes]);

  const cidades = useMemo(() => {
    const set = new Set(clientes.map(c => c.cidade).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [clientes]);

  const hasActiveFilters = busca.length >= 2 || segmentoFilter !== 'todos' || cidadeFilter !== 'todos' || statusFilter !== 'todos';

  // Clients filtered by search/segment/city/status (used for MAP markers — stable across zoom)
  const mapFilteredClientes = useMemo(() => {
    let list = clientes;
    if (segmentoFilter !== 'todos') list = list.filter(c => c.segmento === segmentoFilter);
    if (cidadeFilter !== 'todos') list = list.filter(c => c.cidade === cidadeFilter);
    if (statusFilter !== 'todos') list = list.filter(c => getClientStatusLabel(c.ultima_compra_gc, !!c.financeiro_atrasado) === statusFilter);
    if (busca.length >= 2) {
      const q = busca.toLowerCase();
      list = list.filter(c =>
        c.nome.toLowerCase().includes(q) ||
        c.razao_social?.toLowerCase().includes(q) ||
        c.cnpj?.includes(q) ||
        c.cidade?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (b.total_compras_gc ?? 0) - (a.total_compras_gc ?? 0));
  }, [clientes, segmentoFilter, cidadeFilter, statusFilter, busca]);

  // Clients filtered by viewport (used for SIDEBAR list only)
  const filteredClientes = useMemo(() => {
    let list = mapFilteredClientes;
    if (!hasActiveFilters && viewportBounds) {
      list = list.filter(c => viewportBounds.contains({ lat: c.latitude, lng: c.longitude }));
    }
    return list;
  }, [mapFilteredClientes, viewportBounds, hasActiveFilters]);

  const filteredOps = useMemo(() => oportunidades.filter(op => { const c = op.cliente as any; return c?.latitude && c?.longitude; }), [oportunidades]);

  const geocodedProspects = useMemo(() => prospects.filter(p => p.latitude && p.longitude), [prospects]);

  const kpis = useMemo(() => ({
    clientes: filteredClientes.length,
    ops: filteredOps.length,
    pipeline: filteredOps.reduce((s, o) => s + (o.valor_estimado ?? 0), 0),
    prospects: geocodedProspects.length,
  }), [filteredClientes, filteredOps, geocodedProspects]);

  const noGeocodedClientes = clientes.length === 0;

  const heatmapData = useMemo(() => {
    if (!isLoaded || !showHeatmap) return [];
    return filteredOps.map(op => {
      const c = op.cliente as any;
      return { location: new google.maps.LatLng(c.latitude, c.longitude), weight: Math.max(op.valor_estimado ?? 1000, 1000) / 1000 };
    });
  }, [isLoaded, showHeatmap, filteredOps]);

  // ─── Map lifecycle ────────────────────────────────
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
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

  useEffect(() => {
    if (!mapRef.current || !isLoaded || !mapReady) return;

    markersRef.current.forEach(m => { google.maps.event.clearInstanceListeners(m); m.setMap(null); });
    markersRef.current = [];

    const markers: google.maps.Marker[] = [];
    const map = mapRef.current;

    if (showClientes) {
      mapFilteredClientes.forEach(c => {
        const color = getClientStatusColor(c.ultima_compra_gc, !!c.financeiro_atrasado);
        const isActive = color === '#22C55E';
        const isAtrasado = color === '#F97316';
        const pinW = isActive ? 48 : 36;
        const pinH = isActive ? 62 : 47;
        const initial = (c.nome || '?').charAt(0).toUpperCase();
        const glowFilter = isActive
          ? `<feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#22C55E" flood-opacity="0.6"/><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>`
          : isAtrasado
          ? `<feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#F97316" flood-opacity="0.6"/><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>`
          : `<feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>`;
          ? `<feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#22C55E" flood-opacity="0.6"/><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>`
          : `<feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>`;
        const strokeW = isActive ? '3' : '2.5';
        const fontSize = isActive ? '16' : '13';
        const textY = isActive ? '24' : '23';
        const circleR = isActive ? '12' : '10';
        const pinSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${pinW}" height="${pinH}" viewBox="0 0 40 52">
            <defs><filter id="shadow-${c.id.slice(0,6)}" x="-30%" y="-20%" width="160%" height="160%">${glowFilter}</filter></defs>
            <path d="M20 51C20 51 38 32.5 38 19C38 9.06 29.94 1 20 1C10.06 1 2 9.06 2 19C2 32.5 20 51 20 51Z" fill="${color}" stroke="white" stroke-width="${strokeW}" filter="url(#shadow-${c.id.slice(0,6)})"/>
            <circle cx="20" cy="19" r="${circleR}" fill="white" opacity="0.95"/>
            <text x="20" y="${textY}" text-anchor="middle" font-size="${fontSize}" font-weight="bold" font-family="Arial, sans-serif" fill="${color}">${initial}</text>
          </svg>`;

        const marker = new google.maps.Marker({
          position: { lat: c.latitude, lng: c.longitude },
          title: c.nome,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(pinSvg),
            scaledSize: new google.maps.Size(pinW, pinH),
            anchor: new google.maps.Point(pinW / 2, pinH),
          },
          zIndex: isActive ? 20 : 10,
          clickable: true,
          optimized: false,
        });

        marker.addListener('click', () => { setSelectedClient(c); setSelectedOp(null); setSelectedProspect(null); });
        markers.push(marker);
      });
    }

    if (showOportunidades) {
      filteredOps.forEach(op => {
        const cl = op.cliente as any;
        if (!cl?.latitude || !cl?.longitude) return;
        const color = ETAPA_COLORS[op.etapa] || '#64748B';
        const size = Math.min(48, Math.max(32, getOpRadius(op.valor_estimado ?? 0)));
        const opacity = showHeatmap ? 0.5 : 1;
        const opSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
            <defs><filter id="opshadow-${op.id.slice(0,6)}" x="-20%" y="-10%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/></filter></defs>
            <circle cx="20" cy="20" r="17" fill="${color}" opacity="${opacity}" stroke="white" stroke-width="2.5" filter="url(#opshadow-${op.id.slice(0,6)})"/>
            <text x="20" y="14" text-anchor="middle" font-size="7" font-weight="600" font-family="Arial, sans-serif" fill="white">R$</text>
            <text x="20" y="26" text-anchor="middle" font-size="10" font-weight="bold" font-family="Arial, sans-serif" fill="white">${((op.valor_estimado ?? 0) / 1000).toFixed(0)}k</text>
          </svg>`;

        const marker = new google.maps.Marker({
          position: { lat: cl.latitude, lng: cl.longitude },
          title: op.titulo,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(opSvg),
            scaledSize: new google.maps.Size(size, size),
            anchor: new google.maps.Point(size / 2, size / 2),
          },
          zIndex: 5,
          clickable: true,
          optimized: false,
        });

        marker.addListener('click', () => { setSelectedOp(op); setSelectedClient(null); setSelectedProspect(null); });
        markers.push(marker);
      });
    }

    markersRef.current = markers;
    markers.forEach(m => m.setMap(map));

    return () => {
      markers.forEach(m => { google.maps.event.clearInstanceListeners(m); m.setMap(null); });
    };
  }, [isLoaded, mapReady, mapFilteredClientes, filteredOps, showClientes, showOportunidades, showHeatmap]);

  // ─── Prospect markers (separate layer — small dots) ────────────
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !mapReady) return;

    prospectMarkersRef.current.forEach(m => { google.maps.event.clearInstanceListeners(m); m.setMap(null); });
    prospectMarkersRef.current = [];

    if (!showProspeccao || geocodedProspects.length === 0) return;

    const map = mapRef.current;
    const markers: google.maps.Marker[] = [];

    geocodedProspects.forEach(p => {
      const isClient = p.eh_cliente_wedo;
      const dotColor = isClient ? '#D4A017' : '#94A3B8';
      const dotSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4" fill="${dotColor}" fill-opacity="0.5" stroke="white" stroke-width="1"/>
        </svg>`;

      const marker = new google.maps.Marker({
        position: { lat: p.latitude!, lng: p.longitude! },
        title: p.nome_fantasia || p.razao_social || p.cnpj,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(dotSvg),
          scaledSize: new google.maps.Size(10, 10),
          anchor: new google.maps.Point(5, 5),
        },
        zIndex: 1,
        clickable: true,
        optimized: false,
      });

      marker.addListener('click', () => { setSelectedProspect(p); setSelectedClient(null); setSelectedOp(null); });
      markers.push(marker);
    });

    prospectMarkersRef.current = markers;
    markers.forEach(m => m.setMap(map));

    return () => {
      markers.forEach(m => { google.maps.event.clearInstanceListeners(m); m.setMap(null); });
    };
  }, [isLoaded, mapReady, showProspeccao, geocodedProspects]);

  // ─── Actions ──────────────────────────────────────
  const centerOnClient = (c: ClienteGeo) => {
    mapRef.current?.panTo({ lat: c.latitude, lng: c.longitude });
    mapRef.current?.setZoom(15);
    setSelectedClient(c); setSelectedOp(null); setSelectedProspect(null);
    if (isMobile) setSidebarOpen(false);
  };

  const handleGeocodificar = async () => {
    setGeocodificando(true);
    let totalGeocoded = 0, totalErrors = 0, rodada = 1;
    try {
      while (true) {
        toast({ title: `🔄 Geocodificando... (rodada ${rodada})`, description: `${totalGeocoded} geocodificados até agora` });
        const { data, error } = await supabase.functions.invoke('geocodificar-clientes');
        if (error) throw error;
        totalGeocoded += data.geocoded || 0;
        totalErrors += data.errors || 0;
        const processados = (data.geocoded || 0) + (data.errors || 0) + (data.skipped || 0);
        if (!data.total || data.total === 0 || processados === 0) break;
        rodada++;
        queryClient.invalidateQueries({ queryKey: ['clientes_geo'] });
        queryClient.invalidateQueries({ queryKey: ['geo_pending_count'] });
        await new Promise(r => setTimeout(r, 1000));
      }
      toast({ title: `✅ Geocodificação concluída!`, description: `${totalGeocoded} clientes geocodificados, ${totalErrors} erros` });
      queryClient.invalidateQueries({ queryKey: ['clientes_geo'] });
      queryClient.invalidateQueries({ queryKey: ['geo_pending_count'] });
    } catch (e: any) {
      toast({ title: totalGeocoded > 0 ? `⚠️ Parcialmente concluído (${totalGeocoded} ok)` : 'Erro na geocodificação', description: e.message, variant: totalGeocoded > 0 ? 'default' : 'destructive' });
      queryClient.invalidateQueries({ queryKey: ['clientes_geo'] });
      queryClient.invalidateQueries({ queryKey: ['geo_pending_count'] });
    } finally { setGeocodificando(false); }
  };

  const [syncingCompras, setSyncingCompras] = useState(false);
  const [syncComprasProgress, setSyncComprasProgress] = useState('');
  const handleSyncCompras = async () => {
    setSyncingCompras(true);
    let offset = 0;
    const batchSize = 50;
    let totalAtualizados = 0;
    let totalErros = 0;
    let totalSemCompra = 0;
    let totalClientes = 0;

    try {
      while (true) {
        setSyncComprasProgress(`Processando ${offset}/${totalClientes || '?'}...`);
        const { data, error } = await supabase.functions.invoke('gc-sync-ultima-compra', {
          body: { limit: batchSize, offset }
        });
        if (error) throw error;

        totalClientes = data.total_clientes || 0;
        totalAtualizados += data.atualizados || 0;
        totalErros += data.erros || 0;
        totalSemCompra += data.sem_compra || 0;

        if (!data.tem_mais) break;
        offset = data.proximo_offset;
      }

      toast({ title: '✅ Sync de compras concluída', description: `${totalAtualizados} atualizados, ${totalSemCompra} sem compra, ${totalErros} erros` });
      queryClient.invalidateQueries({ queryKey: ['clientes_geo'] });
    } catch (e: any) {
      toast({ title: 'Erro na sync de compras', description: e.message, variant: 'destructive' });
    } finally {
      setSyncingCompras(false);
      setSyncComprasProgress('');
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

  const handleConverterProspect = async (prospect: ProspectGeo) => {
    setConvertingCnpj(prospect.cnpj);
    try {
      // Create in clientes_gc
      const payload = {
        gc_id: `RF-${prospect.cnpj}`,
        nome: prospect.nome_fantasia || prospect.razao_social || '',
        razao_social: prospect.razao_social,
        cnpj: formatCNPJ(prospect.cnpj),
        telefone: prospect.telefone_1 || '',
        email: prospect.email || '',
        cidade: prospect.cidade || '',
        estado: prospect.uf || '',
        endereco: prospect.endereco_completo || '',
        segmento: prospect.cnae_descricao || '',
        porte: prospect.porte || '',
        ativo: true,
        total_compras_gc: 0,
        latitude: prospect.latitude,
        longitude: prospect.longitude,
        geocodificado: !!(prospect.latitude && prospect.longitude),
      };

      const { error } = await supabase.from('clientes_gc').insert(payload as any);
      if (error) throw error;

      sonnerToast.success('✅ Prospect convertido em cliente!');
      setSelectedProspect(null);
      queryClient.invalidateQueries({ queryKey: ['clientes_geo'] });
      queryClient.invalidateQueries({ queryKey: ['prospects_geo'] });

      // Navigate to client form for further editing
      navigate('/clientes-gc/novo');
    } catch (e: any) {
      sonnerToast.error(`Erro ao converter: ${e.message}`);
    } finally { setConvertingCnpj(null); }
  };

  // ─── Toggle CNAE group ────────────────────────────
  const toggleCnaeGroup = (label: string) => {
    setProspCnaes(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  };
  const toggleRegime = (r: string) => {
    setProspRegimes(prev => prev.includes(r) ? prev.filter(l => l !== r) : [...prev, r]);
  };
  const togglePorte = (p: string) => {
    setProspPortes(prev => prev.includes(p) ? prev.filter(l => l !== p) : [...prev, p]);
  };

  // ─── Sidebar ──────────────────────────────────────
  const sidebarContent = (
    <div className="flex min-h-full flex-col pb-[calc(env(safe-area-inset-bottom)+7rem)] lg:pb-0">{/* no h-full — parent ScrollArea handles overflow */}
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2.5 md:mb-3">
          <MapIcon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          <h2 className="font-bold text-xs md:text-sm">Mapa Comercial</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente, CNPJ, cidade..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8 pr-8 h-8 md:h-9 text-xs md:text-sm" />
          {busca && (
            <button onClick={() => setBusca('')} className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </button>
          )}
        </div>
        {busca.length >= 2 && (
          <p className="text-[10px] text-muted-foreground mt-1">{filteredClientes.length} resultado(s)</p>
        )}
      </div>

      {/* Layers */}
      <div className="p-3 md:p-4 border-b border-border space-y-2 md:space-y-3">
        <div className="flex items-center gap-2 text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Layers className="h-3 w-3 md:h-3.5 md:w-3.5" /> Camadas
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] md:text-[11px]" onClick={() => setAllLayers(true)}>
            Ativar tudo
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] md:text-[11px]" onClick={() => setAllLayers(false)}>
            Limpar
          </Button>
        </div>
        <div className="space-y-1">
          {[
            { key: 'clientes', label: 'Clientes', icon: <Users className="h-3 w-3" />, checked: showClientes, set: setShowClientes },
            { key: 'oportunidades', label: 'Oportunidades', icon: <TrendingUp className="h-3 w-3" />, checked: showOportunidades, set: setShowOportunidades },
            { key: 'heatmap', label: 'Heatmap', icon: <span className="text-[10px]">🔥</span>, checked: showHeatmap, set: setShowHeatmap },
            { key: 'prospeccao', label: 'Prospecção', icon: <span className="text-[10px]">🔍</span>, checked: showProspeccao, set: setShowProspeccao },
          ].map(layer => (
            <div
              key={layer.key}
              role="button"
              tabIndex={0}
              onClick={() => layer.set(!layer.checked)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); layer.set(!layer.checked); }}}
              className="w-full flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5 cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <span className="text-[11px] md:text-xs flex items-center gap-1.5 min-w-0">{layer.icon} {layer.label}</span>
              <Switch
                checked={layer.checked}
                onCheckedChange={(checked) => layer.set(checked)}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 ml-2 scale-90 border-border data-[state=unchecked]:bg-muted"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Prospect filters (only when layer active) */}
      {showProspeccao && (
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            🔍 Filtros Prospecção
          </div>

          {/* CNAE chips */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">CNAE (segmento)</p>
            <div className="flex flex-wrap gap-1">
              {CNAE_GROUPS.map(g => (
                <button
                  key={g.label}
                  onClick={() => toggleCnaeGroup(g.label)}
                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                    prospCnaes.includes(g.label)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {g.icon} {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Regime chips */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Regime Fiscal <span className="text-[10px] opacity-60">(inclui sem info)</span></p>
            <div className="flex flex-wrap gap-1">
              {REGIME_OPTIONS.map(r => (
                <button
                  key={r}
                  onClick={() => toggleRegime(r)}
                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                    prospRegimes.includes(r)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Porte chips */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Porte <span className="text-[10px] opacity-60">(inclui sem info)</span></p>
            <div className="flex flex-wrap gap-1">
              {PORTE_OPTIONS.map(p => (
                <button
                  key={p}
                  onClick={() => togglePorte(p)}
                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                    prospPortes.includes(p)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* UF */}
          <Select value={prospUf || '__todos__'} onValueChange={v => { setProspUf(v === '__todos__' ? '' : v); setProspCidade(''); }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="UF" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos os estados</SelectItem>
              {prospectUfs.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Cidade */}
          {prospUf && (
            <Select value={prospCidade || '__todos__'} onValueChange={v => setProspCidade(v === '__todos__' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todas as cidades</SelectItem>
                {prospectCidades.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {/* Ocultar já clientes */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="ocultar-clientes"
              checked={prospOcultarClientes}
              onCheckedChange={(v) => setProspOcultarClientes(!!v)}
            />
            <Label htmlFor="ocultar-clientes" className="text-xs cursor-pointer">
              Ocultar já clientes WeDo
            </Label>
          </div>

          {/* Status message */}
          {!hasProspectBaseFilter && (
            <p className="text-xs text-foreground bg-muted p-2 rounded">
              ⚠️ Selecione pelo menos um CNAE ou cidade para buscar prospects
            </p>
          )}
          {missingProspectUf && (
            <p className="text-xs text-foreground bg-muted p-2 rounded">
              ⚠️ Selecione um estado (UF) para buscar prospects
            </p>
          )}
          {prospectFilterValid && loadingProspects && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Buscando prospects…
            </p>
          )}
          {prospectFilterValid && !loadingProspects && (
            <p className="text-xs text-muted-foreground">
              {prospects.length} prospects encontrados
              {prospects.length === 5000 && ' — limite de 5.000 atingido, refine os filtros'}
            </p>
          )}
        </div>
      )}

      {/* Client filters */}
      <div className="p-4 border-b border-border space-y-3">
        <button
          type="button"
          onClick={() => setShowFilters(f => !f)}
          className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        >
          <span className="flex items-center gap-2"><Filter className="h-3.5 w-3.5" /> Filtros Clientes</span>
          <span className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {showFilters && (
          <div className="space-y-3">
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
        )}
      </div>

      {/* KPIs */}
      <div className="p-4 border-b border-border">
        <div className={`grid ${showProspeccao ? 'grid-cols-4' : 'grid-cols-3'} gap-2 text-center`}>
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
          {showProspeccao && (
            <div>
              <p className="text-lg font-bold text-muted-foreground">{kpis.prospects}</p>
              <p className="text-[10px] text-muted-foreground">Prospects</p>
            </div>
          )}
        </div>
      </div>

      {/* Geocoding button */}
      {pendingCount > 0 && (
        <div className="p-4 border-b border-border">
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleGeocodificar} disabled={geocodificando}>
            {geocodificando ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Geocodificando...</> : <><Crosshair className="h-3 w-3 mr-1" /> Geocodificar {pendingCount} pendentes</>}
          </Button>
        </div>
      )}

      {/* Sync compras */}
      <div className="px-4 pb-3">
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleSyncCompras} disabled={syncingCompras}>
          {syncingCompras ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> {syncComprasProgress || 'Sincronizando compras...'}</> : <><RefreshCw className="h-3 w-3 mr-1" /> Atualizar última compra GC</>}
        </Button>
      </div>

      {/* Client list */}
      <div>
        <div className="p-2 space-y-1">
          {filteredClientes.slice(0, 50).map(c => {
            const statusColor = getClientStatusColor(c.ultima_compra_gc);
            const distKm = userLocation ? haversineKm(userLocation.lat, userLocation.lng, c.latitude, c.longitude) : null;
            return (
              <button key={c.id} onClick={() => centerOnClient(c)} className="w-full text-left p-3 rounded-lg hover:bg-accent/50 transition-colors border border-transparent hover:border-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {distKm !== null && <span className="text-primary font-medium">{distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`} · </span>}
                      {c.segmento && `${c.segmento} · `}{c.cidade}/{c.estado}
                    </p>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: statusColor }} />
                </div>
                {c.total_compras_gc && c.total_compras_gc > 0 && <p className="text-xs text-muted-foreground mt-1">💰 {formatBRL(c.total_compras_gc)}</p>}
              </button>
            );
          })}
          {filteredClientes.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente nesta área</p>}
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout fullscreen hideSidebar hideHeader hideBottomNav>
      <div className="relative h-full min-h-0 overflow-hidden">
        {/* Sidebar — abre ao clicar no FAB */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-0 z-50 w-screen h-screen bg-background flex flex-col">
              <div className="flex items-center justify-between p-2 border-b border-border">
                <span className="text-sm font-semibold px-2">Mapa Comercial</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-md hover:bg-accent"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ScrollArea className="flex-1 min-h-0">{sidebarContent}</ScrollArea>
            </div>
          </>
        )}

        {/* FAB para abrir sidebar */}
        {!sidebarOpen && (
          <div className="absolute top-3 left-3 z-40">
            <Button
              size="icon"
              variant="secondary"
              className="shadow-lg h-10 w-10"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir filtros do mapa"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* My Location FAB */}
        <div className="absolute bottom-36 md:bottom-6 right-3 z-20">
          <Button
            size="icon"
            variant="secondary"
            className="shadow-lg h-10 w-10"
            onClick={requestUserLocation}
            disabled={locatingUser}
            title="Minha localização"
          >
            {locatingUser ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crosshair className="h-5 w-5 text-primary" />}
          </Button>
        </div>

        {/* Mobile KPI bar */}
        {isMobile && (
          <div className="absolute top-3 right-3 z-20 pointer-events-none bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg flex gap-3 text-center">
            <div>
              <p className="text-sm font-bold">{kpis.clientes}</p>
              <p className="text-[9px] text-muted-foreground">Clientes</p>
            </div>
            <div>
              <p className="text-sm font-bold">{kpis.ops}</p>
              <p className="text-[9px] text-muted-foreground">Ops</p>
            </div>
            {showProspeccao && (
              <div>
                <p className="text-sm font-bold text-muted-foreground">{kpis.prospects}</p>
                <p className="text-[9px] text-muted-foreground">Prosp.</p>
              </div>
            )}
          </div>
        )}

        {/* Map */}
        <div className="relative z-0 min-w-0 h-full min-h-0 overflow-hidden">
          {!isLoaded ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={MAP_CENTER}
              zoom={noGeocodedClientes ? 4 : 5}
              onLoad={onMapLoad}
              onIdle={onMapIdle}
              options={{
                disableDefaultUI: isMobile,
                zoomControl: !isMobile,
                streetViewControl: false,
                mapTypeControl: !isMobile,
                fullscreenControl: false,
                  clickableIcons: false,
                gestureHandling: 'greedy',
              }}
            >
              {/* Empty state */}
              {noGeocodedClientes && !showProspeccao && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="pointer-events-auto bg-card border border-border rounded-xl p-6 max-w-md text-center shadow-lg space-y-3">
                    <h3 className="font-semibold text-lg">Nenhum cliente no mapa ainda</h3>
                    <p className="text-sm text-muted-foreground">Sincronize seus clientes do GestãoClick primeiro, depois clique em Geocodificar.</p>
                    <Button onClick={handleGeocodificar} disabled={geocodificando || pendingCount === 0} className="w-full">
                      {geocodificando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Geocodificando...</> : <>🔄 Geocodificar Clientes</>}
                    </Button>
                  </div>
                </div>
              )}

              {/* Heatmap */}
              {!noGeocodedClientes && showHeatmap && heatmapData.length > 0 && (
                <HeatmapLayerF data={heatmapData} options={{ radius: 30, opacity: 0.35, gradient: ['rgba(0,0,255,0)', 'rgba(0,128,255,0.4)', 'rgba(0,255,0,0.5)', 'rgba(255,255,0,0.6)', 'rgba(255,0,0,0.7)'] }} />
              )}

              {/* Client InfoWindow */}
              {selectedClient && (
                <InfoWindowF position={{ lat: selectedClient.latitude, lng: selectedClient.longitude }} onCloseClick={() => setSelectedClient(null)}>
                  <div className="max-w-xs space-y-2 p-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm" style={{ color: '#111827' }}>{selectedClient.razao_social || selectedClient.nome}</h3>
                      <div className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: getClientStatusColor(selectedClient.ultima_compra_gc, !!selectedClient.financeiro_atrasado) }} />
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
                    {/* Histórico resumido */}
                    <HistoricoResumo
                      clienteId={selectedClient.id}
                      gcId={selectedClient.gc_id}
                      onVerTudo={() => {
                        setHistoricoClienteId({ id: selectedClient.id, nome: selectedClient.nome, gcId: selectedClient.gc_id });
                        setSelectedClient(null);
                      }}
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                      <a href={`/cliente/${selectedClient.id}`} className="text-xs px-2 py-1 rounded inline-block no-underline" style={{ backgroundColor: '#0066FF', color: 'white' }}>Ver Perfil</a>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedClient.latitude},${selectedClient.longitude}`} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded inline-block no-underline" style={{ backgroundColor: '#E5E7EB', color: '#374151' }}>Rota</a>
                      {(selectedClient.celular || selectedClient.telefone) && (() => {
                        const phone = selectedClient.celular || selectedClient.telefone!;
                        const clean = phone.replace(/\D/g, '');
                        const num = clean.startsWith('55') ? clean : `55${clean}`;
                        return <a href={`https://wa.me/${num}`} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded inline-block no-underline" style={{ backgroundColor: '#22C55E', color: 'white' }}>WhatsApp</a>;
                      })()}
                      {selectedClient.telefone && <a href={`tel:${selectedClient.telefone}`} className="text-xs px-2 py-1 rounded inline-block no-underline" style={{ backgroundColor: '#E5E7EB', color: '#374151' }}>📞</a>}
                      <a href={`https://www.google.com/maps/@${selectedClient.latitude},${selectedClient.longitude},3a,75y,90t/data=!3m7!1e1!3m5!1s!2e0!3e11!7i16384!8i8192`} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded inline-block no-underline" style={{ backgroundColor: '#F59E0B', color: 'white' }}>📷 Street View</a>
                      {!visitaEmAndamento && (
                        <button
                          onClick={() => handleCheckinFromMap(selectedClient)}
                          disabled={checkinLoading}
                          className="text-xs px-2 py-1 rounded flex items-center gap-1"
                          style={{ backgroundColor: '#8B5CF6', color: 'white' }}
                        >
                          {checkinLoading ? <><Loader2 className="h-3 w-3 animate-spin" /> Checkin...</> : <><LogIn className="h-3 w-3" /> Check-in</>}
                        </button>
                      )}
                    </div>
                  </div>
                </InfoWindowF>
              )}

              {/* Opportunity InfoWindow */}
              {selectedOp && (() => {
                const cl = selectedOp.cliente as any;
                return cl?.latitude && cl?.longitude ? (
                  <InfoWindowF position={{ lat: cl.latitude, lng: cl.longitude }} onCloseClick={() => setSelectedOp(null)}>
                    <div className="max-w-xs space-y-2 p-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      <h3 className="font-bold text-sm" style={{ color: '#111827' }}>💰 {selectedOp.titulo}</h3>
                      <p className="text-xs" style={{ color: '#6B7280' }}>🏢 {cl.nome}</p>
                      <p className="text-xs" style={{ color: '#374151' }}>Etapa: {selectedOp.etapa}</p>
                      {selectedOp.valor_estimado && <p className="text-xs font-semibold" style={{ color: '#111827' }}>Valor: {formatBRL(selectedOp.valor_estimado)}</p>}
                      <button onClick={() => navigate(`/oportunidades/${selectedOp.id}`)} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#0066FF', color: 'white' }}>Ver Oportunidade</button>
                    </div>
                  </InfoWindowF>
                ) : null;
              })()}

              {/* Prospect InfoWindow */}
              {selectedProspect && selectedProspect.latitude && selectedProspect.longitude && (
                <InfoWindowF
                  position={{ lat: selectedProspect.latitude, lng: selectedProspect.longitude }}
                  onCloseClick={() => setSelectedProspect(null)}
                >
                  <div className="max-w-xs space-y-2 p-1" style={{ fontFamily: 'Inter, sans-serif', minWidth: 240 }}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#E2E8F0', color: '#475569', fontWeight: 600 }}>🔍 PROSPECT</span>
                      {selectedProspect.eh_cliente_wedo && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 600 }}>✅ Já cliente</span>}
                    </div>
                    <h3 className="font-bold text-sm" style={{ color: '#111827' }}>
                      {selectedProspect.nome_fantasia || selectedProspect.razao_social}
                    </h3>
                    {selectedProspect.razao_social && selectedProspect.nome_fantasia && (
                      <p className="text-xs" style={{ color: '#6B7280' }}>{selectedProspect.razao_social}</p>
                    )}
                    <p className="text-xs" style={{ color: '#6B7280' }}>CNPJ: {formatCNPJ(selectedProspect.cnpj)}</p>
                    <hr style={{ borderColor: '#E5E7EB' }} />
                    {selectedProspect.cnae_descricao && <p className="text-xs" style={{ color: '#374151' }}>🏷️ CNAE: {selectedProspect.cnae_descricao}</p>}
                    {selectedProspect.regime_fiscal && <p className="text-xs" style={{ color: '#374151' }}>💼 Regime: {selectedProspect.regime_fiscal}</p>}
                    {selectedProspect.porte && <p className="text-xs" style={{ color: '#374151' }}>📐 Porte: {selectedProspect.porte}</p>}
                    {selectedProspect.capital_social != null && selectedProspect.capital_social > 0 && (
                      <p className="text-xs" style={{ color: '#374151' }}>💰 Capital: {formatBRL(selectedProspect.capital_social)}</p>
                    )}
                    <hr style={{ borderColor: '#E5E7EB' }} />
                    {selectedProspect.endereco_completo && (
                      <p className="text-xs" style={{ color: '#374151' }}>📍 {selectedProspect.endereco_completo} — {selectedProspect.cidade}/{selectedProspect.uf}</p>
                    )}
                    {selectedProspect.telefone_1 && <p className="text-xs" style={{ color: '#374151' }}>📞 {selectedProspect.telefone_1}</p>}
                    {selectedProspect.email && <p className="text-xs" style={{ color: '#374151' }}>📧 {selectedProspect.email}</p>}
                    <hr style={{ borderColor: '#E5E7EB' }} />
                    <div className="flex gap-1 pt-1 flex-wrap">
                      {!selectedProspect.eh_cliente_wedo && (
                        <button
                          onClick={() => handleConverterProspect(selectedProspect)}
                          disabled={convertingCnpj === selectedProspect.cnpj}
                          className="text-xs px-2 py-1 rounded flex items-center gap-1"
                          style={{ backgroundColor: '#0066FF', color: 'white' }}
                        >
                          {convertingCnpj === selectedProspect.cnpj ? <><Loader2 className="h-3 w-3 animate-spin" /> Convertendo...</> : <><UserPlus className="h-3 w-3" /> Converter em Cliente</>}
                        </button>
                      )}
                      {selectedProspect.telefone_1 && (
                        <a href={`tel:${selectedProspect.telefone_1}`} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#E5E7EB', color: '#374151' }}>📞</a>
                      )}
                      {selectedProspect.telefone_1 && (() => {
                        const clean = selectedProspect.telefone_1!.replace(/\D/g, '');
                        const num = clean.startsWith('55') ? clean : `55${clean}`;
                        return <a href={`https://wa.me/${num}`} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded inline-block no-underline" style={{ backgroundColor: '#22C55E', color: 'white' }}>💬</a>;
                      })()}
                    </div>
                  </div>
                </InfoWindowF>
              )}
            </GoogleMap>
          )}

          {/* Histórico panel */}
          <ClienteHistoricoPanel
            open={!!historicoClienteId}
            onOpenChange={(open) => !open && setHistoricoClienteId(null)}
            clienteId={historicoClienteId?.id || ''}
            clienteNome={historicoClienteId?.nome || ''}
            gcId={historicoClienteId?.gcId}
          />

          {/* Legend toggle - bottom left */}
          {!isMobile && (
            <div className="absolute bottom-4 left-4 z-10">
              {!legendOpen ? (
                <button
                  onClick={() => setLegendOpen(true)}
                  className="bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2.5 py-1.5 shadow-md text-[11px] text-muted-foreground hover:bg-card transition-colors flex items-center gap-1.5"
                >
                  <span className="flex gap-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22C55E' }} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EAB308' }} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                  </span>
                  Legenda
                </button>
              ) : (
                <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg text-xs space-y-2 max-w-[200px]">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Legenda</p>
                    <button onClick={() => setLegendOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {showClientes && (
                    <div className="space-y-1">
                      <p className="font-medium text-[10px] text-muted-foreground">Clientes</p>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22C55E' }} /> Ativo</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#EAB308' }} /> Morno</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#EF4444' }} /> Em Risco</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#6B7280' }} /> Inativo</div>
                    </div>
                  )}
                  {showOportunidades && (
                    <div className="space-y-1">
                      <p className="font-medium text-[10px] text-muted-foreground">Oportunidades</p>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#64748B' }} /> Prospecção</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3B82F6' }} /> Qualificação</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#F59E0B' }} /> Proposta</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#8B5CF6' }} /> Negociação</div>
                    </div>
                  )}
                  {showProspeccao && (
                    <div className="space-y-1">
                      <p className="font-medium text-[10px] text-muted-foreground">Prospects</p>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#CBD5E1' }} /> Prospect</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: '#D4A017', backgroundColor: '#CBD5E1' }} /> Já cliente</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
