import { useState, useRef, useEffect } from 'react';
import { useWAI, type WAIContexto, type WAIMessage } from '@/hooks/useWAI';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, X, Sparkles, RefreshCw } from 'lucide-react';

interface WAIChatProps {
  contexto: WAIContexto;
  onClose: () => void;
}

const ACOES_RAPIDAS = [
  { label: '🏃 Preparar visita', modo: 'coach_visita' },
  { label: '📊 Analisar oportunidade', modo: 'analise_oportunidade' },
  { label: '💬 Script WhatsApp', modo: 'gerar_whatsapp' },
  { label: '📧 Rascunhar email', modo: 'gerar_email' },
  { label: '🚧 Rebater objeção', modo: 'coach_objecao' },
  { label: '📋 Norma técnica', modo: 'norma_tecnica' },
  { label: '⏸️ Proposta parada', modo: 'coach_proposta_parada' },
];

export function WAIChat({ contexto, onClose }: WAIChatProps) {
  const { historico, perguntar, acionarModo, carregando, erro, limparHistorico } = useWAI(contexto);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [historico]);

  async function enviar() {
    if (!input.trim() || carregando) return;
    const pergunta = input;
    setInput('');
    await perguntar(pergunta);
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-sidebar px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sidebar-foreground font-semibold text-sm">WAI — Assistente WeDo</p>
          <p className="text-sidebar-foreground/60 text-xs truncate">
            {contexto.cliente?.nome
              ? `Contexto: ${contexto.cliente.nome}`
              : 'Assistente Comercial Especializado'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={limparHistorico}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground p-1 rounded"
            aria-label="Limpar conversa"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="text-sidebar-foreground/60 hover:text-sidebar-foreground p-1 rounded" aria-label="Fechar WAI">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {historico.length === 0 && (
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 text-primary mx-auto mb-3 opacity-60" />
            <p className="text-sm font-medium text-foreground mb-1">WAI pronto para ajudar</p>
            <p className="text-xs text-muted-foreground mb-4">
              Pergunte sobre estratégia de venda, normas técnicas ou use uma ação rápida abaixo.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {ACOES_RAPIDAS.map(acao => (
                <button
                  key={acao.modo}
                  onClick={() => acionarModo(acao.modo)}
                  disabled={carregando}
                  className="text-xs bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground px-3 py-1.5 rounded-full transition-colors border border-border hover:border-primary"
                >
                  {acao.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {historico.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-sidebar text-sidebar-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                }`}
              >
                <div
                  className="whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>'),
                  }}
                />
                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-sidebar-foreground/50' : 'text-muted-foreground'}`}>
                  {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {carregando && (
            <div className="flex justify-start">
              <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center mr-2">
                <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {historico.length > 0 && !carregando && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {ACOES_RAPIDAS.slice(0, 4).map(acao => (
              <button
                key={acao.modo}
                onClick={() => acionarModo(acao.modo)}
                className="text-xs bg-muted hover:bg-accent text-muted-foreground px-2.5 py-1 rounded-full border border-border"
              >
                {acao.label}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Error */}
      {erro && (
        <div className="mx-4 mb-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
          {erro}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t bg-muted/50 flex gap-2">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          placeholder="Pergunte ao WAI... (Enter para enviar)"
          className="resize-none text-sm min-h-[44px] max-h-[100px] bg-card"
          rows={1}
          disabled={carregando}
        />
        <Button
          onClick={enviar}
          disabled={!input.trim() || carregando}
          size="icon"
          className="flex-shrink-0 h-11 w-11"
        >
          {carregando
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
