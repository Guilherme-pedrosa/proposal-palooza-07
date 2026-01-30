import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CompanySettings, defaultCompanySettings } from '@/types/company';

interface CompanyContextType {
  company: CompanySettings;
  updateCompany: (settings: Partial<CompanySettings>) => void;
  setLogo: (logo: string | null) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const STORAGE_KEY = 'wedo_company_settings';

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<CompanySettings>(() => {
    // Tenta carregar do localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...defaultCompanySettings, ...JSON.parse(saved) };
      } catch {
        return defaultCompanySettings;
      }
    }
    return defaultCompanySettings;
  });

  // Salva no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(company));
  }, [company]);

  const updateCompany = (settings: Partial<CompanySettings>) => {
    setCompany(prev => ({ ...prev, ...settings }));
  };

  const setLogo = (logo: string | null) => {
    setCompany(prev => ({ ...prev, logo }));
  };

  return (
    <CompanyContext.Provider value={{ company, updateCompany, setLogo }}>
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
