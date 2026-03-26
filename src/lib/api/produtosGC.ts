import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'wedo_produtos_cache';

export interface ProdutoGCRow {
  id: string;
  gc_id: string;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  tipo: string | null;
  preco_venda: number | null;
  preco_locacao_mensal: number | null;
  unidade: string | null;
  estoque_atual: number | null;
  estoque_minimo: number | null;
  foto_url: string | null;
  fotos_urls: string[] | null;
  ficha_tecnica_url: string | null;
  destaque: boolean | null;
  ativo: boolean | null;
  gc_synced_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type CategoriaChip = 'todos' | 'forno_combinado' | 'refrigeracao' | 'servico' | 'quimicos';
export type FiltroDisponibilidade = 'todos' | 'disponivel' | 'baixo' | 'sem_estoque';

export const categoriaChips: { value: CategoriaChip; label: string; emoji: string }[] = [
  { value: 'todos', label: 'Todos', emoji: '🔥' },
  { value: 'forno_combinado', label: 'Fornos e Cocção', emoji: '🍳' },
  { value: 'refrigeracao', label: 'Refrigeração', emoji: '❄️' },
  { value: 'quimicos', label: 'Químicos', emoji: '🧪' },
  { value: 'servico', label: 'Serviços', emoji: '🔧' },
];

export function badgeEstoque(estoque: number | null, tipo: string | null) {
  if (tipo === 'servico') return { label: '♾️ Serviço', variant: 'blue' as const };
  const est = estoque ?? 0;
  if (est === 0) return { label: '❌ Sem estoque', variant: 'red' as const };
  if (est <= 2) return { label: `⚠️ Baixo (${est})`, variant: 'yellow' as const };
  return { label: `✅ ${est} un.`, variant: 'green' as const };
}

export function formatBRL(value: number | null | undefined): string {
  if (value == null) return '';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export async function fetchProdutosGC(): Promise<ProdutoGCRow[]> {
  const { data, error } = await supabase
    .from('produtos_gc')
    .select('*')
    .eq('ativo', true)
    .order('destaque', { ascending: false })
    .order('nome');

  if (error) {
    console.error('Erro ao buscar produtos, tentando cache:', error);
    return loadFromCache();
  }

  const produtos = data as unknown as ProdutoGCRow[];

  // Cache for offline use
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: produtos,
      cachedAt: new Date().toISOString(),
    }));
  } catch { /* quota exceeded */ }

  return produtos;
}

function loadFromCache(): ProdutoGCRow[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed.data ?? [];
    }
  } catch { /* corrupted */ }
  return [];
}

export function getCacheTimestamp(): string | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached).cachedAt ?? null;
  } catch { /* */ }
  return null;
}

export async function fetchProdutoById(id: string): Promise<ProdutoGCRow | null> {
  const { data, error } = await supabase
    .from('produtos_gc')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as unknown as ProdutoGCRow;
}

export async function uploadProductPhoto(
  gcId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${gcId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('product-photos')
    .upload(path, file, { upsert: false });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('product-photos')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

export async function updateProductPhotos(
  productId: string,
  fotoUrl: string,
  fotosUrls: string[]
) {
  const { error } = await supabase
    .from('produtos_gc')
    .update({ foto_url: fotoUrl, fotos_urls: fotosUrls })
    .eq('id', productId);

  if (error) throw error;
}

export async function deleteProductPhoto(bucket: string, path: string) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
}
