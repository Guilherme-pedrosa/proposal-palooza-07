import { supabase } from '@/integrations/supabase/client';

export interface Proposal {
  id: string;
  number: string;
  client_id: string | null;
  title: string;
  description: string | null;
  template_id: string | null;
  total_value: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled';
  valid_until: string | null;
  products: any[];
  terms_conditions: any[];
  images: any[];
  created_at: string;
  updated_at: string;
}

export interface ProposalWithClient extends Proposal {
  clients?: {
    id: string;
    name: string;
    cnpj: string | null;
  } | null;
}

export const proposalsApi = {
  async getAll(): Promise<ProposalWithClient[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        clients (
          id,
          name,
          cnpj
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as ProposalWithClient[];
  },

  async getById(id: string): Promise<ProposalWithClient | null> {
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        clients (
          id,
          name,
          cnpj
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as ProposalWithClient;
  },

  async getByClientId(clientId: string): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as Proposal[];
  },

  async create(proposal: Omit<Proposal, 'id' | 'created_at' | 'updated_at'>): Promise<Proposal> {
    const { data, error } = await supabase
      .from('proposals')
      .insert(proposal as any)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Proposal;
  },

  async update(id: string, proposal: Partial<Proposal>): Promise<Proposal> {
    const { data, error } = await supabase
      .from('proposals')
      .update(proposal as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Proposal;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getNextNumber(): Promise<string> {
    const { data, error } = await supabase
      .from('proposals')
      .select('number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return 'P0001';
    }

    const lastNumber = data[0].number;
    const match = lastNumber.match(/P(\d+)/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `P${String(nextNum).padStart(4, '0')}`;
    }

    return 'P0001';
  },
};
