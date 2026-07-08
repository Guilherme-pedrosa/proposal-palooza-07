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

// Termos gerais aplicáveis a todos os tipos de serviço (templateIds vazio = todos)
const generalTerms: SavedTermCondition[] = [
  {
    id: 'geral-1',
    title: 'Vigência do Contrato',
    description: 'O fornecimento do serviço desta proposta terá início na data acordada, com vigência por 12 (doze) meses, podendo ser prorrogado de comum acordo entre as partes.',
    templateIds: [], // Aparece em todos
  },
  {
    id: 'geral-2',
    title: 'Cancelamento',
    description: 'Cancelamentos por ambas as partes são isentos de multa, desde que seja avisado com 30 dias de antecedência.',
    templateIds: [],
  },
  {
    id: 'geral-3',
    title: 'Turno de Trabalho',
    description: 'O turno de trabalho será de segunda a sexta-feira, em horário comercial. Condições que diferem destes termos terão que ser alinhadas entre as partes.',
    templateIds: [],
  },
  {
    id: 'geral-4',
    title: 'Horas Extraordinárias / Adicional Noturno',
    description: 'Caso seja necessário a realização de visitas emergenciais, a visita subsequente poderá ser adiantada. Caso não seja possível, deverá haver uma negociação prévia para a execução de tal serviço.',
    templateIds: [],
  },
  {
    id: 'geral-5',
    title: 'Fornecimento WeDo',
    description: 'Acompanhamento de cada equipamento em contrato através de QR code gerenciado pela plataforma WeDo; Peças originais, vendidas a preço competitivo; Profissionais devidamente registrados e treinados; Zelo e guarda dos materiais fornecidos pelo cliente; Software de controle e lançamento em tempo real de serviços; Relatórios detalhados de cada serviço realizado; Software para abertura de chamados.',
    templateIds: [],
  },
  {
    id: 'geral-6',
    title: 'Fornecimento por Parte do Cliente',
    description: 'EPIs completos e em ótimas condições de uso, conforme atividades; Uniformes completos; Refeições de acordo com o turno trabalhado; Água potável e banheiros; Possibilidade de acesso às instalações elétricas e hidráulicas; Acompanhamento técnico quando requisitado; Área destinada à execução dos serviços, com pontos de energia elétrica 220v.',
    templateIds: [],
  },
  {
    id: 'geral-7',
    title: 'Conserto em Oficina',
    description: 'Caso haja necessidade de conserto de algum equipamento em oficina (fora do local), o equipamento retornará após o reparo. Caso haja necessidade de entrega do equipamento antes desse prazo, poderá ser cobrada uma taxa de deslocamento de R$2,00 por quilômetro.',
    templateIds: [],
  },
  {
    id: 'geral-8',
    title: 'Reajuste de Preço',
    description: 'O preço poderá ser reajustado anualmente conforme os índices IGPM da FGV e IPCA do IBGE ou por outro índice oficial que venha a substituí-lo, ou conforme alinhamento com o cliente.',
    templateIds: [],
  },
];

// Termos específicos para Manutenção Preventiva de Cozinha
const preventivaTerms: SavedTermCondition[] = [
  {
    id: 'prev-1',
    title: 'Escopo Técnico - Equipamentos de Cocção',
    description: 'Manutenção preventiva em fogões industriais, fornos convencionais, fornos combinados, chapas, fritadeiras, banhos-maria e equipamentos de aquecimento. Inclui verificação de queimadores, válvulas de gás, termostatos, resistências elétricas e sistemas de ignição.',
    templateIds: ['preventiva'],
  },
  {
    id: 'prev-2',
    title: 'Escopo Técnico - Equipamentos de Preparação',
    description: 'Manutenção preventiva em liquidificadores industriais, processadores, batedeiras, cortadores de frios, moedores de carne e descascadores. Inclui verificação de motores, correias, lâminas, sistemas de segurança e componentes elétricos.',
    templateIds: ['preventiva'],
  },
  {
    id: 'prev-3',
    title: 'Escopo Técnico - Refrigeração de Cozinha',
    description: 'Manutenção preventiva em balcões refrigerados, refrigeradores verticais, freezers e pass-through. Inclui limpeza de condensadores, verificação de temperaturas, gaxetas, termostatos e sistemas de degelo.',
    templateIds: ['preventiva'],
  },
  {
    id: 'prev-inst-coifa-1',
    title: 'Medição, Apontamento e Faturamento de Horas Técnicas',
    description: 'Nos contratos mensais, os serviços serão mensurados e faturados com base em hora técnica contratada, com fechamento operacional e financeiro realizado sempre na primeira semana do mês subsequente à prestação. A previsão de horas apresentada na proposta tem caráter estimativo para planejamento da operação. Eventuais horas excedentes executadas além da previsão serão cobradas pelo valor da hora técnica vigente e previamente contratado, no respectivo fechamento mensal. Na hipótese de consumo inferior ao volume previsto, permanece mantido o valor contratual pactuado, em razão da disponibilidade técnica, alocação de equipe e reserva de capacidade operacional dedicada ao atendimento.',
    templateIds: ['preventiva', 'instalacao', 'coifa'],
  },
];

const manutencaoEletricaCivilTerms: SavedTermCondition[] = [
  {
    id: 'mec-1',
    title: 'Escopo Técnico — Manutenção Elétrica de Baixa Tensão',
    description: 'Contempla inspeção, diagnóstico, correção e substituição de componentes em instalações elétricas de baixa tensão, incluindo tomadas, interruptores, luminárias, disjuntores de alimentação terminal, conexões aparentes, readequações pontuais e correção de falhas operacionais, sempre dentro da capacidade instalada existente e sem caracterização de ampliação de carga ou projeto executivo.',
    templateIds: ['manutencao_eletrica_civil'],
  },
  {
    id: 'mec-2',
    title: 'Escopo Técnico — Manutenção Civil Leve',
    description: 'Compreende serviços localizados de reparo, recomposição e ajuste funcional, tais como troca pontual de piso, recomposição de revestimentos, correção de reboco, rejunte, pintura de acabamento localizada, vedações, fixações e pequenos reparos em elementos não estruturais. Este escopo não inclui construção, demolição estrutural, ampliação de áreas ou reformas de grande porte.',
    templateIds: ['manutencao_eletrica_civil'],
  },
  {
    id: 'mec-3',
    title: 'Atendimento, Apontamento e Fechamento Mensal',
    description: 'Os serviços poderão ser executados sob regime de hora técnica, com apontamento por atendimento, atividade executada e evidências operacionais, quando aplicável. Nos contratos mensais, o fechamento técnico e financeiro será realizado na primeira semana do mês subsequente. Eventuais horas excedentes ao previsto serão faturadas conforme valor contratado; horas abaixo da previsão não descaracterizam a disponibilidade operacional reservada à contratante.',
    templateIds: ['manutencao_eletrica_civil'],
  },
  {
    id: 'mec-4',
    title: 'Limites de Escopo e Exclusões',
    description: 'Não fazem parte do escopo padrão serviços caracterizados como obra civil, ampliação de rede, aumento de carga, elaboração de projetos, regularização junto a concessionárias, adequações estruturais, intervenções em média tensão, fornecimento integral de materiais especiais, andaimes, plataformas, ART/RRT específica ou serviços que demandem paralisações extraordinárias sem programação prévia.',
    templateIds: ['manutencao_eletrica_civil'],
  },
  {
    id: 'mec-5',
    title: 'Segurança Operacional e Condições de Execução',
    description: 'As atividades serão executadas conforme boas práticas técnicas e requisitos aplicáveis de segurança, especialmente para intervenções em eletricidade de baixa tensão e áreas em operação. Sempre que necessário, a contratante deverá assegurar liberação da área, desligamento seguro, acesso às instalações e condições adequadas para execução do serviço, evitando interferências que comprometam prazo, segurança ou qualidade final.',
    templateIds: ['manutencao_eletrica_civil'],
  },
];

// Termos específicos para Limpeza de Coifa
const coifaTerms: SavedTermCondition[] = [
  {
    id: 'coifa-1',
    title: 'Escopo Técnico - Limpeza de Coifa',
    description: 'Limpeza interna e externa da coifa com remoção total de gordura saturada; Higienização de filtros de gordura; Limpeza de dutos de exaustão com acesso interno quando aplicável; Limpeza de exaustores e ventiladores; Verificação de integridade dos dutos e conexões.',
    templateIds: ['coifa'],
  },
  {
    id: 'coifa-2',
    title: 'Conformidade e Segurança',
    description: 'Serviço executado em conformidade com a NR23 (Proteção Contra Incêndios) e ABNT NBR 14880. Emissão de laudo técnico com registro fotográfico antes e depois do serviço. Certificado de limpeza para fins de fiscalização e seguro.',
    templateIds: ['coifa'],
  },
  {
    id: 'coifa-3',
    title: 'Frequência Recomendada',
    description: 'A frequência de limpeza deve seguir as recomendações das normas técnicas vigentes, considerando o volume de produção da cozinha. Recomenda-se limpeza mensal ou bimestral para operações de alta demanda, e trimestral ou semestral para operações de média demanda.',
    templateIds: ['coifa'],
  },
  {
    id: 'coifa-4',
    title: 'Responsabilidade Técnica',
    description: 'O serviço é executado por profissionais capacitados em trabalho em altura (NR35) e espaço confinado (NR33) quando aplicável. A WeDo possui seguro de responsabilidade civil para todos os serviços executados.',
    templateIds: ['coifa'],
  },
];

// Termos específicos para Câmaras Frias / Climatização
const climatizacaoTerms: SavedTermCondition[] = [
  {
    id: 'clim-1',
    title: 'Escopo Técnico - Unidade Condensadora',
    description: 'Limpeza da carenagem e condensador; Verificar pontos de oxidação; Verificar e apertar fixação de terminais, cabos, conexões (elétricas e mecânicas); Verificar e corrigir ruídos e vibrações anormais; Verificar condições dos cabos elétricos; Verificar condições e atuação dos contatores; Verificar condições de atuação da proteção elétrica (relés, disjuntores); Verificar tensão e corrente elétrica; Verificar pressões de alta e baixa; Verificar temperaturas na UC; Verificar filtro secador da linha de líquido; Verificar atuação do separador de óleo e acumulador de sucção; Verificar condição do óleo do compressor (efetuar troca se necessário); Verificar pressão e nível de óleo; Verificar e ajustar todos os pressostatos; Verificar funcionamento do motor ventilador; Verificar contaminação no visor de líquido; Verificar e corrigir vazamento de fluido refrigerante.',
    templateIds: ['climatizacao'],
  },
  {
    id: 'clim-2',
    title: 'Escopo Técnico - Evaporador',
    description: 'Limpar serpentina, bandeja, difusores e ventiladores do evaporador; Verificar e corrigir ruídos e vibrações anormais; Verificar condições dos cabos e barramentos elétricos; Verificar e corrigir fixação de terminais, cabos, conexões; Limpar o sistema de drenagem da bandeja do condensador; Verificar tensão e corrente dos motores, resistências, solenoide; Verificar pontos de oxidação; Verificar atuação da válvula solenoide; Verificar atuação do sistema de degelo; Verificar fixação do bulbo da válvula de expansão; Verificar fixação e calibração das sondas de temperatura; Verificar isolamento da tubulação; Verificar superaquecimento e subresfriamento; Verificar vazamentos de fluido refrigerante.',
    templateIds: ['climatizacao'],
  },
  {
    id: 'clim-3',
    title: 'Escopo Técnico - Quadro Elétrico',
    description: 'Verificar e corrigir fixação de terminais, cabos, conexões elétricas; Verificar condições dos cabos e barramentos elétricos; Verificar tensão e corrente elétrica; Verificar condições de atuação da proteção elétrica; Verificar atuação dos contatores; Verificar atuação do termostato; Verificar atuação interruptores, sinaleiros e botoeiras do alarme; Verificar parametrização; Verificar condição da caixa de comando.',
    templateIds: ['climatizacao'],
  },
  {
    id: 'clim-4',
    title: 'Escopo Técnico - Estrutura da Câmara',
    description: 'Verificar borracha varredora; Verificar cortinas de PVC; Verificar dobradiças e mancais; Verificar fechaduras; Verificar gaxetas; Verificar resistências; Verificar fixação e vedação da soleira; Verificar hidráulico; Verificar vedação/fixação dos painéis; Verificar existência de trincas/fissuras/quebras; Verificar válvula de alívio; Verificar fixação de chapas de proteção (xadrez); Verificar fixação e vedação das cantoneiras.',
    templateIds: ['climatizacao'],
  },
  {
    id: 'clim-5',
    title: 'Segurança Alimentar',
    description: 'Os serviços de manutenção em câmaras frias visam garantir a segurança alimentar conforme as Boas Práticas de Fabricação (BPF) e a legislação sanitária vigente. Falhas no sistema de refrigeração podem comprometer a qualidade dos produtos armazenados.',
    templateIds: ['climatizacao'],
  },
  {
    id: 'clim-6',
    title: 'Atendimento Emergencial - Refrigeração',
    description: 'Em caso de falha crítica do sistema de refrigeração que comprometa os produtos armazenados, a WeDo oferece suporte emergencial com prazo de atendimento conforme contratado, mediante disponibilidade técnica.',
    templateIds: ['climatizacao'],
  },
  {
    id: 'clim-7',
    title: 'Escopo Técnico - Ar Condicionado (PMOC)',
    description: 'Elaboração de manutenção preventiva conforme PMOC (Plano de Manutenção, Operação e Controle) exigido pela Lei Federal nº 13.589/2018 e Portaria nº 3.523/GM. Limpeza de evaporadores e condensadores; Aferição de temperaturas e pressões; Verificação e correção de ruídos e vibrações mecânicas; Verificação de tensões e correntes; Limpeza química das serpentinas.',
    templateIds: ['climatizacao'],
  },
  {
    id: 'clim-8',
    title: 'Qualidade do Ar Interior',
    description: 'Os serviços de manutenção visam garantir a qualidade do ar interior conforme a Resolução ANVISA nº 9/2003 e normas técnicas ABNT. Ambientes climatizados devem manter níveis adequados de renovação do ar e controle microbiológico.',
    templateIds: ['climatizacao'],
  },
  {
    id: 'clim-9',
    title: 'Responsável Técnico PMOC',
    description: 'A WeDo disponibiliza profissional habilitado para assinatura do PMOC, conforme exigência legal. O plano contempla cronograma de manutenções, registro de atividades e relatórios técnicos para fiscalização.',
    templateIds: ['climatizacao'],
  },
];

// Termos específicos para Fornecimento de Químicos
const quimicosTerms: SavedTermCondition[] = [
  {
    id: 'quim-1',
    title: 'Especificações dos Produtos',
    description: 'Todos os produtos químicos fornecidos possuem registro na ANVISA quando aplicável, fichas técnicas completas (FT) e fichas de informações de segurança de produtos químicos (FISPQ) disponíveis para consulta.',
    templateIds: ['quimicos'],
  },
  {
    id: 'quim-2',
    title: 'Armazenamento e Manuseio',
    description: 'O cliente é responsável pelo armazenamento adequado dos produtos conforme orientações das fichas técnicas. Os produtos devem ser mantidos em local seco, arejado e protegido da luz solar direta, em temperatura ambiente.',
    templateIds: ['quimicos'],
  },
  {
    id: 'quim-3',
    title: 'Treinamento de Aplicação',
    description: 'A WeDo oferece treinamento inicial para a equipe do cliente sobre a correta aplicação e diluição dos produtos. Treinamentos adicionais podem ser solicitados conforme necessidade.',
    templateIds: ['quimicos'],
  },
  {
    id: 'quim-4',
    title: 'Prazo de Entrega',
    description: 'As entregas serão realizadas conforme cronograma acordado entre as partes. Pedidos extraordinários têm prazo de entrega de até 5 dias úteis após confirmação do pedido.',
    templateIds: ['quimicos'],
  },
];

// Termos específicos para Instalação de Equipamentos
const instalacaoTerms: SavedTermCondition[] = [
  {
    id: 'inst-1',
    title: 'Escopo da Instalação',
    description: 'O serviço contempla montagem e posicionamento do equipamento; Conexões elétricas conforme normas NBR 5410; Conexões hidráulicas e/ou de gás quando aplicável; Configuração inicial e calibração; Testes de funcionamento completos.',
    templateIds: ['instalacao'],
  },
  {
    id: 'inst-2',
    title: 'Requisitos de Infraestrutura',
    description: 'O cliente deve garantir que a infraestrutura elétrica e hidráulica esteja adequada às especificações técnicas do equipamento. Caso sejam necessárias adequações, estas serão orçadas separadamente.',
    templateIds: ['instalacao'],
  },
  {
    id: 'inst-3',
    title: 'Treinamento Operacional',
    description: 'Inclui treinamento operacional básico para a equipe do cliente sobre o uso correto do equipamento instalado. O treinamento cobre funcionamento, limpeza básica e identificação de problemas comuns.',
    templateIds: ['instalacao'],
  },
  {
    id: 'inst-4',
    title: 'Garantia da Instalação',
    description: 'O serviço de instalação possui garantia de 90 dias para vícios de execução. Esta garantia não cobre mau uso, quedas de energia, variações de tensão ou intervenções por terceiros não autorizados.',
    templateIds: ['instalacao'],
  },
  {
    id: 'inst-5',
    title: 'Documentação Técnica',
    description: 'Ao final da instalação, será entregue relatório técnico com fotos, configurações realizadas e orientações de uso. Manuais do fabricante devem ser fornecidos pelo cliente ou fabricante do equipamento.',
    templateIds: ['instalacao'],
  },
];

// Termos específicos para Venda Rational
const rationalTerms: SavedTermCondition[] = [
  {
    id: 'rat-1',
    title: 'Aprovação e Validade',
    description: 'Proposta válida por 10 dias corridos. Após esse prazo, sujeita a reavaliação. Aprovação via e-mail ou WhatsApp — sem necessidade de assinatura física. Valores são para aprovação total. Aprovação parcial pode alterar preços. Cancelamento após aprovação: multa de 20%. Com 30 dias de aviso prévio: sem multa. Execução em até 30 dias úteis após confirmação do pagamento.',
    templateIds: ['rational', 'equipamentos'],
  },
  {
    id: 'rat-2',
    title: 'Garantia do Equipamento Rational',
    description: 'Equipamento Rational: 24 meses de garantia do fabricante. Serviços WeDo (instalação, manutenção, reparo): 90 dias de garantia. Condição obrigatória: instalação por assistência técnica autorizada Rational/WeDo.',
    templateIds: ['rational'],
  },
  {
    id: 'rat-3',
    title: 'O que Invalida a Garantia',
    description: 'Uso de produtos químicos não homologados pelo fabricante no iCareSystem; Infraestrutura inadequada (voltagem errada, sem aterramento, pressão de água fora do range); Equipamento sem registro no ConnectedCooking; Ausência de manutenção preventiva na periodicidade recomendada (semestral); Peças consumíveis (vedações, gaxetas, lâmpadas, resistências, vidros). Ref.: Manual de Operação Rational — Capítulo "Garantia e Condições".',
    templateIds: ['rational'],
  },
  {
    id: 'rat-4',
    title: 'Infraestrutura — Responsabilidade do Cliente',
    description: 'O cliente deve providenciar antes da instalação:\n\n• Elétrica: 3 AC 220V ou 3N AC 400V, disjuntor dedicado (3x10A a 3x200A), aterramento NBR 5410.\n• Hidráulica: Entrada R 3/4", pressão 1,0 a 6,0 bar, dreno DN 40 ou DN 50.\n• Gás: 3/4" IG, GN 18-25 mbar ou GLP 25-57,5 mbar, conforme NBR 13.103.\n• Exaustão: Coifa dimensionada conforme ABNT NBR 14518 e NR-23.\n• Espaço: Piso nivelado, acesso livre, área menor que 1 m² (varia por modelo).\n\nInfraestrutura ausente = reagendamento com taxa de deslocamento. WeDo NÃO faz obras civis/elétricas/hidráulicas.',
    templateIds: ['rational'],
  },
  {
    id: 'rat-5',
    title: 'Limpeza e Manutenção Rational',
    description: 'iCareSystem AutoDose: limpeza e descalcificação automáticas com tabletes Rational originais. Manutenção preventiva semestral recomendada (peças não inclusas — orçadas à parte). Químicos não homologados no iCareSystem = perda automática da garantia.',
    templateIds: ['rational'],
  },
  {
    id: 'rat-6',
    title: 'Instalação e Treinamento Rational',
    description: 'Instalação por técnico autorizado: posicionamento, conexões, testes, parametrização e registro no ConnectedCooking. Treinamento incluso: 1 sessão presencial (até 2h) — operação, limpeza, ConnectedCooking. Necessário WiFi 2.4 GHz no local para ativação do ConnectedCooking (HACCP automático — RDC 216 ANVISA).',
    templateIds: ['rational'],
  },
  {
    id: 'rat-7',
    title: 'Normas Técnicas Aplicáveis',
    description: 'NR-10 | NR-12 | NR-13 | NR-23 | RDC 216 ANVISA | NBR 14518 | NBR 5410 | NBR 13.103.',
    templateIds: ['rational', 'equipamentos'],
  },
  {
    id: 'rat-8',
    title: 'Aspectos Gerais — Financeiro e Jurídico',
    description: 'Pagamento conforme proposta. Atraso: juros 1%/mês + multa 2% + IGPM. Equipamento com reserva de domínio até quitação integral. NF-e de materiais em CFOP 5.949 (LC 116/2003). ISS reduzido proporcionalmente. Foro: Comarca de Anápolis/GO.',
    templateIds: ['rational', 'equipamentos'],
  },
  {
    id: 'rat-9',
    title: 'Horário de Atendimento',
    description: 'Seg a Sex, 08h–18h. Fora desse horário: +50% sobre hora técnica.',
    templateIds: ['rational', 'equipamentos'],
  },
];

// Termos específicos para Venda de Equipamentos em Geral
const equipamentosTerms: SavedTermCondition[] = [
  {
    id: 'equip-1',
    title: 'Garantia de Equipamentos',
    description: 'Os equipamentos possuem garantia conforme especificação do fabricante (consultar ficha técnica de cada item). Serviços WeDo (instalação, manutenção, reparo): 90 dias de garantia. Condição obrigatória: instalação por assistência técnica autorizada.',
    templateIds: ['equipamentos'],
  },
  {
    id: 'equip-2',
    title: 'Infraestrutura — Responsabilidade do Cliente',
    description: 'O cliente deve providenciar infraestrutura elétrica e hidráulica adequada conforme especificações técnicas de cada equipamento antes da data de instalação. Infraestrutura ausente = reagendamento com taxa de deslocamento. WeDo NÃO faz obras civis/elétricas/hidráulicas.',
    templateIds: ['equipamentos'],
  },
  {
    id: 'equip-3',
    title: 'Instalação e Treinamento',
    description: 'Instalação por técnico autorizado: posicionamento, conexões elétricas e hidráulicas, testes de funcionamento e parametrização. Treinamento operacional incluso: 1 sessão presencial (até 2h) — operação básica, limpeza e cuidados.',
    templateIds: ['equipamentos'],
  },
  {
    id: 'equip-4',
    title: 'Prazo de Entrega',
    description: 'Entrega em até 30 dias úteis após confirmação do pagamento, sujeito à disponibilidade de estoque. Para equipamentos importados, o prazo pode ser estendido conforme logística do fabricante.',
    templateIds: ['equipamentos'],
  },
];

// Termos específicos para Locação de Equipamentos
const locacaoTerms: SavedTermCondition[] = [
  {
    id: 'loc-1',
    title: '1. Uso conforme manual do equipamento',
    description: 'O equipamento locado deverá ser utilizado exclusivamente para a finalidade a que se destina, respeitando integralmente as orientações constantes no manual do equipamento, manual do fabricante, etiquetas técnicas, instruções de operação, orientações de segurança e recomendações fornecidas pela LOCADORA.\n\nO uso em desacordo com o manual do equipamento será considerado mau uso, podendo gerar cobrança de peças, mão de obra, deslocamento, danos ao equipamento e demais custos necessários para restabelecimento das condições adequadas de funcionamento.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-2',
    title: '2. Responsabilidade pela operação',
    description: 'A LOCATÁRIA será responsável por operar o equipamento somente por pessoas devidamente orientadas e aptas, observando os procedimentos descritos no manual do equipamento.\n\nA LOCADORA poderá fornecer orientações iniciais de uso, porém tais orientações não substituem a leitura, observância e cumprimento integral do manual do equipamento pela LOCATÁRIA e sua equipe.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-3',
    title: '3. Instalação e infraestrutura',
    description: 'A LOCATÁRIA será responsável por disponibilizar infraestrutura adequada para instalação e funcionamento do equipamento, incluindo, quando aplicável, ponto elétrico, disjuntores, tensão correta, aterramento, ponto hidráulico, pressão de água, drenagem, exaustão, ventilação, espaço físico, nivelamento, acesso técnico e demais condições exigidas no manual do equipamento.\n\nCaso a infraestrutura local esteja em desacordo com o manual do equipamento, a LOCADORA poderá suspender a instalação, limitar o funcionamento, recomendar adequações ou recusar a operação do equipamento até a regularização das condições necessárias.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-4',
    title: '4. Condições de energia elétrica',
    description: 'A LOCATÁRIA deverá garantir alimentação elétrica compatível com as especificações técnicas do equipamento, conforme manual do equipamento, placa de identificação e orientações da LOCADORA.\n\nOscilações de tensão, ausência de aterramento, uso de extensões inadequadas, sobrecarga elétrica, ligação em tensão incorreta, alteração de plugues, ausência de proteção elétrica ou qualquer condição em desacordo com o manual do equipamento serão considerados fatores externos à responsabilidade da LOCADORA.\n\nDanos causados por problemas elétricos serão de responsabilidade da LOCATÁRIA.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-5',
    title: '5. Condições hidráulicas, qualidade da água e drenagem',
    description: 'Quando o equipamento depender de água, a LOCATÁRIA deverá garantir ponto hidráulico, pressão, vazão, filtragem, dureza, drenagem e qualidade da água conforme especificado no manual do equipamento.\n\nA utilização de água fora dos padrões recomendados no manual do equipamento poderá causar incrustações, entupimentos, falhas em válvulas, resistências, bombas, boilers, sensores e demais componentes, sendo tais danos considerados decorrentes de condição inadequada de uso.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-6',
    title: '6. Limpeza, higienização e conservação',
    description: 'A LOCATÁRIA deverá realizar a limpeza, higienização e conservação diária do equipamento conforme instruções do manual do equipamento, utilizando apenas produtos, utensílios e métodos compatíveis com o equipamento.\n\nÉ vedado o uso de produtos abrasivos, corrosivos, inflamáveis, inadequados, não autorizados ou incompatíveis com os materiais do equipamento, conforme manual do equipamento.\n\nDanos causados por limpeza inadequada, ausência de higienização, acúmulo de resíduos, gordura, calcário, incrustações ou obstruções serão considerados responsabilidade da LOCATÁRIA.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-7',
    title: '7. Insumos, produtos químicos e consumíveis',
    description: 'Quando o equipamento exigir uso de insumos, detergentes, secantes, filtros, cartuchos, pastilhas, lubrificantes ou produtos químicos específicos, a LOCATÁRIA deverá utilizar somente produtos compatíveis com o manual do equipamento e previamente autorizados pela LOCADORA.\n\nO uso de insumos inadequados, adulterados, diluídos incorretamente, vencidos ou não recomendados no manual do equipamento poderá gerar perda de garantia operacional e cobrança dos custos de reparo.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-8',
    title: '8. Manutenção preventiva',
    description: 'A manutenção preventiva será realizada conforme periodicidade definida na proposta, contrato ou plano técnico da LOCADORA, observadas as recomendações do manual do equipamento e as condições reais de uso.\n\nA manutenção preventiva não substitui as rotinas diárias de limpeza, operação correta, inspeção visual, conservação e cuidados operacionais previstos no manual do equipamento, que permanecem sob responsabilidade da LOCATÁRIA.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-9',
    title: '9. Manutenção corretiva',
    description: 'A LOCADORA prestará suporte técnico para correção de falhas do equipamento, observadas as condições comerciais e operacionais previstas na proposta.\n\nQuando a falha decorrer de desgaste natural, defeito interno ou condição não atribuível à LOCATÁRIA, o atendimento seguirá as condições de garantia ou suporte previstas.\n\nQuando a falha decorrer de mau uso, operação incorreta, infraestrutura inadequada, ausência de limpeza, uso de insumos incompatíveis, intervenção de terceiros ou descumprimento do manual do equipamento, os custos de atendimento, peças, deslocamento e mão de obra poderão ser cobrados da LOCATÁRIA.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-10',
    title: '10. Intervenção de terceiros',
    description: 'A LOCATÁRIA não poderá abrir, desmontar, alterar, reparar, deslocar internamente, adaptar, modificar ou permitir intervenção de terceiros no equipamento sem autorização prévia e por escrito da LOCADORA.\n\nQualquer intervenção não autorizada, especialmente quando em desacordo com o manual do equipamento, poderá gerar perda da garantia operacional e responsabilização da LOCATÁRIA por danos, falhas, custos técnicos e substituição de componentes.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-11',
    title: '11. Alteração de configuração e parâmetros',
    description: 'A LOCATÁRIA não poderá alterar parâmetros técnicos, programação, regulagens, sensores, proteções, sistemas de segurança, pressão, temperatura, dosagem química, ciclos de operação ou qualquer configuração técnica do equipamento sem autorização da LOCADORA.\n\nAlterações realizadas em desacordo com o manual do equipamento serão consideradas mau uso e poderão gerar cobrança dos custos de correção.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-12',
    title: '12. Segurança operacional',
    description: 'A LOCATÁRIA deverá observar todas as orientações de segurança previstas no manual do equipamento, incluindo cuidados com partes quentes, partes móveis, eletricidade, vapor, pressão, produtos químicos, superfícies cortantes, cargas, abertura de portas, ciclos de operação e procedimentos de parada.\n\nA LOCATÁRIA será responsável por orientar seus colaboradores quanto ao uso seguro do equipamento e por impedir o uso por pessoas não autorizadas ou não treinadas.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-13',
    title: '13. Acessórios, peças removíveis e componentes',
    description: 'Todos os acessórios, cestos, racks, filtros, bandejas, suportes, mangueiras, cabos, conexões, bicos, tampas, proteções e demais componentes entregues com o equipamento integram a locação e deverão ser conservados conforme manual do equipamento.\n\nPerda, quebra, extravio, mau uso, desgaste anormal ou dano causado a acessórios e componentes poderá ser cobrado da LOCATÁRIA.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-14',
    title: '14. Comunicação de falhas',
    description: 'A LOCATÁRIA deverá comunicar imediatamente à LOCADORA qualquer falha, ruído anormal, vazamento, aquecimento excessivo, erro no painel, mau funcionamento, cheiro incomum, oscilação elétrica, travamento, queda de desempenho ou qualquer condição diferente do funcionamento normal previsto no manual do equipamento.\n\nA continuidade de uso do equipamento após identificação de falha, sem autorização da LOCADORA, poderá agravar o dano e caracterizar mau uso.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-15',
    title: '15. Proibição de uso em condições inadequadas',
    description: 'A LOCATÁRIA deverá interromper o uso do equipamento sempre que houver condição insegura, falha aparente, vazamento, curto, cheiro de queimado, superaquecimento, obstrução, ausência de água, erro crítico, ruído anormal ou qualquer situação não prevista como operação normal no manual do equipamento.\n\nO uso do equipamento em condição inadequada poderá transferir à LOCATÁRIA a responsabilidade pelos danos decorrentes.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-16',
    title: '16. Realocação do equipamento',
    description: 'A LOCATÁRIA não poderá transferir, mudar de local, remover, transportar ou reinstalar o equipamento sem autorização prévia e por escrito da LOCADORA.\n\nA movimentação, transporte ou reinstalação em desacordo com o manual do equipamento poderá causar danos estruturais, elétricos, hidráulicos ou funcionais, sendo a LOCATÁRIA responsável pelos custos decorrentes.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-17',
    title: '17. Garantia operacional',
    description: 'A garantia operacional da locação está condicionada ao uso correto do equipamento, cumprimento do manual do equipamento, manutenção das condições adequadas de infraestrutura, limpeza, conservação e utilização de insumos compatíveis.\n\nNão haverá cobertura para danos decorrentes de mau uso, negligência, imperícia, falta de limpeza, intervenção de terceiros, infraestrutura inadequada, variação elétrica, água fora do padrão, queda, impacto, transporte indevido, violação de lacres, alteração de parâmetros ou descumprimento do manual do equipamento.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-18',
    title: '18. Laudo técnico',
    description: 'Em caso de falha, dano ou divergência quanto à causa do problema, a LOCADORA poderá emitir laudo técnico indicando as condições encontradas, registros fotográficos, evidências de uso, estado de conservação, eventual descumprimento do manual do equipamento e responsabilidade técnica pelo ocorrido.\n\nO laudo técnico poderá servir como base para cobrança de peças, mão de obra, deslocamento, substituição de componentes, indenização ou demais providências previstas na proposta.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-19',
    title: '19. Devolução do equipamento',
    description: 'Ao término da locação, rescisão, substituição ou retirada do equipamento, a LOCATÁRIA deverá devolver o bem limpo, higienizado, completo, com seus acessórios, em bom estado de conservação e funcionamento, ressalvado o desgaste natural decorrente do uso regular conforme manual do equipamento.\n\nCaso o equipamento seja devolvido sujo, incompleto, danificado, com avarias, peças faltantes, acessórios extraviados ou em desacordo com o manual do equipamento, a LOCADORA poderá cobrar os custos de limpeza técnica, reparo, reposição, transporte, peças e mão de obra.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-20',
    title: '20. Prevalência do manual do equipamento',
    description: 'O manual do equipamento integra as condições comerciais da locação, ainda que não esteja fisicamente anexado à proposta.\n\nEm caso de dúvida sobre instalação, operação, limpeza, conservação, segurança, insumos, infraestrutura ou manutenção, deverão prevalecer as orientações constantes no manual do equipamento, no manual do fabricante e nas orientações técnicas formalizadas pela LOCADORA.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-21',
    title: '21. Atualizações do fabricante',
    description: 'Caso o fabricante atualize recomendações técnicas, procedimentos de segurança, parâmetros de operação, insumos compatíveis ou rotinas de manutenção, a LOCATÁRIA deverá adequar o uso do equipamento às novas orientações, desde que comunicada pela LOCADORA ou disponibilizado o manual atualizado do equipamento.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-22',
    title: '22. Responsabilidade por perda, roubo, furto ou dano',
    description: 'Durante todo o período da locação, a LOCATÁRIA será responsável pela guarda, zelo e conservação do equipamento, devendo adotar medidas para evitar perda, roubo, furto, extravio, avarias, uso indevido ou acesso por pessoas não autorizadas.\n\nEm caso de perda, roubo, furto, dano irreversível ou impossibilidade de recuperação do equipamento, a LOCATÁRIA deverá indenizar a LOCADORA pelo valor de reposição do bem, acessórios e componentes, sem prejuízo de demais custos necessários.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-23',
    title: 'Acessórios e bandejas não inclusos',
    description: 'Acessórios, bandejas, GNs, cestos, racks, utensílios de apoio e demais itens complementares NÃO estão inclusos no valor da locação e deverão ser adquiridos separadamente pela LOCATÁRIA.\n\nA LOCADORA disponibiliza tais itens por preço de mercado, com condições facilitadas de pagamento, mediante orçamento específico.',
    templateIds: ['locacao'],
  },
  {
    id: 'loc-short',
    title: 'Condições de uso do equipamento locado (versão resumida)',
    description: 'O equipamento deverá ser instalado, operado, higienizado e conservado pela LOCATÁRIA em estrita conformidade com o manual do equipamento, manual do fabricante, etiquetas técnicas e orientações formais da LOCADORA. A LOCATÁRIA será responsável por garantir infraestrutura adequada, uso correto, limpeza diária, utilização de insumos compatíveis, guarda do equipamento e comunicação imediata de falhas.\n\nDanos, falhas ou custos decorrentes de mau uso, limpeza inadequada, infraestrutura incompatível, variação elétrica, água fora dos padrões recomendados, uso de produtos ou insumos não autorizados, intervenção de terceiros, movimentação indevida ou descumprimento do manual do equipamento serão de responsabilidade da LOCATÁRIA, podendo ser cobrados separadamente pela LOCADORA mediante laudo técnico.\n\nAo final da locação, o equipamento deverá ser devolvido limpo, higienizado, completo, com seus acessórios e em bom estado de conservação, ressalvado o desgaste natural decorrente do uso regular conforme manual do equipamento.\n\nAcessórios, bandejas e itens de apoio não estão inclusos na locação e deverão ser adquiridos pela LOCATÁRIA por preço de mercado, com condições facilitadas de pagamento.',
    templateIds: ['locacao'],
  },
];

// Combina todos os termos padrão
const defaultTerms: SavedTermCondition[] = [
  ...generalTerms,
  ...preventivaTerms,
  ...manutencaoEletricaCivilTerms,
  ...coifaTerms,
  ...climatizacaoTerms,
  ...quimicosTerms,
  ...instalacaoTerms,
  ...rationalTerms,
  ...equipamentosTerms,
  ...locacaoTerms,
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
