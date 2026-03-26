// ========== CRM WeDo - Tipos TypeScript ==========

export type PerfilUsuario = 'vendedor' | 'gestor' | 'admin';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  telefone?: string;
  avatar_url?: string;
  ativo: boolean;
  created_at: string;
}

export type TipoPessoa = 'PF' | 'PJ' | 'ES';
export type Porte = 'pequeno' | 'medio' | 'grande' | 'rede';

export interface ClienteGC {
  id: string;
  gc_id: string;
  tipo_pessoa?: TipoPessoa;
  nome: string;
  razao_social?: string;
  cnpj?: string;
  cpf?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  endereco?: string;
  segmento?: string;
  porte?: Porte;
  observacoes?: string;
  ativo: boolean;
  ultima_compra_gc?: string;
  total_compras_gc: number;
  gc_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export type TipoProduto = 'produto' | 'servico';

export interface ProdutoGC {
  id: string;
  gc_id: string;
  codigo?: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  tipo?: TipoProduto;
  preco_venda?: number;
  preco_locacao_mensal?: number;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
  foto_url?: string;
  fotos_urls: string[];
  ficha_tecnica_url?: string;
  destaque: boolean;
  ativo: boolean;
  gc_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export type EtapaOportunidade =
  | 'prospeccao'
  | 'qualificacao'
  | 'visita_tecnica'
  | 'proposta_enviada'
  | 'negociacao'
  | 'fechado_ganho'
  | 'fechado_perdido';

export type TipoVenda =
  | 'equipamento_novo'
  | 'locacao'
  | 'contrato_pcm'
  | 'manutencao_avulsa'
  | 'higienizacao_coifa'
  | 'quimicos'
  | 'instalacao'
  | 'treinamento'
  | 'projeto_completo';

export type OrigemOportunidade =
  | 'indicacao'
  | 'visita_espontanea'
  | 'prospeccao_ativa'
  | 'inbound_site'
  | 'whatsapp'
  | 'email'
  | 'reativacao'
  | 'renovacao_contrato';

export type Temperatura = 'frio' | 'morno' | 'quente';

export interface Oportunidade {
  id: string;
  numero: number;
  titulo: string;
  cliente_id?: string;
  vendedor_id?: string;
  etapa: EtapaOportunidade;
  tipo_venda?: TipoVenda;
  valor_estimado: number;
  probabilidade: number;
  data_fechamento_prevista?: string;
  motivo_perda_id?: string;
  descricao_perda?: string;
  origem?: OrigemOportunidade;
  gc_orcamento_id?: string;
  gc_orcamento_url?: string;
  temperatura: Temperatura;
  produtos_interesse: string[];
  ultima_atividade_em?: string;
  checklist_etapa: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export type TipoAtividade =
  | 'ligacao'
  | 'visita_tecnica'
  | 'demo_produto'
  | 'envio_proposta'
  | 'followup'
  | 'email'
  | 'whatsapp'
  | 'reuniao_online'
  | 'tarefa'
  | 'nota';

export interface Atividade {
  id: string;
  oportunidade_id?: string;
  cliente_id?: string;
  vendedor_id?: string;
  tipo: TipoAtividade;
  titulo: string;
  descricao?: string;
  data_prevista?: string;
  data_realizada?: string;
  duracao_minutos?: number;
  resultado?: string;
  proxima_acao?: string;
  proxima_data?: string;
  concluida: boolean;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export type StatusProposta =
  | 'rascunho'
  | 'enviada'
  | 'visualizada'
  | 'aprovada'
  | 'recusada'
  | 'expirada'
  | 'cancelada';

export interface PropostaCRM {
  id: string;
  numero: string;
  versao: number;
  historico_versoes: any[];
  oportunidade_id?: string;
  cliente_id?: string;
  vendedor_id?: string;
  titulo: string;
  descricao?: string;
  template_id?: string;
  produtos: any[];
  termos_condicoes: any[];
  imagens: any[];
  valor_total: number;
  desconto_total: number;
  validade_dias: number;
  validade_ate?: string;
  status: StatusProposta;
  aberto_em?: string;
  aberto_por_ip?: string;
  aberto_contagem: number;
  link_publico_uuid: string;
  pdf_url?: string;
  gc_orcamento_id?: string;
  gc_orcamento_url?: string;
  observacoes_internas?: string;
  created_at: string;
  updated_at: string;
}

export interface Meta {
  id: string;
  vendedor_id?: string;
  mes: number;
  ano: number;
  meta_valor: number;
  meta_propostas: number;
  meta_visitas: number;
}

export interface MotivosPerda {
  id: string;
  descricao: string;
  ativo: boolean;
}

export type EntidadeSync = 'clientes' | 'produtos' | 'orcamento';
export type StatusSync = 'sucesso' | 'erro' | 'parcial';

export interface GcSyncLog {
  id: string;
  entidade: EntidadeSync;
  acao: string;
  gc_id?: string;
  status?: StatusSync;
  detalhes?: Record<string, any>;
  created_at: string;
}

// Labels helpers
export const etapaLabels: Record<EtapaOportunidade, string> = {
  prospeccao: 'Prospecção',
  qualificacao: 'Qualificação',
  visita_tecnica: 'Visita Técnica',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Negociação',
  fechado_ganho: 'Fechado (Ganho)',
  fechado_perdido: 'Fechado (Perdido)',
};

export const tipoVendaLabels: Record<TipoVenda, string> = {
  equipamento_novo: 'Equipamento Novo',
  locacao: 'Locação',
  contrato_pcm: 'Contrato PCM',
  manutencao_avulsa: 'Manutenção Avulsa',
  higienizacao_coifa: 'Higienização de Coifa',
  quimicos: 'Químicos',
  instalacao: 'Instalação',
  treinamento: 'Treinamento',
  projeto_completo: 'Projeto Completo',
};

export const statusPropostaLabels: Record<StatusProposta, string> = {
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  visualizada: 'Visualizada',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  expirada: 'Expirada',
  cancelada: 'Cancelada',
};
