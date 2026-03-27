import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { finalizarCheckout, formatDuracao } from '@/lib/api/visitas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  MapPin, Clock, Camera, Star, CheckCircle2, Loader2, ArrowLeft,
  User, Phone, Building2, Navigation, X, Upload
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const resultadoOpcoes = [
  { value: 'positivo', label: '✅ Positivo — Cliente interessado' },
  { value: 'neutro', label: '🔄 Neutro — Acompanhar' },
  { value: 'negativo', label: '❌ Negativo — Sem interesse' },
  { value: 'ausente', label: '🚫 Ausente — Cliente não encontrado' },
  { value: 'demo_realizada', label: '🍳 Demo realizada' },
  { value: 'proposta_entregue', label: '📄 Proposta entregue' },
  { value: 'vistoria_tecnica', label: '🔧 Vistoria técnica concluída' },
];

export default function VisitaAtiva() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario: user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resultado, setResultado] = useState('');
  const [contatoNome, setContatoNome] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [proximaAcao, setProximaAcao] = useState('');
  const [proximaData, setProximaData] = useState('');
  const [satisfacao, setSatisfacao] = useState(0);
  const [fotos, setFotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Fetch visit data
  const { data: visita, isLoading } = useQuery({
    queryKey: ['visita_ativa', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitas')
        .select('*, cliente:clientes_gc(id, nome, telefone, celular, email, endereco, cidade, estado, segmento, cnpj)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // Timer
  useEffect(() => {
    if (!visita?.checkin_at) return;
    const checkinTime = new Date(visita.checkin_at).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - checkinTime) / 60000));
    }, 30000);
    setElapsed(Math.floor((Date.now() - checkinTime) / 60000));
    return () => clearInterval(interval);
  }, [visita?.checkin_at]);

  // Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const fileName = `visitas/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('proposals')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('proposals')
          .getPublicUrl(fileName);

        urls.push(urlData.publicUrl);
      }
      setFotos(prev => [...prev, ...urls]);
      toast.success(`${urls.length} foto(s) adicionada(s)!`);
    } catch (err: any) {
      toast.error('Erro ao enviar foto: ' + (err.message || ''));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  // Finish visit
  const handleFinish = async () => {
    if (!resultado) {
      toast.error('Selecione o resultado da visita');
      return;
    }
    setFinishing(true);
    try {
      // Get current location for checkout
      let lat = visita?.checkin_lat || 0;
      let lng = visita?.checkin_lng || 0;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* use checkin coords */ }

      await finalizarCheckout({
        visita_id: id!,
        lat,
        lng,
        resultado,
        proxima_acao: proximaAcao || undefined,
        proxima_data: proximaData ? new Date(proximaData).toISOString() : undefined,
        satisfacao: satisfacao || undefined,
        fotos,
        observacoes: [contatoNome ? `👤 Contato: ${contatoNome}` : '', observacoes].filter(Boolean).join('\n') || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['visita_em_andamento'] });
      queryClient.invalidateQueries({ queryKey: ['visitas'] });
      toast.success('✅ Visita finalizada com sucesso!');
      navigate('/mapa');
    } catch (err: any) {
      toast.error('Erro ao finalizar: ' + (err.message || ''));
    } finally {
      setFinishing(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!visita) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Visita não encontrada</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/mapa')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Mapa
          </Button>
        </div>
      </MainLayout>
    );
  }

  const cliente = visita.cliente as any;
  const isEmAndamento = visita.status === 'em_andamento';
  const isConcluida = visita.status === 'concluida';

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{isEmAndamento ? '📍 Visita em Andamento' : isConcluida ? '✅ Visita Concluída' : 'Visita'}</h1>
            <p className="text-sm text-muted-foreground">{cliente?.nome || 'Cliente'}</p>
          </div>
          {isEmAndamento && (
            <Badge variant="default" className="bg-green-600 text-white animate-pulse gap-1">
              <Clock className="h-3 w-3" /> {formatDuracao(elapsed)}
            </Badge>
          )}
          {isConcluida && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> {formatDuracao(visita.duracao_minutos)}
            </Badge>
          )}
        </div>

        {/* Client info */}
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{cliente?.nome}</span>
            </div>
            {cliente?.cnpj && (
              <p className="text-xs text-muted-foreground ml-6">CNPJ: {cliente.cnpj}</p>
            )}
            {cliente?.endereco && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{cliente.endereco} — {cliente.cidade}/{cliente.estado}</span>
              </div>
            )}
            {(cliente?.telefone || cliente?.celular) && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${cliente.celular || cliente.telefone}`} className="text-xs text-primary">{cliente.celular || cliente.telefone}</a>
              </div>
            )}
            {visita.checkin_at && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Check-in: {format(new Date(visita.checkin_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form — only editable when em_andamento */}
        {isEmAndamento && (
          <>
            {/* Photos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Camera className="h-4 w-4" /> Fotos da Visita
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Upload className="h-4 w-4" /> Tirar Foto / Escolher</>}
                </Button>
                {fotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {fotos.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt={`Foto ${i + 1}`} className="w-full h-24 object-cover rounded-lg border" />
                        <button
                          onClick={() => removePhoto(i)}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact person */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><User className="h-4 w-4" /> Com quem falou?</Label>
                  <Input
                    placeholder="Nome do contato no cliente..."
                    value={contatoNome}
                    onChange={(e) => setContatoNome(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Result */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Resultado da visita *</Label>
                  <Select value={resultado} onValueChange={setResultado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Como foi a visita?" />
                    </SelectTrigger>
                    <SelectContent>
                      {resultadoOpcoes.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Satisfaction */}
                <div className="space-y-2">
                  <Label>Receptividade do cliente</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setSatisfacao(n)} className="p-1 transition-transform hover:scale-110">
                        <Star className={`h-7 w-7 ${n <= satisfacao ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Observations */}
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Como foi a conversa? O que foi discutido? Pontos importantes..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Next action */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-2">
                  <Label>Próxima ação</Label>
                  <Input
                    placeholder="Ex: Enviar proposta, Agendar demo, Ligar em 3 dias..."
                    value={proximaAcao}
                    onChange={(e) => setProximaAcao(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data da próxima ação</Label>
                  <Input
                    type="datetime-local"
                    value={proximaData}
                    onChange={(e) => setProximaData(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Finish */}
            <Button
              onClick={handleFinish}
              disabled={!resultado || finishing}
              className="w-full h-12 text-base gap-2"
              size="lg"
            >
              {finishing ? <><Loader2 className="h-5 w-5 animate-spin" /> Finalizando...</> : <><CheckCircle2 className="h-5 w-5" /> Finalizar Visita (Check-out)</>}
            </Button>
          </>
        )}

        {/* Read-only view for completed visits */}
        {isConcluida && (
          <>
            {visita.fotos && visita.fotos.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Camera className="h-4 w-4" /> Fotos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {visita.fotos.map((url: string, i: number) => (
                      <img key={i} src={url} alt={`Foto ${i + 1}`} className="w-full h-24 object-cover rounded-lg border cursor-pointer" onClick={() => window.open(url, '_blank')} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-4 space-y-3">
                {visita.resultado && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Resultado</Label>
                    <p className="text-sm">{resultadoOpcoes.find(r => r.value === visita.resultado)?.label || visita.resultado}</p>
                  </div>
                )}
                {visita.satisfacao && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Receptividade</Label>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} className={`h-4 w-4 ${n <= visita.satisfacao ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'}`} />
                      ))}
                    </div>
                  </div>
                )}
                {visita.observacoes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Observações</Label>
                    <p className="text-sm whitespace-pre-wrap">{visita.observacoes}</p>
                  </div>
                )}
                {visita.proxima_acao && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Próxima ação</Label>
                    <p className="text-sm">{visita.proxima_acao}</p>
                    {visita.proxima_data && <p className="text-xs text-muted-foreground">{format(new Date(visita.proxima_data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>}
                  </div>
                )}
                {visita.checkout_at && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Check-out</Label>
                    <p className="text-sm">{format(new Date(visita.checkout_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
