import type { QueryClient } from '@tanstack/react-query';

const CATALOG_QUERY_KEYS = [
  ['produtos_gc'],
  ['produtos_gc_catalogo'],
  ['count_produtos_gc'],
  ['produto_gc'],
  ['all_precos'],
  ['produtos_gc_id_map'],
  ['tabelas_preco'],
  ['precos_tabela_modal'],
  ['precos_produto_detail'],
] as const;

export async function invalidateCatalogQueries(queryClient: QueryClient) {
  await Promise.all(
    CATALOG_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey: [...queryKey] }))
  );
}