export interface ProposalTemplateSection {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface ProposalTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sections: ProposalTemplateSection[];
  defaultTitle: string;
  defaultDescription: string;
}

export const proposalTemplates: ProposalTemplate[] = [
  {
    id: 'preventiva',
    name: 'Manutenção Preventiva',
    description: 'Proposta completa com objetivos, detalhamento por equipamento e case de sucesso',
    icon: '🔧',
    color: '#22c55e',
    sections: [
      { id: 'objectives', name: 'Objetivos da Manutenção', description: 'Evitar paradas, reduzir custos, conformidade', enabled: true },
      { id: 'equipment', name: 'Detalhamento por Equipamento', description: 'Checklists técnicos específicos', enabled: true },
      { id: 'results', name: 'Resultados Comprovados', description: 'Estatísticas e case de sucesso', enabled: true },
    ],
    defaultTitle: 'Proposta de Manutenção Preventiva',
    defaultDescription: `Proposta de serviços de manutenção preventiva para equipamentos de cozinha profissional.

Nossa abordagem garante que todos os seus equipamentos operem no máximo desempenho, com segurança e durabilidade. Desenvolvemos protocolos específicos para cada categoria de equipamento, garantindo que nenhum detalhe seja negligenciado.

O programa inclui:
• Checklists técnicos completos e padronizados
• Inspeção minuciosa de todos os componentes
• Ajustes preventivos e calibrações precisas
• Relatórios detalhados após cada serviço
• Histórico digital acessível de todas as manutenções
• Equipe certificada em NR10, NR12 e ABNT

Incluso gestão via plataforma própria, atendimento emergencial com SLA, fornecimento de EPIs e software de controle.`,
  },
  {
    id: 'coifa',
    name: 'Limpeza de Coifa',
    description: 'Serviços de limpeza, higienização e prevenção de incêndio',
    icon: '🌬️',
    color: '#3b82f6',
    sections: [
      { id: 'importance', name: 'Importância da Limpeza', description: 'Segurança e conformidade', enabled: true },
      { id: 'process', name: 'Processo de Limpeza', description: 'Etapas do serviço', enabled: true },
      { id: 'compliance', name: 'Conformidade Legal', description: 'NR23, ABNT NBR 14880', enabled: true },
    ],
    defaultTitle: 'Proposta de Limpeza de Coifa',
    defaultDescription: `Proposta de serviços de limpeza e higienização de sistemas de exaustão.

Serviço especializado em limpeza de coifas, dutos e exaustores, garantindo a segurança contra incêndios e a conformidade com as normas técnicas vigentes.

O serviço inclui:
• Limpeza completa de coifas e filtros
• Higienização de dutos de exaustão
• Limpeza de exaustores e ventiladores
• Remoção de gordura acumulada
• Emissão de laudo técnico
• Conformidade com NR23 e ABNT NBR 14880`,
  },
  {
    id: 'quimicos',
    name: 'Fornecimento de Químicos',
    description: 'Lista de produtos químicos com especificações técnicas',
    icon: '🧪',
    color: '#a855f7',
    sections: [
      { id: 'products', name: 'Catálogo de Produtos', description: 'Lista completa de químicos', enabled: true },
      { id: 'specs', name: 'Especificações Técnicas', description: 'Fichas técnicas e segurança', enabled: true },
      { id: 'storage', name: 'Armazenamento e Manuseio', description: 'Orientações de uso seguro', enabled: true },
    ],
    defaultTitle: 'Proposta de Fornecimento de Químicos',
    defaultDescription: `Proposta de fornecimento de produtos químicos para limpeza e higienização profissional.

Oferecemos produtos de alta qualidade para todas as necessidades de limpeza da sua cozinha profissional, com fichas técnicas completas e orientações de uso seguro.

O fornecimento inclui:
• Detergentes e desengraxantes industriais
• Sanitizantes e desinfetantes
• Produtos para limpeza pesada
• Produtos para higienização de superfícies
• Fichas de segurança (FISPQ)
• Treinamento de aplicação`,
  },
  {
    id: 'instalacao',
    name: 'Instalação de Equipamentos',
    description: 'Instalação, configuração e treinamento',
    icon: '⚙️',
    color: '#f59e0b',
    sections: [
      { id: 'scope', name: 'Escopo de Instalação', description: 'Detalhes do serviço', enabled: true },
      { id: 'timeline', name: 'Cronograma', description: 'Prazos e etapas', enabled: true },
      { id: 'training', name: 'Treinamento', description: 'Capacitação da equipe', enabled: true },
    ],
    defaultTitle: 'Proposta de Instalação de Equipamentos',
    defaultDescription: `Proposta de serviços de instalação e configuração de equipamentos de cozinha profissional.

Realizamos a instalação completa dos seus equipamentos, incluindo configuração, testes e treinamento da equipe operacional.

O serviço inclui:
• Instalação física dos equipamentos
• Conexões elétricas e hidráulicas
• Configuração e calibração
• Testes de funcionamento
• Treinamento operacional da equipe
• Suporte pós-instalação`,
  },
];
