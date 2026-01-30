export interface ProposalTemplateSection {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface DefaultProduct {
  name: string;
  description: string;
  unit: string;
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
  defaultProducts: DefaultProduct[];
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
    defaultTitle: 'Proposta de Manutenção Preventiva Programada',
    defaultDescription: `A presente proposta tem como objetivo o fornecimento de serviços estruturados de manutenção preventiva em equipamentos de cozinha profissional, com foco na continuidade operacional, segurança dos ativos e redução de falhas corretivas não programadas.

Os serviços serão executados conforme plano de manutenção previamente definido, considerando a criticidade, o tipo e as condições de operação de cada equipamento, contemplando inspeções técnicas, verificações elétricas, mecânicas e funcionais, ajustes operacionais, limpeza técnica funcional e validação dos sistemas de segurança.

A WeDo atua com gestão técnica de ativos, assegurando rastreabilidade completa das intervenções, histórico por equipamento e relatórios técnicos digitais de cada atendimento realizado, permitindo maior controle operacional e suporte à tomada de decisão do cliente.

O modelo de manutenção preventiva proposto visa aumentar a vida útil dos equipamentos, reduzir paradas inesperadas, padronizar a operação e proporcionar previsibilidade de custos e desempenho ao longo da vigência contratual, conforme as condições estabelecidas nesta proposta.`,
    defaultProducts: [
      {
        name: 'Serviço estruturado de manutenção preventiva programada',
        description: `Serviço estruturado de manutenção preventiva programada incluindo:
• Inspeções técnicas periódicas conforme plano de manutenção
• Verificações elétricas, mecânicas e funcionais
• Ajustes operacionais e calibrações
• Limpeza técnica funcional de componentes
• Validação dos sistemas de segurança
• Lubrificação de partes móveis
• Relatório técnico digital com fotos e histórico por equipamento`,
        unit: 'SV',
      },
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
    defaultProducts: [
      {
        name: 'Limpeza de Coifa Completa',
        description: `Serviço completo de limpeza de sistema de exaustão:
• Limpeza interna e externa da coifa
• Higienização de filtros de gordura
• Limpeza de dutos de exaustão
• Limpeza de exaustores e ventiladores
• Remoção de gordura saturada
• Emissão de laudo técnico com fotos
• Certificado de conformidade`,
        unit: 'SV',
      },
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
    defaultProducts: [
      {
        name: 'Kit Produtos de Limpeza Profissional',
        description: `Kit completo de produtos químicos para cozinha profissional:
• Detergente desengraxante industrial
• Sanitizante para superfícies
• Desincrustante alcalino
• Limpa-inox profissional
• Fichas FISPQ incluídas`,
        unit: 'KIT',
      },
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
    defaultProducts: [
      {
        name: 'Instalação de Equipamento',
        description: `Serviço completo de instalação incluindo:
• Montagem e posicionamento do equipamento
• Conexões elétricas conforme normas
• Conexões hidráulicas/gás quando aplicável
• Configuração inicial e calibração
• Testes de funcionamento
• Treinamento operacional básico
• Garantia do serviço de instalação`,
        unit: 'SV',
      },
    ],
  },
  {
    id: 'camaras-frias',
    name: 'Câmaras Frias',
    description: 'Manutenção preventiva e corretiva de câmaras frias e refrigeração',
    icon: '❄️',
    color: '#06b6d4',
    sections: [
      { id: 'scope', name: 'Escopo Técnico', description: 'Atividades de manutenção detalhadas', enabled: true },
      { id: 'equipment', name: 'Detalhamento de Equipamentos', description: 'Lista de câmaras e especificações', enabled: true },
      { id: 'schedule', name: 'Cronograma de Visitas', description: 'Frequência e horários das manutenções', enabled: true },
    ],
    defaultTitle: 'Proposta Técnico Comercial - Câmaras Frias',
    defaultDescription: `A presente proposta tem como objetivo o fornecimento de serviços estruturados de manutenção preventiva e corretiva em câmaras frias e sistemas de refrigeração, com foco na continuidade operacional, segurança alimentar e eficiência energética.

Os serviços serão executados por profissionais devidamente qualificados e habilitados para execução das atividades propostas. Todos os profissionais WeDo são registrados CLT, possuem contrato de confidencialidade, seguro de vida e todas as obrigatoriedades legais.

O modelo de manutenção proposto visa garantir o funcionamento adequado dos equipamentos de refrigeração, evitando perdas de produtos, paradas não programadas e custos emergenciais.`,
    defaultProducts: [
      {
        name: 'Manutenção Preventiva de Câmaras Frias',
        description: `Serviço estruturado de manutenção preventiva incluindo:
• Limpeza da carenagem e condensador
• Verificação de pontos de oxidação
• Verificação e aperto de fixação de terminais, cabos e conexões
• Verificação de ruídos e vibrações anormais
• Verificação de pressões de alta e baixa
• Verificação de temperaturas na unidade condensadora
• Verificação do filtro secador da linha de líquido
• Verificação de separador de óleo e acumulador de sucção
• Verificação de condição do óleo do compressor
• Verificação e ajuste de pressostatos
• Verificação de motor ventilador
• Limpeza de serpentina, bandeja, difusores e ventiladores
• Verificação do sistema de degelo
• Verificação de gaxetas e vedações
• Verificação de borracha varredora e cortinas de PVC
• Verificação de dobradiças, fechaduras e mancais
• Verificação de painéis isotérmicos
• Relatório técnico digital com fotos`,
        unit: 'SV',
      },
    ],
  },
  {
    id: 'climatizacao',
    name: 'Climatização / Câmaras Frias',
    description: 'Manutenção preventiva de climatização, ar condicionado e câmaras frias com PMOC',
    icon: '🌡️',
    color: '#0ea5e9',
    sections: [
      { id: 'scope', name: 'Escopo Técnico', description: 'Atividades de manutenção conforme PMOC', enabled: true },
      { id: 'equipment', name: 'Inventário de Equipamentos', description: 'Lista de aparelhos por potência', enabled: true },
      { id: 'team', name: 'Estrutura de Atendimento', description: 'Equipe técnica e suporte', enabled: true },
    ],
    defaultTitle: 'Proposta Técnico Comercial - Ar Condicionado e Climatização',
    defaultDescription: `A presente proposta tem como objetivo o fornecimento de serviços estruturados de manutenção preventiva em aparelhos de ar condicionado e sistemas de climatização, com todas as revisões e procedimentos de acordo com o PMOC (Plano de Manutenção, Operação e Controle).

Os serviços serão executados por profissionais devidamente qualificados e habilitados para execução das atividades propostas. Todos os profissionais WeDo são registrados CLT, possuem contrato de confidencialidade, seguro de vida e todas as obrigatoriedades legais.

A WeDo atua com gestão técnica de ativos, assegurando rastreabilidade completa das intervenções, histórico por equipamento e relatórios técnicos digitais de cada atendimento realizado.`,
    defaultProducts: [
      {
        name: 'Manutenção Preventiva de Ar Condicionado (PMOC)',
        description: `Serviço estruturado de manutenção preventiva conforme PMOC incluindo:
• Limpeza de evaporadores e condensadores
• Aferição de temperaturas (quente e frio) e pressões
• Verificação e correção de ruídos e vibrações mecânicas
• Reaperto de mancais e suportes
• Verificação de tensões e correntes efetivas
• Reaperto das conexões elétricas de alimentação e comandos
• Verificação do comando e termostato de controle
• Verificação da serpentina quanto a danos físicos e restrições de fluxo
• Verificação de temperatura do motor de ventilação
• Verificação de pressões de compressores e cargas de gás refrigerante
• Limpeza química das serpentinas
• Verificação de tomadas e interruptores
• Verificação de dimensionamento de circuitos
• Organização e limpeza de quadros elétricos
• Correção de torque em conexões e terminais elétricos
• Higienização do equipamento
• Relatório técnico digital com fotos`,
        unit: 'SV',
      },
    ],
  },
];
