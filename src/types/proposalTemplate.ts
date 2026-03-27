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
    id: 'rational',
    name: 'Venda Rational',
    description: 'Proposta comercial para equipamentos Rational com ROI, benefícios e diferenciais técnicos',
    icon: '🔥',
    color: '#e11d48',
    sections: [
      { id: 'benefits', name: 'Benefícios e Diferenciais', description: 'ROI, economia e vantagens competitivas', enabled: true },
      { id: 'specs', name: 'Especificações Técnicas', description: 'Modelos, capacidades e tecnologias', enabled: true },
      { id: 'roi', name: 'Retorno sobre Investimento', description: 'Cálculo de economia e payback', enabled: true },
    ],
    defaultTitle: 'Proposta Comercial — Equipamentos Rational',
    defaultDescription: `A presente proposta tem como objetivo o fornecimento de equipamentos RATIONAL, líder mundial em sistemas de cocção inteligente, com mais de 1 milhão de equipamentos instalados em cozinhas profissionais ao redor do mundo.

O iCombi Pro é um forno combinado inteligente com conhecimento culinário integrado de mais de 1.000 chefs. Ele combina calor e umidade com precisão absoluta, cobrindo 95% de todas as aplicações culinárias convencionais — podendo substituir diversos equipamentos tradicionais em menos de 1 m².

Principais diferenciais para o seu negócio:

• Economia comprovada de até R$ 230.928/ano em um restaurante médio (200 refeições/dia)
• Redução de até 25% no custo de insumos (carnes, peixes e aves) graças à regulagem precisa do iCookingSuite
• Consumo de energia até 70% menor com o iProductionManager e tecnologia de controle avançada
• Redução de até 95% nos custos com gordura — quase não é preciso usar gordura no preparo
• Redução de até 60% no tempo de produção, eliminando atividades de rotina
• Custo zero com amaciamento de água e descalcificação graças ao iCareSystem

O equipamento oferece resultados uniformes em todas as prateleiras, com cores apetitosas, crocância perfeita e conservação de nutrientes. Qualquer profissional consegue operar o iCombi Pro graças à tela sensível ao toque intuitiva, com mais de 50 idiomas disponíveis. O sistema de limpeza automática garante higiene absoluta com dados APPCC durante a cocção.

A WeDo, como distribuidora autorizada Rational, oferece instalação profissional, treinamento operacional completo e suporte técnico contínuo, garantindo que o investimento gere retorno desde o primeiro dia de operação.`,
    defaultProducts: [
      {
        name: 'Forno Combinado iCombi Pro Rational',
        description: `Forno combinado inteligente RATIONAL iCombi Pro:
• Conhecimento culinário integrado (iCookingSuite) com percursos inteligentes
• iDensityControl — clima preciso na câmara de cocção com resultados uniformes
• iProductionManager — planejamento flexível e preparo simultâneo de diferentes pratos
• iCareSystem — limpeza e descalcificação automáticas (9 programas)
• Gerador de vapor fresco 100% higiênico
• Sensor de temperatura de núcleo com 6 pontos de medição
• Tela sensível ao toque com interface intuitiva
• ConnectedCooking — gerenciamento digital via WiFi
• Certificação ENERGY STAR
• Temperatura máxima: 300°C
• Inclui: instalação, configuração, treinamento operacional e garantia`,
        unit: 'UN',
      },
    ],
  },
  {
    id: 'ivario',
    name: 'Venda iVario',
    description: 'Proposta comercial para iVario Pro Rational com ROI, produtividade e diferenciais técnicos',
    icon: '🍳',
    color: '#dc2626',
    sections: [
      { id: 'benefits', name: 'Benefícios e Economia', description: 'ROI, economia de energia, água e espaço', enabled: true },
      { id: 'specs', name: 'Especificações Técnicas', description: 'Modelos, capacidades e tecnologias', enabled: true },
      { id: 'production', name: 'Exemplos de Produção', description: 'Capacidades reais de produção por modelo', enabled: true },
    ],
    defaultTitle: 'Proposta Comercial — iVario® Pro Rational',
    defaultDescription: `A presente proposta tem como objetivo o fornecimento do iVario® Pro, o sistema de cocção multifuncional da RATIONAL que substitui até 8 equipamentos convencionais: fogão, caldeirão, fritadeira, frigideira basculante, panela de pressão, chapa, banho-maria e panelas convencionais.

O iVario® Pro é a revolução em cocção profissional, combinando versatilidade absoluta com eficiência operacional incomparável. Em menos de 1 m², ele centraliza todas as operações de cocção da sua cozinha, liberando espaço, reduzindo custos e aumentando a produtividade da equipe.

Economia comprovada:
• Até 40% menos consumo de energia em comparação com equipamentos convencionais
• 4x mais rápido — aquecimento de 200°C em apenas 90 segundos com iVarioBoost
• 90 litros menos de água consumida por serviço
• 33% menos espaço ocupado na cozinha
• Redução significativa de mão de obra com processos automatizados

Exemplos de produção (modelo L — 100L):
• 250 porções de molho bolonhesa em 60 min
• 100 porções de sopa em 20 min
• 4 kg de arroz frito em 6 min
• 25 kg de carne cozida em 87 min (cocção sob pressão)
• 3 kg de massa com AutoLift em 19 min

Tecnologia integrada de ponta:
• iVarioBoost — aquecimento ultrarrápido, 200°C em 90 segundos
• iCookingSuite — ajuste automático de temperatura e tempo com percursos inteligentes
• iZoneControl — até 4 zonas independentes de cocção na mesma cuba
• AutoLift — levantamento automático de cestos para massas, batatas e vegetais
• Cocção sob pressão — redução de até 35% no tempo de preparo
• ConnectedCooking — gerenciamento digital via WiFi com HACCP automático, em conformidade com a RDC 216 da ANVISA

Modelos disponíveis:
• iVario 2-XS (2 x 17L) — ideal para operações compactas
• iVario Pro 2-S (2 x 25L) — versatilidade em formato duplo
• iVario Pro L (100L) — alta capacidade para grandes produções
• iVario Pro XL (150L) — máxima capacidade para operações de alto volume

A WeDo, como distribuidora autorizada Rational, oferece instalação profissional, treinamento operacional completo e suporte técnico contínuo, garantindo que o investimento gere retorno desde o primeiro dia de operação.`,
    defaultProducts: [
      {
        name: 'iVario® Pro Rational',
        description: `Sistema de cocção multifuncional RATIONAL iVario® Pro:
• Substitui até 8 equipamentos convencionais em menos de 1 m²
• iVarioBoost — aquecimento ultrarrápido (200°C em 90s)
• iCookingSuite — percursos inteligentes com ajuste automático
• iZoneControl — até 4 zonas independentes de cocção
• AutoLift — levantamento automático de cestos
• Cocção sob pressão integrada (-35% tempo)
• ConnectedCooking — HACCP automático via WiFi (RDC 216 ANVISA)
• Cuba em aço inoxidável com revestimento antiaderente
• Tela sensível ao toque com interface intuitiva
• Inclui: instalação, configuração, treinamento operacional e garantia`,
        unit: 'UN',
      },
    ],
  },
  {
    id: 'equipamentos',
    name: 'Venda de Equipamentos',
    description: 'Proposta para venda de equipamentos de cozinha profissional em geral',
    icon: '🏗️',
    color: '#0ea5e9',
    sections: [
      { id: 'scope', name: 'Escopo do Fornecimento', description: 'Equipamentos, acessórios e serviços inclusos', enabled: true },
      { id: 'benefits', name: 'Benefícios e Garantias', description: 'Vantagens, garantia e suporte técnico', enabled: true },
      { id: 'delivery', name: 'Entrega e Instalação', description: 'Prazos, logística e comissionamento', enabled: true },
    ],
    defaultTitle: 'Proposta Comercial — Fornecimento de Equipamentos',
    defaultDescription: `A presente proposta tem como objetivo o fornecimento de equipamentos para cozinha profissional, contemplando produtos de marcas líderes de mercado, selecionados conforme as necessidades operacionais do cliente.

A WeDo atua como distribuidora autorizada das principais marcas do segmento de food service, oferecendo equipamentos de alto desempenho com suporte técnico especializado, garantia de fábrica e assistência pós-venda.

O fornecimento inclui:
• Equipamentos novos com garantia de fábrica
• Entrega, instalação e configuração no local
• Treinamento operacional da equipe
• Suporte técnico e assistência pós-venda
• Orientação sobre layout e dimensionamento

Todos os equipamentos são entregues com documentação técnica completa, notas fiscais e certificados de garantia. A WeDo garante a procedência e qualidade de todos os produtos fornecidos, assegurando conformidade com as normas técnicas e sanitárias vigentes.`,
    defaultProducts: [
      {
        name: 'Equipamento de Cozinha Profissional',
        description: `Fornecimento de equipamento incluindo:
• Equipamento novo com garantia de fábrica
• Entrega e desembalagem no local
• Instalação elétrica e hidráulica conforme normas
• Configuração inicial e testes de funcionamento
• Treinamento operacional básico
• Manual de operação e manutenção
• Certificado de garantia`,
        unit: 'UN',
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
        description: `Serviço de manutenção preventiva conforme PMOC (Plano de Manutenção, Operação e Controle).
• Visitas programadas conforme cronograma acordado
• Limpeza e higienização de evaporadores e condensadores
• Limpeza química das serpentinas
• Aferição de temperaturas e pressões
• Verificação de tensões, correntes e conexões elétricas
• Verificação de ruídos, vibrações e componentes mecânicos
• Higienização completa do equipamento
• Relatório técnico digital com fotos a cada visita`,
        unit: 'SV',
      },
      {
        name: 'Manutenção Preventiva de Câmaras Frias',
        description: `Serviço estruturado de manutenção preventiva, com 2 técnicos e 2 visitas mensais, abrangendo inspeções, ajustes e limpeza técnica da unidade condensadora, evaporador, quadro elétrico e estrutura da câmara, incluindo verificação elétrica (tensão, corrente, proteções), mecânica (fixações, vibrações), frigorífica (pressões, temperaturas, óleo, vazamentos, degelo, superaquecimento e subresfriamento), componentes estruturais e de vedação, assegurando funcionamento seguro, desempenho adequado e continuidade operacional, com emissão de relatório técnico digital com fotos.`,
        unit: 'SV',
      },
    ],
  },
];
