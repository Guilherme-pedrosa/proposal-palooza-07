import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { CompanySettings, defaultCompanySettings } from '@/types/company';
import { supabase } from '@/integrations/supabase/client';

interface CompanyContextType {
  company: CompanySettings;
  updateCompany: (settings: Partial<CompanySettings>) => void;
  setLogo: (logo: string | null) => void;
  uploadLogo: (file: File) => Promise<string | null>;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<CompanySettings>(defaultCompanySettings);
  const [loading, setLoading] = useState(true);
  const dbIdRef = useRef<string | null>(null);

  // Load from database on mount
  useEffect(() => {
    loadFromDB();
  }, []);

  const loadFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();

      if (data && !error) {
        dbIdRef.current = data.id;
        setCompany({
          name: data.name || defaultCompanySettings.name,
          phone: data.phone || '',
          email: data.email || '',
          cnpj: data.cnpj || '',
          address: data.address || '',
          logo: data.logo_url || null,
          vision: data.vision || '',
          mission: data.mission || '',
          values: data.values || [],
          clients: (data.clients as any[]) || [],
          brands: (data.brands as any[]) || [],
        });
      } else {
        // No record exists — create one
        const { data: newRow } = await supabase
          .from('company_settings')
          .insert({ name: defaultCompanySettings.name })
          .select('id')
          .single();
        if (newRow) dbIdRef.current = newRow.id;

        // Also check localStorage for migration
        const saved = localStorage.getItem('wedo_company_settings');
        if (saved) {
          try {
            const parsed = { ...defaultCompanySettings, ...JSON.parse(saved) };
            setCompany(parsed);
            if (dbIdRef.current) {
              await saveToDB(parsed);
            }
          } catch {
            setCompany(defaultCompanySettings);
          }
        }
      }
    } catch {
      // Silently fall back to defaults
    } finally {
      setLoading(false);
    }
  };

  const saveToDB = async (settings: CompanySettings) => {
    const id = dbIdRef.current;
    if (!id) return;
    const { error } = await supabase
      .from('company_settings')
      .update({
        name: settings.name,
        phone: settings.phone,
        email: settings.email,
        cnpj: settings.cnpj,
        address: settings.address,
        logo_url: settings.logo,
        vision: settings.vision,
        mission: settings.mission,
        values: settings.values,
        clients: settings.clients as any,
        brands: settings.brands as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) console.error('Error saving company settings:', error);
  };

  const updateCompany = useCallback((settings: Partial<CompanySettings>) => {
    setCompany(prev => {
      const updated = { ...prev, ...settings };
      saveToDB(updated);
      return updated;
    });
  }, []);

  const uploadLogo = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('company-logos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const setLogo = useCallback((logo: string | null) => {
    setCompany(prev => {
      const updated = { ...prev, logo };
      saveToDB(updated);
      return updated;
    });
  }, []);

  return (
    <CompanyContext.Provider value={{ company, updateCompany, setLogo, uploadLogo, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
