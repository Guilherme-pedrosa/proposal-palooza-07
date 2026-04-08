export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  cnpj?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
  discountNote?: string;
  photoUrl?: string;
}

export interface TermCondition {
  id: string;
  title: string;
  description: string;
}

export interface ProposalImage {
  id: string;
  url: string;
  name: string;
}

export interface Proposal {
  id: string;
  number: string;
  createdAt: Date;
  validUntil: Date;
  client: Client;
  title: string;
  description: string;
  products: Product[];
  termsConditions: TermCondition[];
  images: ProposalImage[];
  totalValue: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  companyName: string;
  companyPhone: string;
  companyEmail?: string;
  templateId?: string;
  // Payment fields
  numParcelas?: number;
  taxaJuros?: number;
  formaPagamento?: string;
  formaPagamento2?: string;
  numParcelas2?: number;
  descontoAVista?: number;
  entradaPercent?: number;
  entradaPercent2?: number;
  taxaJurosCartao?: number;
  taxaJurosCartao2?: number;
}

export interface SavedTermCondition {
  id: string;
  title: string;
  description: string;
  templateIds: string[]; // IDs dos templates onde este termo aparece (vazio = todos)
}
