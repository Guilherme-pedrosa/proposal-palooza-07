import { createContext, useContext, useState, ReactNode } from 'react';
import type { ClienteGC, ProdutoGC } from '@/types/crm';

interface GCState {
  clientesGC: ClienteGC[];
  produtosGC: ProdutoGC[];
  isSyncingClientes: boolean;
  isSyncingProdutos: boolean;
  lastSyncClientes: Date | null;
  lastSyncProdutos: Date | null;
  syncClientes: () => Promise<void>;
  syncProdutos: () => Promise<void>;
}

const GCContext = createContext<GCState | undefined>(undefined);

export function GCProvider({ children }: { children: ReactNode }) {
  const [clientesGC] = useState<ClienteGC[]>([]);
  const [produtosGC] = useState<ProdutoGC[]>([]);
  const [isSyncingClientes] = useState(false);
  const [isSyncingProdutos] = useState(false);
  const [lastSyncClientes] = useState<Date | null>(null);
  const [lastSyncProdutos] = useState<Date | null>(null);

  const syncClientes = async () => {
    // Implementado no Sprint 07
    console.log('Sync clientes será implementado no Sprint 07');
  };

  const syncProdutos = async () => {
    // Implementado no Sprint 07
    console.log('Sync produtos será implementado no Sprint 07');
  };

  return (
    <GCContext.Provider value={{
      clientesGC,
      produtosGC,
      isSyncingClientes,
      isSyncingProdutos,
      lastSyncClientes,
      lastSyncProdutos,
      syncClientes,
      syncProdutos,
    }}>
      {children}
    </GCContext.Provider>
  );
}

export function useGC() {
  const ctx = useContext(GCContext);
  if (!ctx) throw new Error('useGC deve ser usado dentro de GCProvider');
  return ctx;
}
