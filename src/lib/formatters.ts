import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatBRL = (valor: number | null | undefined): string => {
  if (valor === null || valor === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

export const formatData = (data: string | Date | null | undefined): string => {
  if (!data) return '—';
  return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
};

export const formatDataHora = (data: string | Date | null | undefined): string => {
  if (!data) return '—';
  return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

export const formatRelativo = (data: string | Date | null | undefined): string => {
  if (!data) return '—';
  return formatDistanceToNow(new Date(data), { addSuffix: true, locale: ptBR });
};

export const formatCNPJ = (cnpj: string): string => {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

export const formatTelefone = (tel: string): string => {
  const d = tel.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return tel;
};
