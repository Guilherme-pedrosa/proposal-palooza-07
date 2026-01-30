import { forwardRef } from 'react';
import { Proposal } from '@/types/proposal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoWedo from '@/assets/logo-wedo.png';
import logoWedoWhite from '@/assets/logo-wedo-white.png';

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
        <div className="relative min-h-[297mm] overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
          {/* Background with gradient overlay */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.6))' }} />
          
          {/* Content */}
          <div className="relative z-10 flex min-h-[297mm] flex-col p-12 text-white">
            {/* Title */}
            <div className="mb-8">
              <h1 className="text-5xl font-bold tracking-tight">Proposta</h1>
              <h1 className="text-5xl font-bold tracking-tight">Comercial</h1>
            </div>

            {/* Info */}
            <div className="mb-auto space-y-4">
              <p className="text-lg" style={{ color: '#d1d5db' }}>
                A seguinte proposta comercial foi elaborada em {formatDate(proposal.createdAt as Date)} para{' '}
                <span className="font-semibold text-white">{proposal.client?.name || 'Cliente'}</span>.
              </p>
              <p style={{ color: '#d1d5db' }}>
                A proposta é válida até {formatDate(proposal.validUntil as Date)}.
              </p>
              <p style={{ color: '#d1d5db' }}>
                Número da proposta <span className="font-semibold">{proposal.number || 'P0000'}</span>.
              </p>
            </div>

            {/* Company info with logo */}
            <div className="mt-auto flex items-center gap-4">
              <div>
                <p className="text-lg font-medium">{proposal.companyName || 'WeDo Cozinhas'}</p>
                <p style={{ color: '#9ca3af' }}>Tel: {proposal.companyPhone || '(62) 99446-6458'}</p>
              </div>
              <img 
                src={logoWedo} 
                alt="Logo WeDo" 
                className="h-16 w-auto ml-auto bg-white rounded-lg p-2"
              />
            </div>

            {/* Decorative elements */}
            <div className="absolute bottom-0 right-0 h-48 w-48" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
            <div className="absolute bottom-0 right-24 h-32 w-32" style={{ backgroundColor: '#16a34a', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
          </div>
        </div>

        {/* Company Presentation Page - O que nos move */}
        <div className="relative min-h-[297mm] bg-white p-12">
          {/* Logo no topo */}
          <div className="absolute top-8 right-12">
            <img src={logoWedo} alt="Logo WeDo" className="h-12 w-auto" />
          </div>

          <h2 className="mb-2 text-3xl font-bold" style={{ color: '#111827' }}>O que nos move?</h2>
          <p className="mb-12" style={{ color: '#4b5563' }}>Acreditamos em nossa missão e respeitamos os nossos valores.</p>

          <div className="grid grid-cols-1 gap-8">
            {/* Visão */}
            <div className="rounded-lg p-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#15803d' }}>Visão</h3>
              <p style={{ color: '#374151' }}>
                Ser reconhecida na esfera nacional e internacional como uma empresa de excelência, qualidade e preço justo, em todas as áreas de atuação.
              </p>
            </div>

            {/* Missão */}
            <div className="rounded-lg p-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#15803d' }}>Missão</h3>
              <p style={{ color: '#374151' }}>
                Dar suporte nas fases essenciais da cadeia de suprimento dos clientes, prestando serviços de qualidade para resolução de problemas adequados à realidade do processo no qual estivermos inseridos.
              </p>
            </div>

            {/* Valores */}
            <div className="rounded-lg p-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#15803d' }}>Valores</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                  <span style={{ color: '#374151' }}>Segurança</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                  <span style={{ color: '#374151' }}>Pessoas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                  <span style={{ color: '#374151' }}>Meio Ambiente</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                  <span style={{ color: '#374151' }}>Qualidade</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                  <span style={{ color: '#374151' }}>Foco no cliente</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                  <span style={{ color: '#374151' }}>Melhoria Contínua</span>
                </div>
              </div>
            </div>
          </div>

          {/* Page number and decorative elements */}
          <div className="absolute bottom-8 left-12 text-sm" style={{ color: '#9ca3af' }}>
            {proposal.number} de {formatDate(proposal.createdAt as Date)}
          </div>
          <div className="absolute bottom-0 right-0 h-32 w-32" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
          <div className="absolute bottom-0 right-16 h-20 w-20" style={{ backgroundColor: '#16a34a', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
        </div>

        {/* Proposal Details Page */}
        {proposal.title && (
          <div className="relative min-h-[297mm] bg-white p-12">
            {/* Logo no topo */}
            <div className="absolute top-8 right-12">
              <img src={logoWedo} alt="Logo WeDo" className="h-12 w-auto" />
            </div>

            <h2 className="mb-2 text-3xl font-bold" style={{ color: '#111827' }}>Detalhes da proposta</h2>
            
            <div className="mt-8 rounded-lg p-8" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#15803d' }}>{proposal.title}</h3>
              {proposal.description && (
                <p className="text-lg leading-relaxed" style={{ color: '#374151' }}>
                  {proposal.description}
                </p>
              )}
              
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid #e5e7eb' }}>
                <p className="text-sm" style={{ color: '#6b7280' }}>
                  Incluso gestão via plataforma própria, atendimento emergencial com SLA, fornecimento de EPIs e software.
                </p>
              </div>
            </div>

            {/* Page number and decorative elements */}
            <div className="absolute bottom-8 left-12 text-sm" style={{ color: '#9ca3af' }}>
              {proposal.number} de {formatDate(proposal.createdAt as Date)}
            </div>
            <div className="absolute bottom-0 right-0 h-32 w-32" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
            <div className="absolute bottom-0 right-16 h-20 w-20" style={{ backgroundColor: '#16a34a', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
          </div>
        )}

        {/* Products Page */}
        {proposal.products && proposal.products.length > 0 && (
          <div className="relative min-h-[297mm] bg-white p-12">
            {/* Logo no topo */}
            <div className="absolute top-8 right-12">
              <img src={logoWedo} alt="Logo WeDo" className="h-12 w-auto" />
            </div>

            <h2 className="mb-2 text-3xl font-bold" style={{ color: '#111827' }}>Os produtos</h2>
            <p className="mb-8" style={{ color: '#4b5563' }}>Lista de produtos orçados nesta proposta comercial.</p>

            {/* Products Table */}
            <div className="overflow-hidden rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#374151' }}>Produto</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: '#374151' }}>Unid.</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: '#374151' }}>Qtde</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: '#374151' }}>Valor unitário</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: '#374151' }}>Valor total</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.products.map((product, index) => (
                    <tr key={product.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                      <td className="px-4 py-4">
                        <p className="font-medium" style={{ color: '#111827' }}>{product.name}</p>
                        <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>{product.description}</p>
                      </td>
                      <td className="px-4 py-4 text-center text-sm" style={{ color: '#4b5563' }}>{product.unit}</td>
                      <td className="px-4 py-4 text-center text-sm" style={{ color: '#4b5563' }}>
                        {product.quantity.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-4 text-right text-sm" style={{ color: '#4b5563' }}>
                        {formatCurrency(product.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium" style={{ color: '#111827' }}>
                        {formatCurrency(product.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="mt-6 flex justify-end pt-6" style={{ borderTop: '1px solid #e5e7eb' }}>
              <div className="text-right">
                <p className="text-sm" style={{ color: '#4b5563' }}>Valor total da proposta:</p>
                <p className="text-3xl font-bold" style={{ color: '#15803d' }}>{formatCurrency(totalValue)}</p>
              </div>
            </div>

            {/* Page number and decorative elements */}
            <div className="absolute bottom-8 left-12 text-sm" style={{ color: '#9ca3af' }}>
              {proposal.number} de {formatDate(proposal.createdAt as Date)}
            </div>
            <div className="absolute bottom-0 right-0 h-32 w-32" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
            <div className="absolute bottom-0 right-16 h-20 w-20" style={{ backgroundColor: '#16a34a', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
          </div>
        )}

        {/* Terms and Conditions Page */}
        {proposal.termsConditions && proposal.termsConditions.length > 0 && (
          <div className="relative min-h-[297mm] bg-white p-12">
            {/* Logo no topo */}
            <div className="absolute top-8 right-12">
              <img src={logoWedo} alt="Logo WeDo" className="h-12 w-auto" />
            </div>

            <h2 className="mb-2 text-3xl font-bold" style={{ color: '#111827' }}>Termos e Condições</h2>
            <p className="mb-8" style={{ color: '#4b5563' }}>
              Os dados abaixo descrevem os termos e condições para fornecimento dos produtos e serviços descritos nesta proposta comercial.
            </p>

            {/* Terms Table */}
            <div className="overflow-hidden rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#374151', width: '30%' }}>Item</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#374151' }}>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.termsConditions.map((term, index) => (
                    <tr key={term.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                      <td className="px-4 py-4 font-medium align-top" style={{ color: '#111827' }}>{term.title}</td>
                      <td className="px-4 py-4" style={{ color: '#4b5563' }}>{term.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Decorative elements */}
            <div className="absolute bottom-0 right-0 h-32 w-32" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
            <div className="absolute bottom-0 right-16 h-20 w-20" style={{ backgroundColor: '#16a34a', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
          </div>
        )}

        {/* Images Page */}
        {proposal.images && proposal.images.length > 0 && (
          <div className="relative min-h-[297mm] bg-white p-12">
            {/* Logo no topo */}
            <div className="absolute top-8 right-12">
              <img src={logoWedo} alt="Logo WeDo" className="h-12 w-auto" />
            </div>

            <h2 className="mb-2 text-3xl font-bold" style={{ color: '#111827' }}>Anexos</h2>
            <p className="mb-8" style={{ color: '#4b5563' }}>Imagens relacionadas a esta proposta comercial.</p>

            <div className="grid grid-cols-2 gap-6">
              {proposal.images.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
                  <img
                    src={image.url}
                    alt={image.name}
                    className="h-48 w-full object-cover"
                  />
                  <div className="px-4 py-2" style={{ backgroundColor: '#f9fafb' }}>
                    <p className="text-sm" style={{ color: '#4b5563' }}>{image.name}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Decorative elements */}
            <div className="absolute bottom-0 right-0 h-32 w-32" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
            <div className="absolute bottom-0 right-16 h-20 w-20" style={{ backgroundColor: '#16a34a', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
          </div>
        )}

        {/* Signature Page */}
        <div className="relative min-h-[297mm] bg-white p-12">
          {/* Logo no topo */}
          <div className="absolute top-8 right-12">
            <img src={logoWedo} alt="Logo WeDo" className="h-12 w-auto" />
          </div>

          <div className="mt-24">
            <p className="text-lg leading-relaxed" style={{ color: '#374151' }}>
              Estando de acordo com os produtos, valores e termos relatados nesta proposta e por estarem assim justos e contratados, 
              <strong> {proposal.companyName || 'WeDo Cozinhas'}</strong> e o(a) <strong>{proposal.client?.name || 'Cliente'}</strong> firmam a proposta.
            </p>

            <div className="mt-16 grid grid-cols-2 gap-12">
              <div className="text-center">
                <div className="border-t pt-4" style={{ borderColor: '#374151' }}>
                  <p className="font-medium" style={{ color: '#111827' }}>{proposal.companyName || 'WeDo Cozinhas'}</p>
                  <p className="text-sm" style={{ color: '#6b7280' }}>Contratada</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t pt-4" style={{ borderColor: '#374151' }}>
                  <p className="font-medium" style={{ color: '#111827' }}>{proposal.client?.name || 'Cliente'}</p>
                  <p className="text-sm" style={{ color: '#6b7280' }}>Contratante</p>
                </div>
              </div>
            </div>

            <div className="mt-16 text-center">
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                WD Comércio e Importação Ltda - 43.572.954/0001-81
              </p>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute bottom-0 right-0 h-32 w-32" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
          <div className="absolute bottom-0 right-16 h-20 w-20" style={{ backgroundColor: '#16a34a', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
        </div>
      </div>
    );
  }
);

ProposalPreview.displayName = 'ProposalPreview';
