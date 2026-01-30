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

// Termos gerais aplicáveis a todos os tipos de serviço
const generalTerms: SavedTermCondition[] = [
  {
    id: 'geral-1',
    title: 'Vigência do Contrato',
    description: 'O fornecimento do serviço desta proposta terá início na data acordada, com vigência por 12 (doze) meses, podendo ser prorrogado de comum acordo entre as partes.',
  },
  {
    id: 'geral-2',
    title: 'Cancelamento',
    description: 'Cancelamentos por ambas as partes são isentos de multa, desde que seja avisado com 30 dias de antecedência.',
  },
  {
    id: 'geral-3',
    title: 'Turno de Trabalho',
    description: 'O turno de trabalho será de segunda a sexta-feira, em horário comercial. Condições que diferem destes termos terão que ser alinhadas entre as partes.',
  },
  {
    id: 'geral-4',
    title: 'Horas Extraordinárias / Adicional Noturno',
    description: 'Caso seja necessário a realização de visitas emergenciais, a visita subsequente poderá ser adiantada. Caso não seja possível, deverá haver uma negociação prévia para a execução de tal serviço.',
  },
  {
    id: 'geral-5',
    title: 'Fornecimento WeDo',
    description: 'Acompanhamento de cada equipamento em contrato através de QR code gerenciado pela plataforma WeDo; Peças originais, vendidas a preço competitivo; Profissionais devidamente registrados e treinados; Zelo e guarda dos materiais fornecidos pelo cliente; Software de controle e lançamento em tempo real de serviços; Relatórios detalhados de cada serviço realizado; Software para abertura de chamados.',
  },
  {
    id: 'geral-6',
    title: 'Fornecimento por Parte do Cliente',
    description: 'EPIs completos e em ótimas condições de uso, conforme atividades; Uniformes completos; Refeições de acordo com o turno trabalhado; Água potável e banheiros; Possibilidade de acesso às instalações elétricas e hidráulicas; Acompanhamento técnico quando requisitado; Área destinada à execução dos serviços, com pontos de energia elétrica 220v.',
  },
];

// Termos específicos para Manutenção Preventiva de Cozinha
const preventivaTerms: SavedTermCondition[] = [
  {
    id: 'prev-1',
    title: 'Escopo Técnico - Manutenção Preventiva',
    description: 'Elaboração de manutenção preventiva mensal, com todas as revisões e procedimentos para manter os equipamentos em devidas condições de uso; Limpeza de evaporadores e condensadores; Aferição de temperaturas por equipamentos (quente e frio) bem como pressão em equipamentos de pressão; Verificar e corrigir ruídos e vibrações mecânicas; Reaperto de mancais e suportes; Verificação de tensões e correntes efetivas; Reaperto das conexões elétricas de alimentação e comandos.',
  },
  {
    id: 'prev-2',
    title: 'Escopo Técnico - Verificações Complementares',
    description: 'Verificação do comando e termostato de controle; Verificar a serpentina quanto a danos físicos e restrições do fluxo de ar; Verificar a temperatura do motor de ventilação, testes de atuação e ajustes dos relés térmicos; Verificar pressões de compressores e cargas de gás refrigerante; Limpeza e manutenção preventiva dos fogões e fornos a gás; Verificação e troca de tomadas e interruptores; Correção de torque em conexões e terminais elétricos.',
  },
  {
    id: 'prev-3',
    title: 'Preventiva em Câmaras e Fornos',
    description: 'O valor do contrato contempla manutenções trimestrais em fornos inteligentes e semestrais em câmaras frias. As horas demandadas para a atuação em tais serviços serão contabilizadas normalmente conforme contrato.',
  },
  {
    id: 'prev-4',
    title: 'Conserto em Oficina',
    description: 'Caso haja necessidade de conserto de algum equipamento em oficina (fora do local), o equipamento retornará após o reparo. Caso haja necessidade de entrega do equipamento antes desse prazo, poderá ser cobrada uma taxa de deslocamento de R$2,00 por quilômetro.',
  },
  {
    id: 'prev-5',
    title: 'Reajuste de Preço',
    description: 'O preço poderá ser reajustado anualmente conforme os índices IGPM da FGV e IPCA do IBGE ou por outro índice oficial que venha a substituí-lo, ou conforme alinhamento com o cliente.',
  },
];

// Termos específicos para Limpeza de Coifa
const coifaTerms: SavedTermCondition[] = [
  {
    id: 'coifa-1',
    title: 'Escopo Técnico - Limpeza de Coifa',
    description: 'Limpeza interna e externa da coifa com remoção total de gordura saturada; Higienização de filtros de gordura; Limpeza de dutos de exaustão com acesso interno quando aplicável; Limpeza de exaustores e ventiladores; Verificação de integridade dos dutos e conexões.',
  },
  {
    id: 'coifa-2',
    title: 'Conformidade e Segurança',
    description: 'Serviço executado em conformidade com a NR23 (Proteção Contra Incêndios) e ABNT NBR 14880. Emissão de laudo técnico com registro fotográfico antes e depois do serviço. Certificado de limpeza para fins de fiscalização e seguro.',
  },
  {
    id: 'coifa-3',
    title: 'Frequência Recomendada',
    description: 'A frequência de limpeza deve seguir as recomendações das normas técnicas vigentes, considerando o volume de produção da cozinha. Recomenda-se limpeza mensal ou bimestral para operações de alta demanda, e trimestral ou semestral para operações de média demanda.',
  },
  {
    id: 'coifa-4',
    title: 'Responsabilidade Técnica',
    description: 'O serviço é executado por profissionais capacitados em trabalho em altura (NR35) e espaço confinado (NR33) quando aplicável. A WeDo possui seguro de responsabilidade civil para todos os serviços executados.',
  },
];

// Termos específicos para Câmaras Frias / Climatização
const climatizacaoTerms: SavedTermCondition[] = [
  {
    id: 'clim-1',
    title: 'Escopo Técnico - Câmaras Frias',
    description: 'Limpeza da carenagem e condensador; Verificação de pontos de oxidação; Verificação e aperto de fixação de terminais, cabos e conexões; Verificação de ruídos e vibrações anormais; Verificação de pressões de alta e baixa; Verificação de temperaturas na unidade condensadora; Verificação do filtro secador da linha de líquido.',
  },
  {
    id: 'clim-2',
    title: 'Escopo Técnico - Sistema de Refrigeração',
    description: 'Verificação de separador de óleo e acumulador de sucção; Verificação de condição do óleo do compressor; Verificação e ajuste de pressostatos; Verificação de motor ventilador; Limpeza de serpentina, bandeja, difusores e ventiladores; Verificação do sistema de degelo; Verificação de gaxetas e vedações.',
  },
  {
    id: 'clim-3',
    title: 'Escopo Técnico - Estrutura e Acabamento',
    description: 'Verificação de borracha varredora e cortinas de PVC; Verificação de dobradiças, fechaduras e mancais; Verificação de painéis isotérmicos; Verificação de iluminação interna; Verificação de termômetros e controladores de temperatura.',
  },
  {
    id: 'clim-4',
    title: 'Segurança Alimentar',
    description: 'Os serviços de manutenção em câmaras frias visam garantir a segurança alimentar conforme as Boas Práticas de Fabricação (BPF) e a legislação sanitária vigente. Falhas no sistema de refrigeração podem comprometer a qualidade dos produtos armazenados.',
  },
  {
    id: 'clim-5',
    title: 'Atendimento Emergencial',
    description: 'Em caso de falha crítica do sistema de refrigeração que comprometa os produtos armazenados, a WeDo oferece suporte emergencial com prazo de atendimento conforme contratado, mediante disponibilidade técnica.',
  },
];

// Termos específicos para Ar Condicionado (PMOC)
const arCondicionadoTerms: SavedTermCondition[] = [
  {
    id: 'ac-1',
    title: 'Escopo Técnico - PMOC',
    description: 'Elaboração de manutenção preventiva conforme PMOC (Plano de Manutenção, Operação e Controle) exigido pela Lei Federal nº 13.589/2018 e Portaria nº 3.523/GM. Limpeza de evaporadores e condensadores; Aferição de temperaturas e pressões; Verificação e correção de ruídos e vibrações mecânicas.',
  },
  {
    id: 'ac-2',
    title: 'Escopo Técnico - Sistema Elétrico',
    description: 'Verificação de tensões e correntes efetivas; Reaperto das conexões elétricas de alimentação e comandos; Verificação do comando e termostato de controle; Verificação de tomadas e interruptores; Verificação de dimensionamento de circuitos; Correção de torque em conexões e terminais elétricos.',
  },
  {
    id: 'ac-3',
    title: 'Escopo Técnico - Limpeza Química',
    description: 'Limpeza química das serpentinas com produtos biodegradáveis; Higienização do equipamento; Verificação da serpentina quanto a danos físicos e restrições de fluxo de ar; Verificação de temperatura do motor de ventilação; Verificação de pressões de compressores e cargas de gás refrigerante.',
  },
  {
    id: 'ac-4',
    title: 'Qualidade do Ar Interior',
    description: 'Os serviços de manutenção visam garantir a qualidade do ar interior conforme a Resolução ANVISA nº 9/2003 e normas técnicas ABNT. Ambientes climatizados devem manter níveis adequados de renovação do ar e controle microbiológico.',
  },
  {
    id: 'ac-5',
    title: 'Responsável Técnico PMOC',
    description: 'A WeDo disponibiliza profissional habilitado para assinatura do PMOC, conforme exigência legal. O plano contempla cronograma de manutenções, registro de atividades e relatórios técnicos para fiscalização.',
  },
];

// Termos específicos para Fornecimento de Químicos
const quimicosTerms: SavedTermCondition[] = [
  {
    id: 'quim-1',
    title: 'Especificações dos Produtos',
    description: 'Todos os produtos químicos fornecidos possuem registro na ANVISA quando aplicável, fichas técnicas completas (FT) e fichas de informações de segurança de produtos químicos (FISPQ) disponíveis para consulta.',
  },
  {
    id: 'quim-2',
    title: 'Armazenamento e Manuseio',
    description: 'O cliente é responsável pelo armazenamento adequado dos produtos conforme orientações das fichas técnicas. Os produtos devem ser mantidos em local seco, arejado e protegido da luz solar direta, em temperatura ambiente.',
  },
  {
    id: 'quim-3',
    title: 'Treinamento de Aplicação',
    description: 'A WeDo oferece treinamento inicial para a equipe do cliente sobre a correta aplicação e diluição dos produtos. Treinamentos adicionais podem ser solicitados conforme necessidade.',
  },
  {
    id: 'quim-4',
    title: 'Prazo de Entrega',
    description: 'As entregas serão realizadas conforme cronograma acordado entre as partes. Pedidos extraordinários têm prazo de entrega de até 5 dias úteis após confirmação do pedido.',
  },
];

// Termos específicos para Instalação de Equipamentos
const instalacaoTerms: SavedTermCondition[] = [
  {
    id: 'inst-1',
    title: 'Escopo da Instalação',
    description: 'O serviço contempla montagem e posicionamento do equipamento; Conexões elétricas conforme normas NBR 5410; Conexões hidráulicas e/ou de gás quando aplicável; Configuração inicial e calibração; Testes de funcionamento completos.',
  },
  {
    id: 'inst-2',
    title: 'Requisitos de Infraestrutura',
    description: 'O cliente deve garantir que a infraestrutura elétrica e hidráulica esteja adequada às especificações técnicas do equipamento. Caso sejam necessárias adequações, estas serão orçadas separadamente.',
  },
  {
    id: 'inst-3',
    title: 'Treinamento Operacional',
    description: 'Inclui treinamento operacional básico para a equipe do cliente sobre o uso correto do equipamento instalado. O treinamento cobre funcionamento, limpeza básica e identificação de problemas comuns.',
  },
  {
    id: 'inst-4',
    title: 'Garantia da Instalação',
    description: 'O serviço de instalação possui garantia de 90 dias para vícios de execução. Esta garantia não cobre mau uso, quedas de energia, variações de tensão ou intervenções por terceiros não autorizados.',
  },
  {
    id: 'inst-5',
    title: 'Documentação Técnica',
    description: 'Ao final da instalação, será entregue relatório técnico com fotos, configurações realizadas e orientações de uso. Manuais do fabricante devem ser fornecidos pelo cliente ou fabricante do equipamento.',
  },
];

// Combina todos os termos padrão
const defaultTerms: SavedTermCondition[] = [
  ...generalTerms,
  ...preventivaTerms,
  ...coifaTerms,
  ...climatizacaoTerms,
  ...arCondicionadoTerms,
  ...quimicosTerms,
  ...instalacaoTerms,
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
