import { supabase } from '@/integrations/supabase/client';

export interface Client {
  id: string;
  name: string;
  trade_name: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  contact_person: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
}

export const clientsApi = {
  async getAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getByCNPJ(cnpj: string): Promise<Client | null> {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('cnpj', cleanCNPJ)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, client: Partial<Client>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .update(client)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async lookupCNPJ(cnpj: string): Promise<CNPJData> {
    const { data, error } = await supabase.functions.invoke('cnpj-lookup', {
      body: { cnpj },
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error);
    return data.data;
  },
};
