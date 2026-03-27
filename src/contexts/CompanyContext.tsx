import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
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
  const [dbId, setDbId] = useState<string | null>(null);

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
        setDbId(data.id);
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
        // Fallback: try localStorage for migration
        const saved = localStorage.getItem('wedo_company_settings');
        if (saved) {
          try {
            const parsed = { ...defaultCompanySettings, ...JSON.parse(saved) };
            setCompany(parsed);
            // Migrate to DB (without base64 logo - that needs re-upload)
            await migrateToDb(parsed);
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

  const migrateToDb = async (settings: CompanySettings) => {
    try {
      const { data } = await supabase
        .from('company_settings')
        .insert({
          name: settings.name,
          phone: settings.phone,
          email: settings.email,
          cnpj: settings.cnpj,
          address: settings.address,
          vision: settings.vision,
          mission: settings.mission,
          values: settings.values,
          clients: settings.clients as any,
          brands: settings.brands as any,
          // Don't migrate base64 logo - needs re-upload as file
        })
        .select('id')
        .single();
      if (data) setDbId(data.id);
    } catch {
      // ignore
    }
  };

  const saveToDB = useCallback(async (settings: CompanySettings) => {
    if (!dbId) return;
    await supabase
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
      .eq('id', dbId);
  }, [dbId]);

  const updateCompany = useCallback((settings: Partial<CompanySettings>) => {
    setCompany(prev => {
      const updated = { ...prev, ...settings };
      saveToDB(updated);
      return updated;
    });
  }, [saveToDB]);

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
  }, [saveToDB]);

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
