import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Proposal, SavedTermCondition, Client, Product, TermCondition, ProposalImage } from '@/types/proposal';

interface ProposalContextType {
  proposals: Proposal[];
  savedTerms: SavedTermCondition[];
  currentProposal: Partial<Proposal> | null;
  setCurrentProposal: (proposal: Partial<Proposal> | null) => void;
  addProposal: (proposal: Proposal) => void;
  updateProposal: (id: string, proposal: Partial<Proposal>) => void;
  deleteProposal: (id: string) => void;
  addSavedTerm: (term: SavedTermCondition) => void;
  updateSavedTerm: (id: string, term: Partial<SavedTermCondition>) => void;
  deleteSavedTerm: (id: string) => void;
  generateProposalNumber: () => string;
}

const ProposalContext = createContext<ProposalContextType | undefined>(undefined);

const defaultTerms: SavedTermCondition[] = [
  {
    id: '1',
    title: 'Prazo de Validade',
    description: 'Esta proposta é válida por 10 dias a partir da data de emissão.',
  },
  {
    id: '2',
    title: 'Condições de Pagamento',
    description: 'Pagamento em até 30 dias após a aprovação da proposta, via boleto bancário ou transferência.',
  },
  {
    id: '3',
    title: 'Prazo de Entrega',
    description: 'O prazo de entrega será de 15 dias úteis após a confirmação do pagamento.',
  },
  {
    id: '4',
    title: 'Garantia',
    description: 'Garantia de 12 meses para defeitos de fabricação, a partir da data de entrega.',
  },
  {
    id: '5',
    title: 'Cancelamento',
    description: 'Cancelamentos por ambas as partes são isentos de multa, desde que seja avisado com 30 dias de antecedência.',
  },
];

export function ProposalProvider({ children }: { children: ReactNode }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [savedTerms, setSavedTerms] = useState<SavedTermCondition[]>(defaultTerms);
  const [currentProposal, setCurrentProposal] = useState<Partial<Proposal> | null>(null);
  const [proposalCounter, setProposalCounter] = useState(1);

  const generateProposalNumber = () => {
    const number = `P${String(proposalCounter).padStart(4, '0')}`;
    setProposalCounter(prev => prev + 1);
    return number;
  };

  const addProposal = (proposal: Proposal) => {
    setProposals(prev => [...prev, proposal]);
  };

  const updateProposal = (id: string, updates: Partial<Proposal>) => {
    setProposals(prev => 
      prev.map(p => p.id === id ? { ...p, ...updates } : p)
    );
  };

  const deleteProposal = (id: string) => {
    setProposals(prev => prev.filter(p => p.id !== id));
  };

  const addSavedTerm = (term: SavedTermCondition) => {
    setSavedTerms(prev => [...prev, term]);
  };

  const updateSavedTerm = (id: string, updates: Partial<SavedTermCondition>) => {
    setSavedTerms(prev =>
      prev.map(t => t.id === id ? { ...t, ...updates } : t)
    );
  };

  const deleteSavedTerm = (id: string) => {
    setSavedTerms(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ProposalContext.Provider
      value={{
        proposals,
        savedTerms,
        currentProposal,
        setCurrentProposal,
        addProposal,
        updateProposal,
        deleteProposal,
        addSavedTerm,
        updateSavedTerm,
        deleteSavedTerm,
        generateProposalNumber,
      }}
    >
      {children}
    </ProposalContext.Provider>
  );
}

export function useProposal() {
  const context = useContext(ProposalContext);
  if (context === undefined) {
    throw new Error('useProposal must be used within a ProposalProvider');
  }
  return context;
}
