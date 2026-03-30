import { supabase } from '@/integrations/supabase/client';
import type { ClienteGC } from '@/types/crm';

export const clientesGCApi = {
  async getAll(): Promise<ClienteGC[]> {
    const { data, error } = await supabase
      .from('clientes_gc')
      .select('*')
      .order('nome');

    if (error) throw error;
    return (data || []) as unknown as ClienteGC[];
  },

  async getById(id: string): Promise<ClienteGC | null> {
    const { data, error } = await supabase
      .from('clientes_gc')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as ClienteGC;
  },

  async create(cliente: Omit<ClienteGC, 'id' | 'created_at' | 'updated_at'>): Promise<ClienteGC> {
    const { data, error } = await supabase
      .from('clientes_gc')
      .insert(cliente as any)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ClienteGC;
  },

  async update(id: string, cliente: Partial<ClienteGC>): Promise<ClienteGC> {
    const { data, error } = await supabase
      .from('clientes_gc')
      .update(cliente as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ClienteGC;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('clientes_gc')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async lookupCEP(cep: string) {
    const clean = cep.replace(/\D/g, '');
    const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await response.json();
    if (data.erro) throw new Error('CEP não encontrado');
    return data;
  },

  async lookupCNPJ(cnpj: string) {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) throw new Error('CNPJ deve ter 14 dígitos');
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
    if (!response.ok) {
      if (response.status === 404) throw new Error('CNPJ não encontrado');
      throw new Error('Erro ao consultar CNPJ');
    }
    return await response.json();
  },
};

// Health calculation
export function calcularSaude(ultimaCompra: string | null): 'ativo' | 'morno' | 'risco' | 'inativo' {
  if (!ultimaCompra) return 'inativo';
  const dias = Math.floor((Date.now() - new Date(ultimaCompra).getTime()) / (1000 * 60 * 60 * 24));
  if (dias <= 30) return 'ativo';
  if (dias <= 60) return 'morno';
  if (dias <= 90) return 'risco';
  return 'inativo';
}

export const saudeConfig = {
  ativo: { label: 'Ativo', color: 'bg-green-100 text-green-700', dot: '🟢', motivo: 'Comprou nos últimos 30 dias' },
  morno: { label: 'Morno', color: 'bg-yellow-100 text-yellow-700', dot: '🟡', motivo: 'Sem compras há 31-60 dias' },
  risco: { label: 'Em Risco', color: 'bg-red-100 text-red-700', dot: '🔴', motivo: 'Sem compras há 61-90 dias' },
  inativo: { label: 'Inativo', color: 'bg-gray-100 text-gray-600', dot: '⚫', motivo: 'Sem compras há mais de 90 dias ou nunca comprou' },
};

export const segmentoConfig: Record<string, { label: string; icon: string }> = {
  restaurante: { label: 'Restaurante', icon: '🍽️' },
  hotel: { label: 'Hotel', icon: '🏨' },
  hospital: { label: 'Hospital', icon: '🏥' },
  ghost_kitchen: { label: 'Ghost Kitchen', icon: '🚀' },
  fast_food: { label: 'Fast Food', icon: '🍔' },
  catering: { label: 'Catering', icon: '🏭' },
  outro: { label: 'Outro', icon: '🏢' },
};

// Deterministic avatar color from name
const avatarColors = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
  'bg-orange-500', 'bg-pink-500', 'bg-teal-500', 'bg-indigo-500',
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}
