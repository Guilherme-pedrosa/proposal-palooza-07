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
    id: 'climatizacao',
    name: 'Climatização / Câmaras Frias',
    description: 'Manutenção preventiva de climatização, ar condicionado e câmaras frias com PMOC',
    icon: '❄️',
    color: '#06b6d4',
    sections: [
      { id: 'scope', name: 'Escopo Técnico', description: 'Atividades de manutenção conforme PMOC', enabled: true },
      { id: 'equipment', name: 'Inventário de Equipamentos', description: 'Lista de aparelhos por potência e câmaras', enabled: true },
      { id: 'schedule', name: 'Cronograma de Visitas', description: 'Frequência e horários das manutenções', enabled: true },
    ],
    defaultTitle: 'Proposta Técnico Comercial - Climatização e Câmaras Frias',
    defaultDescription: `A presente proposta tem como objetivo o fornecimento de serviços estruturados de manutenção preventiva em sistemas de climatização (ar condicionado) e câmaras frias, com foco na continuidade operacional, segurança alimentar e eficiência energética.

Os serviços de climatização serão executados conforme PMOC (Plano de Manutenção, Operação e Controle), atendendo às exigências da Lei Federal nº 13.589/2018 e Portaria nº 3.523/GM.

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
• Limpeza química das serpentinas
• Higienização do equipamento
• Relatório técnico digital com fotos`,
        unit: 'SV',
      },
      {
        name: 'Manutenção Preventiva de Câmaras Frias',
        description: `Serviço estruturado de manutenção preventiva incluindo:

UNIDADE CONDENSADORA:
• Limpeza da carenagem e condensador
• Verificar pontos de oxidação
• Verificar e apertar fixação de terminais, cabos, conexões (elétricas e mecânicas)
• Verificar e corrigir ruídos e vibrações anormais
• Verificar condições dos cabos elétricos e contatores
• Verificar condições de atuação da proteção elétrica (relés, disjuntores)
• Verificar tensão e corrente elétrica
• Verificar pressões de alta e baixa
• Verificar temperaturas na UC
• Verificar filtro secador da linha de líquido
• Verificar atuação do separador de óleo e acumulador de sucção
• Verificar condição do óleo do compressor (troca se necessário)
• Verificar e ajustar todos os pressostatos
• Verificar funcionamento do motor ventilador
• Verificar contaminação no visor de líquido
• Verificar e corrigir vazamento de fluido refrigerante

EVAPORADOR:
• Limpar serpentina, bandeja, difusores e ventiladores
• Limpar sistema de drenagem da bandeja
• Verificar tensão e corrente dos motores, resistências, solenoide
• Verificar atuação da válvula solenoide e sistema de degelo
• Verificar fixação do bulbo da válvula de expansão
• Verificar fixação e calibração das sondas de temperatura
• Verificar isolamento da tubulação
• Verificar superaquecimento e subresfriamento

QUADRO ELÉTRICO:
• Verificar condições dos cabos e barramentos elétricos
• Verificar atuação do termostato e contatores
• Verificar interruptores, sinaleiros e botoeiras do alarme
• Verificar parametrização e condição da caixa de comando

ESTRUTURA DA CÂMARA:
• Verificar borracha varredora e cortinas de PVC
• Verificar dobradiças, mancais e fechaduras
• Verificar gaxetas e resistências
• Verificar fixação e vedação da soleira e painéis
• Verificar existência de trincas/fissuras/quebras
• Verificar válvula de alívio e chapas de proteção
• Relatório técnico digital com fotos`,
        unit: 'SV',
      },
    ],
  },
];
