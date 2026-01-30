import { forwardRef } from 'react';
import { Proposal } from '@/types/proposal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProposalPreviewProps {
  proposal: Partial<Proposal>;
}

export const ProposalPreview = forwardRef<HTMLDivElement, ProposalPreviewProps>(
  ({ proposal }, ref) => {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    const formatDate = (date: Date | undefined) => {
      if (!date) return '--/--/----';
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    };

    const totalValue = proposal.products?.reduce((sum, p) => sum + p.totalPrice, 0) || 0;

    return (
      <div
        ref={ref}
        className="bg-white text-foreground"
        style={{ width: '210mm', minHeight: '297mm' }}
      >
        {/* Cover Page */}
        <div className="relative min-h-[297mm] overflow-hidden bg-[#1a1a1a]">
          {/* Background with gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
          
          {/* Content */}
          <div className="relative z-10 flex min-h-[297mm] flex-col p-12 text-white">
            {/* Title */}
            <div className="mb-8">
              <h1 className="text-5xl font-bold tracking-tight">Proposta</h1>
              <h1 className="text-5xl font-bold tracking-tight">Comercial</h1>
            </div>

            {/* Info */}
            <div className="mb-auto space-y-4">
              <p className="text-lg text-gray-300">
                A seguinte proposta comercial foi elaborada em {formatDate(proposal.createdAt as Date)} para{' '}
                <span className="font-semibold text-white">{proposal.client?.name || 'Cliente'}</span>.
              </p>
              <p className="text-gray-300">
                A proposta é válida até {formatDate(proposal.validUntil as Date)}.
              </p>
              <p className="text-gray-300">
                Número da proposta <span className="font-semibold">{proposal.number || 'P0000'}</span>.
              </p>
            </div>

            {/* Company info */}
            <div className="mt-auto">
              <p className="text-lg font-medium">{proposal.companyName || 'Sua Empresa'}</p>
              <p className="text-gray-400">Tel: {proposal.companyPhone || '(00) 00000-0000'}</p>
            </div>

            {/* Decorative elements */}
            <div className="absolute bottom-0 right-0 h-48 w-48 bg-emerald-500 opacity-90" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
            <div className="absolute bottom-0 right-24 h-32 w-32 bg-emerald-600 opacity-90" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
          </div>
        </div>

        {/* Products Page */}
        {proposal.products && proposal.products.length > 0 && (
          <div className="relative min-h-[297mm] bg-white p-12">
            <h2 className="mb-2 text-3xl font-bold text-gray-900">Os produtos</h2>
            <p className="mb-8 text-gray-600">Lista de produtos orçados nesta proposta comercial.</p>

            {/* Products Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Produto</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Unid.</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Qtde</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor unitário</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor total</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.products.map((product, index) => (
                    <tr key={product.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="mt-1 text-sm text-gray-500">{product.description}</p>
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-gray-600">{product.unit}</td>
                      <td className="px-4 py-4 text-center text-sm text-gray-600">
                        {product.quantity.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-600">
                        {formatCurrency(product.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(product.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="mt-6 flex justify-end border-t border-gray-200 pt-6">
              <div className="text-right">
                <p className="text-sm text-gray-600">Valor total da proposta:</p>
                <p className="text-3xl font-bold text-emerald-700">{formatCurrency(totalValue)}</p>
              </div>
            </div>

            {/* Page number and decorative elements */}
            <div className="absolute bottom-8 left-12 text-sm text-gray-400">
              {proposal.number} de {formatDate(proposal.createdAt as Date)}
            </div>
            <div className="absolute bottom-0 right-0 h-32 w-32 bg-emerald-500 opacity-90" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
            <div className="absolute bottom-0 right-16 h-20 w-20 bg-emerald-600 opacity-90" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
          </div>
        )}

        {/* Terms and Conditions Page */}
        {proposal.termsConditions && proposal.termsConditions.length > 0 && (
          <div className="relative min-h-[297mm] bg-white p-12">
            <h2 className="mb-2 text-3xl font-bold text-gray-900">Termos e Condições</h2>
            <p className="mb-8 text-gray-600">
              Os dados abaixo descrevem os termos e condições para fornecimento dos produtos e serviços descritos nesta proposta comercial.
            </p>

            {/* Terms Table */}
            <div className="space-y-4">
              {proposal.termsConditions.map((term) => (
                <div key={term.id} className="border-b border-gray-200 pb-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="font-medium text-gray-900">{term.title}</div>
                    <div className="col-span-2 text-gray-600">{term.description}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Decorative elements */}
            <div className="absolute bottom-0 right-0 h-32 w-32 bg-emerald-500 opacity-90" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
            <div className="absolute bottom-0 right-16 h-20 w-20 bg-emerald-600 opacity-90" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
          </div>
        )}

        {/* Images Page */}
        {proposal.images && proposal.images.length > 0 && (
          <div className="relative min-h-[297mm] bg-white p-12">
            <h2 className="mb-2 text-3xl font-bold text-gray-900">Anexos</h2>
            <p className="mb-8 text-gray-600">Imagens relacionadas a esta proposta comercial.</p>

            <div className="grid grid-cols-2 gap-6">
              {proposal.images.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-lg border border-gray-200">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="h-48 w-full object-cover"
                  />
                  <div className="bg-gray-50 px-4 py-2">
                    <p className="text-sm text-gray-600">{image.name}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Decorative elements */}
            <div className="absolute bottom-0 right-0 h-32 w-32 bg-emerald-500 opacity-90" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
            <div className="absolute bottom-0 right-16 h-20 w-20 bg-emerald-600 opacity-90" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
          </div>
        )}
      </div>
    );
  }
);

ProposalPreview.displayName = 'ProposalPreview';
