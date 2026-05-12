import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar as CalendarIcon, Flag, Tag, X, UserPlus, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { tipoAtividadeIcons } from '@/lib/api/atividades';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type Priority = 1 | 2 | 3 | 4;

const PRIORITY_LABEL: Record<Priority, string> = {
  1: 'Prioridade 1',
  2: 'Prioridade 2',
  3: 'Prioridade 3',
  4: 'Prioridade 4',
};
const PRIORITY_COLOR: Record<Priority, string> = {
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-blue-500',
  4: 'text-muted-foreground/60',
};
const PRIORITY_TO_API: Record<Priority, 'p1' | 'p2' | 'p3' | 'p4'> = {
  1: 'p1', 2: 'p2', 3: 'p3', 4: 'p4',
};

const TIPOS: { value: string; label: string }[] = [
  { value: 'tarefa', label: 'Tarefa' },
  { value: 'ligacao', label: 'Ligação' },
  { value: 'visita_tecnica', label: 'Visita Técnica' },
  { value: 'demo_produto', label: 'Demo Produto' },
  { value: 'envio_proposta', label: 'Envio Proposta' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'email', label: 'E-mail' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'reuniao_online', label: 'Reunião Online' },
];

interface ParsedNlp {
  cleaned: string;
  date?: string; // yyyy-MM-dd
  time?: string; // HH:mm
}

function parseNlp(raw: string): ParsedNlp {
  let s = raw;
  let date: string | undefined;
  let time: string | undefined;

  const today = new Date();
  const fmtDate = (d: Date) => format(d, 'yyyy-MM-dd');

  // hoje / amanhã / depois de amanhã
  const reHoje = /\b(hoje)\b/i;
  const reAmanha = /\b(amanh[ãa])\b/i;
  const reDepois = /\b(depois\s+de\s+amanh[ãa])\b/i;

  if (reDepois.test(s)) {
    const d = new Date(today); d.setDate(d.getDate() + 2); date = fmtDate(d);
    s = s.replace(reDepois, '').trim();
  } else if (reAmanha.test(s)) {
    const d = new Date(today); d.setDate(d.getDate() + 1); date = fmtDate(d);
    s = s.replace(reAmanha, '').trim();
  } else if (reHoje.test(s)) {
    date = fmtDate(today);
    s = s.replace(reHoje, '').trim();
  }

  // dia 12, 12/05, 12-05
  const reDia = /\b(dia\s+)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/i;
  const mDia = s.match(reDia);
  if (mDia && !date) {
    const d = parseInt(mDia[2], 10);
    const m = parseInt(mDia[3], 10) - 1;
    const y = mDia[4] ? (mDia[4].length === 2 ? 2000 + parseInt(mDia[4], 10) : parseInt(mDia[4], 10)) : today.getFullYear();
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) {
      date = fmtDate(dt);
      s = s.replace(reDia, '').trim();
    }
  }

  // 17:30, 17h30, 17h, às 14h, as 14
  const reHora = /\b(?:[àa]s?\s+)?(\d{1,2})(?:[:h](\d{2}))?\s*(h)?\b/i;
  // Avoid matching pure short numbers; require ':' or 'h' or "as " prefix
  const reHoraStrict = /\b(?:[àa]s?\s+)?(\d{1,2})(?:[:h](\d{2})|h)\b/i;
  const mHora = s.match(reHoraStrict);
  if (mHora) {
    const h = parseInt(mHora[1], 10);
    const min = mHora[2] ? parseInt(mHora[2], 10) : 0;
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      time = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      s = s.replace(reHoraStrict, '').trim();
    }
  }

  // p1..p4
  const rePrio = /\b(p[1-4])\b/i;
  s = s.replace(rePrio, '').trim();

  // Cleanup whitespace + leading "às"
  s = s.replace(/\s{2,}/g, ' ').replace(/^[,\s]+|[,\s]+$/g, '');

  return { cleaned: s, date, time };
}

function formatDateChip(date?: string, time?: string) {
  if (!date) return 'Data';
  const d = new Date(`${date}T00:00:00`);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
  let label: string;
  if (date === todayStr) label = 'Hoje';
  else if (date === tomorrowStr) label = 'Amanhã';
  else label = format(d, "d 'de' MMM", { locale: ptBR });
  return time ? `${label} · ${time}` : label;
}

export interface QuickAddTarefaResult {
  titulo: string;
  descricao: string | null;
  tipo: string;
  data_prevista: string | null; // ISO local "yyyy-MM-ddTHH:mm" or null
  prioridade: 'p1' | 'p2' | 'p3' | 'p4';
  vendedor_id: string;
  vendedor_nome: string | null;
}

export interface QuickAddInitial {
  id: string;
  titulo: string;
  descricao?: string | null;
  tipo?: string | null;
  data_prevista?: string | null;
  vendedor_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (r: QuickAddTarefaResult) => Promise<void> | void;
  currentUserId: string;
  initial?: QuickAddInitial | null;
}

interface TeamMember { id: string; nome: string; email: string; perfil: string }

export function QuickAddTarefa({ open, onOpenChange, onSubmit, currentUserId, initial }: Props) {
  const isEdit = !!initial?.id;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<string | undefined>();
  const [time, setTime] = useState<string | undefined>();
  const [priority, setPriority] = useState<Priority>(4);
  const [tipo, setTipo] = useState<string>('tarefa');
  const [assigneeId, setAssigneeId] = useState<string>(currentUserId);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nlpFlags = useRef<{ date?: boolean; time?: boolean; prio?: boolean }>({});

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ['team_members'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_team_members');
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const assignee = teamMembers.find((u) => u.id === assigneeId);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.titulo || '');
      setDescription(initial.descricao || '');
      setTipo(initial.tipo || 'tarefa');
      setAssigneeId(initial.vendedor_id || currentUserId);
      if (initial.data_prevista) {
        const d = new Date(initial.data_prevista);
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => String(n).padStart(2, '0');
          setDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
        }
      } else {
        setDate(undefined); setTime(undefined);
      }
      setPriority(4);
    } else {
      setTitle(''); setDescription('');
      setDate(undefined); setTime(undefined);
      setPriority(4); setTipo('tarefa');
      setAssigneeId(currentUserId);
    }
    nlpFlags.current = {};
    setTimeout(() => inputRef.current?.focus(), 60);
  }, [open, currentUserId, initial]);

  const parsed = useMemo(() => (!isEdit && title ? parseNlp(title) : null), [title, isEdit]);

  // Apply NLP whenever title changes (skip in edit mode)
  useEffect(() => {
    if (isEdit) return;
    if (!parsed) return;
    if (parsed.date) {
      setDate(parsed.date);
      nlpFlags.current.date = true;
    } else if (nlpFlags.current.date) {
      setDate(undefined);
      nlpFlags.current.date = false;
    }
    if (parsed.time) {
      setTime(parsed.time);
      nlpFlags.current.time = true;
    } else if (nlpFlags.current.time) {
      setTime(undefined);
      nlpFlags.current.time = false;
    }
    const prio = title.match(/\bp([1-4])\b/i);
    if (prio) {
      setPriority(parseInt(prio[1], 10) as Priority);
      nlpFlags.current.prio = true;
    } else if (nlpFlags.current.prio) {
      setPriority(4);
      nlpFlags.current.prio = false;
    }
  }, [title, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const finalTitle = (parsed?.cleaned || title).trim();
  const canSubmit = !!finalTitle && !submitting;

  const submit = async (closeAfter: boolean) => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const data_prevista = date ? `${date}T${time || '09:00'}` : null;
      await onSubmit({
        titulo: finalTitle,
        descricao: description.trim() || null,
        tipo,
        data_prevista,
        prioridade: PRIORITY_TO_API[priority],
        vendedor_id: assigneeId,
        vendedor_nome: assignee?.nome ?? null,
      });
      if (isEdit) {
        onOpenChange(false);
      } else {
        // Reset for next entry (Todoist behavior)
        setTitle(''); setDescription('');
        setDate(undefined); setTime(undefined);
        setPriority(4);
        setAssigneeId(currentUserId);
        nlpFlags.current = {};
        setTimeout(() => inputRef.current?.focus(), 30);
        if (closeAfter) onOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const dateFilled = !!date;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
        <DialogDescription className="sr-only">
          Crie uma tarefa rapidamente. Use linguagem natural como "amanhã 14h" ou "12/05 17:30".
        </DialogDescription>

        <div className="px-4 pt-4 pb-2">
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='Nome da tarefa (ex: "Ligar para cliente amanhã 14h p2")'
            className="border-0 px-0 text-base font-semibold focus-visible:ring-0 h-9 placeholder:text-muted-foreground/60 shadow-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit(!(e.ctrlKey || e.metaKey));
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                onOpenChange(false);
              }
            }}
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição"
            className="border-0 px-0 text-sm text-muted-foreground focus-visible:ring-0 h-7 shadow-none"
          />
        </div>

        {parsed && (parsed.date || parsed.time) && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {parsed.date && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-medium">
                <CalendarIcon className="h-3 w-3" />
                {parsed.date}{parsed.time ? ` · ${parsed.time}` : ''}
              </span>
            )}
          </div>
        )}

        {/* Toolbar (chips) */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5 border-b border-border">
          {/* Date chip */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors',
                  dateFilled
                    ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5'
                    : 'border-border text-muted-foreground hover:border-emerald-500/40'
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {formatDateChip(date, time)}
                {dateFilled && (
                  <X
                    className="h-3 w-3 ml-0.5 opacity-60 hover:opacity-100"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDate(undefined); setTime(undefined); }}
                  />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <Calendar
                mode="single"
                selected={date ? new Date(`${date}T00:00:00`) : undefined}
                onSelect={(d) => d && setDate(format(d, 'yyyy-MM-dd'))}
                locale={ptBR}
                initialFocus
              />
              <div className="flex items-center gap-2 px-1 pt-2 border-t mt-1">
                <span className="text-xs text-muted-foreground">Hora</span>
                <Input
                  type="time"
                  value={time || ''}
                  onChange={(e) => setTime(e.target.value || undefined)}
                  className="h-7 text-xs w-28"
                />
                {time && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setTime(undefined)}>
                    Limpar
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Priority chip */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors',
                  priority < 4
                    ? 'border-current bg-current/5'
                    : 'border-border text-muted-foreground hover:border-foreground/30',
                  priority < 4 && PRIORITY_COLOR[priority]
                )}
              >
                <Flag className={cn('h-3.5 w-3.5', PRIORITY_COLOR[priority])} />
                {PRIORITY_LABEL[priority]}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="start">
              {([1, 2, 3, 4] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'w-full flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-accent text-left',
                    priority === p && 'bg-accent'
                  )}
                >
                  <Flag className={cn('h-4 w-4', PRIORITY_COLOR[p])} />
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Tipo chip */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:border-foreground/30"
              >
                <Tag className="h-3.5 w-3.5" />
                {tipoAtividadeIcons[tipo]} {TIPOS.find((t) => t.value === tipo)?.label || 'Tipo'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-1" align="start">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={cn(
                    'w-full flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-accent text-left',
                    tipo === t.value && 'bg-accent'
                  )}
                >
                  <span>{tipoAtividadeIcons[t.value]}</span>
                  {t.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Assignee chip — delegar para outro membro do time */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors',
                  assigneeId !== currentUserId
                    ? 'border-primary/40 text-primary bg-primary/5'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                )}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {assignee ? assignee.nome.split(' ')[0] : 'Atribuir a'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-1" align="start">
              {teamMembers.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  Nenhum membro disponível
                </div>
              )}
              {teamMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAssigneeId(m.id)}
                  className={cn(
                    'w-full flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-accent text-left',
                    assigneeId === m.id && 'bg-accent'
                  )}
                >
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center">
                    {m.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{m.nome}{m.id === currentUserId && ' (você)'}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">{m.perfil}</div>
                  </div>
                  {assigneeId === m.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 flex items-center justify-end gap-2 bg-muted/30">
          <span className="mr-auto text-[11px] text-muted-foreground hidden sm:block">
            Enter para adicionar · Ctrl+Enter para adicionar e continuar
          </span>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={() => submit(true)} disabled={!canSubmit}>
            {isEdit ? 'Salvar alterações' : 'Adicionar tarefa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
