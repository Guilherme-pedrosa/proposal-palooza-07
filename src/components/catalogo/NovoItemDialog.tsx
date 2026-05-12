import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Loader2, ImagePlus, X, Wand2, RefreshCw, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { uploadProductPhoto } from '@/lib/api/produtosGC';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface Grupo { id: string; nome: string; }

export function NovoItemDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<'produto' | 'servico'>('produto');
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [unidade, setUnidade] = useState('UN');
  const [precoCusto, setPrecoCusto] = useState(0);
  const [despesasPct, setDespesasPct] = useState('0');
  const [estoque, setEstoque] = useState('0');
  const [ncm, setNcm] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [gerandoCodigo, setGerandoCodigo] = useState(false);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [carregandoGrupos, setCarregandoGrupos] = useState(false);
  const [grupoOpen, setGrupoOpen] = useState(false);
  const [tabelas, setTabelas] = useState<Array<{ id: string; gc_tipo_id: string; nome: string; markup_padrao: number; principal: boolean }>>([]);

  const custoFinal = precoCusto * (1 + (Number(despesasPct) || 0) / 100);

  const carregarGrupos = async () => {
    setCarregandoGrupos(true);
    try {
      const { data, error } = await supabase.functions.invoke('gc-listar-grupos');
      if (error) throw error;
      if (!data?.sucesso) throw new Error(data?.erro || 'Falha ao carregar grupos');
      setGrupos(data.grupos || []);
    } catch (e: any) {
      console.error(e);
      toast.error('Não foi possível carregar grupos do GC');
    } finally {
      setCarregandoGrupos(false);
    }
  };

  const carregarTabelas = async () => {
    const { data } = await supabase
      .from('tabelas_preco')
      .select('id, gc_tipo_id, nome, markup_padrao, principal')
      .eq('ativa', true)
      .order('principal', { ascending: false })
      .order('nome');
    setTabelas((data ?? []) as any);
  };

  useEffect(() => {
    if (open && tipo === 'produto') {
      if (grupos.length === 0) carregarGrupos();
      if (tabelas.length === 0) carregarTabelas();
    }
  }, [open, tipo]);

  const reset = () => {
    setTipo('produto'); setNome(''); setCodigo(''); setDescricao(''); setCategoria('');
    setUnidade('UN'); setPrecoCusto(0); setDespesasPct('0');
    setEstoque('0'); setNcm(''); setAtivo(true);
    setFotoFile(null); setFotoPreview(null);
  };

  const codigoExiste = async (cod: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('produtos_gc')
      .select('id')
      .eq('tipo', tipo)
      .eq('codigo', cod)
      .limit(1);
    if (error) {
      console.error(error);
      return false;
    }
    return (data ?? []).length > 0;
  };

  const gerarCodigo = async () => {
    setGerandoCodigo(true);
    try {
      const { data, error } = await supabase
        .from('produtos_gc')
        .select('codigo')
        .eq('tipo', tipo)
        .not('codigo', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      let max = 0;
      (data ?? []).forEach((r: any) => {
        const m = String(r.codigo ?? '').match(/(\d+)/g);
        if (m) {
          const n = parseInt(m[m.length - 1], 10);
          if (!isNaN(n) && n > max) max = n;
        }
      });

      const proximo = String(max + 1).padStart(4, '0');
      setCodigo(proximo);
      toast.success(`Código gerado: ${proximo}`);
    } catch (e: any) {
      console.error(e);
      toast.error('Não foi possível gerar o código');
    } finally {
      setGerandoCodigo(false);
    }
  };

  const handleFile = (f: File | null) => {
    setFotoFile(f);
    setFotoPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      toast.error('Informe o nome do item');
      return;
    }
    if (codigo.trim()) {
      const dup = await codigoExiste(codigo.trim());
      if (dup) {
        toast.error(`Código "${codigo.trim()}" já existe para outro ${tipo}. Use "Gerar" ou escolha outro.`);
        return;
      }
    }

    setSalvando(true);
    try {
      let foto_url: string | undefined;
      if (tipo === 'produto' && fotoFile) {
        const tempId = `novo-${Date.now()}`;
        foto_url = await uploadProductPhoto(tempId, fotoFile);
      }

      const { data, error } = await supabase.functions.invoke('gc-criar-produto', {
        body: {
          tipo,
          nome: nome.trim(),
          codigo: codigo.trim() || undefined,
          descricao: descricao.trim() || undefined,
          categoria: categoria.trim() || undefined,
          unidade,
          preco_custo: tipo === 'produto' ? custoFinal : 0,
          estoque: Number(estoque) || 0,
          ncm: ncm.trim() || undefined,
          foto_url,
          ativo,
        },
      });

      if (error) throw error;
      if (!data?.sucesso) throw new Error(data?.erro || 'Falha ao criar no GestãoClick');

      toast.success(`✅ ${tipo === 'servico' ? 'Serviço' : 'Produto'} criado no GestãoClick (ID ${data.gc_id})`);
      qc.invalidateQueries({ queryKey: ['produtos_gc'] });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao criar item');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!salvando) onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as 'produto' | 'servico')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="produto">Produto</SelectItem>
                <SelectItem value="servico">Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Forno Combinado iCombi Pro 6-1/1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Código {tipo === 'produto' ? '(interno)' : ''}</Label>
              <div className="flex gap-1">
                <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="SKU / código" />
                <Button type="button" variant="outline" size="icon" onClick={gerarCodigo} disabled={gerandoCodigo} title="Gerar próximo código">
                  {gerandoCodigo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {tipo === 'produto' && (
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={unidade} onValueChange={setUnidade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UN">UN</SelectItem>
                    <SelectItem value="PC">PC</SelectItem>
                    <SelectItem value="CX">CX</SelectItem>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="LT">LT</SelectItem>
                    <SelectItem value="MT">MT</SelectItem>
                    <SelectItem value="MES">MÊS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {tipo === 'produto' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Categoria / Grupo (do GC)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={carregarGrupos} disabled={carregandoGrupos} className="h-7 px-2">
                  {carregandoGrupos ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                </Button>
              </div>
              <Popover open={grupoOpen} onOpenChange={setGrupoOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    <span className={categoria ? '' : 'text-muted-foreground'}>
                      {categoria || (carregandoGrupos ? 'Carregando grupos...' : 'Selecione um grupo')}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar grupo..." />
                    <CommandList>
                      <CommandEmpty>Nenhum grupo encontrado.</CommandEmpty>
                      <CommandGroup>
                        {grupos.map((g) => (
                          <CommandItem
                            key={g.id}
                            value={g.nome}
                            onSelect={(v) => { setCategoria(v); setGrupoOpen(false); }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${categoria === g.nome ? 'opacity-100' : 'opacity-0'}`} />
                            {g.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Grupos sincronizados diretamente do GestãoClick.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>

          {tipo === 'produto' && (
            <>
              <div className="space-y-2">
                <Label>Preço de custo</Label>
                <CurrencyInput value={precoCusto} onChange={setPrecoCusto} />
                <p className="text-xs text-muted-foreground">
                  O preço de venda é calculado automaticamente pelas tabelas de preço.
                </p>
              </div>

              <div className="space-y-2 rounded-md bg-muted/40 border p-3">
                <Label className="text-xs">Demais despesas (%) — frete, impostos, etc.</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={despesasPct}
                  onChange={(e) => setDespesasPct(e.target.value)}
                  placeholder="Ex: 5"
                />
                <p className="text-xs text-muted-foreground">
                  Custo final: <strong>{custoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                  {Number(despesasPct) > 0 && (
                    <span className="ml-1">({precoCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} + {despesasPct}%)</span>
                  )}
                </p>
              </div>

              {tabelas.length > 0 && (
                <div className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Preços que serão enviados ao GC</Label>
                    <span className="text-[10px] text-muted-foreground">custo × (1 + markup%)</span>
                  </div>
                  <div className="max-h-44 overflow-y-auto divide-y">
                    {tabelas.map((t) => {
                      const venda = custoFinal * (1 + (Number(t.markup_padrao) || 0) / 100);
                      return (
                        <div key={t.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                          <span className="truncate flex-1" title={t.nome}>
                            {t.principal && <span className="text-primary mr-1">★</span>}
                            {t.nome}
                          </span>
                          <span className="text-muted-foreground tabular-nums">{Number(t.markup_padrao).toFixed(0)}%</span>
                          <span className="font-medium tabular-nums w-24 text-right">
                            {venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Markup padrão por tabela é editável em <strong>Catálogo → Tabelas de preço</strong>.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>NCM</Label>
                <Input
                  value={ncm}
                  onChange={(e) => setNcm(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Ex: 84186940"
                  inputMode="numeric"
                />
                <p className="text-xs text-muted-foreground">8 dígitos. Ex.: 8418.69.40 (máq. de gelo), 8422.30.29 (seladora a vácuo).</p>
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-2">
                  <Label>Estoque inicial</Label>
                  <Input type="number" min={0} value={estoque} onChange={(e) => setEstoque(e.target.value)} />
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <Label>Ativo</Label>
                  <Switch checked={ativo} onCheckedChange={setAtivo} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Foto</Label>
                {fotoPreview ? (
                  <div className="relative w-32 h-32 rounded-md overflow-hidden border">
                    <img src={fotoPreview} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleFile(null)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer text-sm border border-dashed rounded-md px-3 py-4 justify-center hover:bg-muted/50">
                    <ImagePlus className="h-4 w-4" />
                    <span>Selecionar imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar e enviar ao GC'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
