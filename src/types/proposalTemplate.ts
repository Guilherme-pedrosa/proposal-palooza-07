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
  },
];
