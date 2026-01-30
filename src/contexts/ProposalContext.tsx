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
    title: 'Preventiva em Câmaras e Fornos',
    description: 'O valor do contrato contempla manutenções trimestrais em fornos inteligentes e semestrais em câmaras frias. As horas demandadas para a atuação em tais serviços serão contabilizadas normalmente conforme contrato.',
  },
  {
    id: '2',
    title: 'Vigência do Contrato',
    description: 'O fornecimento do serviço desta proposta terá início na data acordada, com vigência por 12 (doze) meses, podendo ser prorrogado de comum acordo entre as partes.',
  },
  {
    id: '3',
    title: 'Cancelamento',
    description: 'Cancelamentos por ambas as partes são isentos de multa, desde que seja avisado com 30 dias de antecedência.',
  },
  {
    id: '4',
    title: 'Turno de Trabalho',
    description: 'O turno de trabalho será de segunda a sexta-feira, em horário comercial. Condições que diferem destes termos terão que ser alinhadas entre as partes.',
  },
  {
    id: '5',
    title: 'Horas Extraordinárias / Adicional Noturno',
    description: 'Caso seja necessário a realização de visitas emergenciais, a visita subsequente poderá ser adiantada. Caso não seja possível, deverá haver uma negociação prévia para a execução de tal serviço.',
  },
  {
    id: '6',
    title: 'Escopo Técnico',
    description: 'Elaboração de manutenção preventiva mensal, com todas as revisões e procedimentos para manter os equipamentos em devidas condições de uso; Limpeza de evaporadores e condensadores; Aferição de temperaturas por equipamentos (quente e frio) bem como pressão em equipamentos de pressão; Verificar e corrigir ruídos e vibrações mecânicas; Reaperto de mancais e suportes; Verificação de tensões e correntes efetivas; Reaperto das conexões elétricas de alimentação e comandos.',
  },
  {
    id: '7',
    title: 'Escopo Técnico (Continuação)',
    description: 'Verificação do comando e termostato de controle; Verificar a serpentina quanto a danos físicos e restrições do fluxo de ar; Verificar a temperatura do motor de ventilação, testes de atuação e ajustes dos relés térmicos; Verificar pressões de compressores e cargas de gás refrigerante; Limpeza e manutenção preventiva dos fogões e fornos a gás; Verificação e troca de tomadas e interruptores; Correção de torque em conexões e terminais elétricos.',
  },
  {
    id: '8',
    title: 'Diferenciais WeDo',
    description: 'Gestor de Operações (Sócio da empresa): Responsável pelo atendimento direto ao cliente, oferecendo soluções Just in time; Supervisor de Manutenção: Supervisiona atividades do dia a dia, controla custos e qualidade; Engenheiro de Produção e Qualidade: Acompanhamento dos métodos e atividades, implantação de melhorias; Assistente Administrativo: Responsável por documentação, segurança e legislação.',
  },
  {
    id: '9',
    title: 'Fornecimento WeDo',
    description: 'Acompanhamento de cada equipamento em contrato através de QR code gerenciado pela plataforma WeDo; Peças originais, vendidas a preço competitivo; Profissionais devidamente registrados e treinados; Zelo e guarda dos materiais fornecidos pelo cliente; Software de controle e lançamento em tempo real de serviços; Relatórios detalhados de cada serviço realizado; Software para abertura de chamados.',
  },
  {
    id: '10',
    title: 'Fornecimento por Parte do Cliente',
    description: 'EPIs completos e em ótimas condições de uso, conforme atividades; Uniformes completos; Refeições de acordo com o turno trabalhado; Água potável e banheiros; Possibilidade de acesso às instalações elétricas e hidráulicas; Acompanhamento técnico quando requisitado; Área destinada à execução dos serviços, com pontos de energia elétrica 220v.',
  },
  {
    id: '11',
    title: 'Conserto em Oficina',
    description: 'Caso haja necessidade de conserto de algum equipamento em oficina (fora do local), o equipamento retornará após o reparo. Caso haja necessidade de entrega do equipamento antes desse prazo, poderá ser cobrada uma taxa de deslocamento de R$2,00 por quilômetro.',
  },
  {
    id: '12',
    title: 'Reajuste de Preço',
    description: 'O preço poderá ser reajustado anualmente conforme os índices IGPM da FGV e IPCA do IBGE ou por outro índice oficial que venha a substituí-lo, ou conforme alinhamento com o cliente.',
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
