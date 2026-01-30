import { forwardRef } from 'react';
import { Proposal } from '@/types/proposal';
import { CompanySettings } from '@/types/company';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoWedoDefault from '@/assets/logo-wedo.png';

interface ProposalPreviewProps {
  proposal: Partial<Proposal>;
  company: CompanySettings;
}

export const ProposalPreview = forwardRef<HTMLDivElement, ProposalPreviewProps>(
  ({ proposal, company }, ref) => {
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
    const companyLogo = company.logo || logoWedoDefault;
    
    // Check template type for conditional rendering
    const isPreventiva = proposal.templateId === 'preventiva' || !proposal.templateId;
    const isCoifa = proposal.templateId === 'coifa';
    const isQuimicos = proposal.templateId === 'quimicos';
    const isInstalacao = proposal.templateId === 'instalacao';

    return (
      <div
        ref={ref}
        className="bg-white text-foreground proposal-preview"
        style={{ width: '210mm' }}
      >
        {/* Cover Page */}
        <div className="relative overflow-hidden pdf-page" style={{ backgroundColor: '#1a1a1a', width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
          {/* Background with gradient overlay */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.6))' }} />
          
          {/* Content */}
          <div className="relative z-10 flex flex-col p-12 text-white" style={{ height: '297mm' }}>
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
                <p className="text-lg font-medium">{company.name}</p>
                <p style={{ color: '#9ca3af' }}>Tel: {company.phone}</p>
              </div>
              <div className="ml-auto bg-white rounded-lg p-2">
                <img 
                  src={companyLogo} 
                  alt={company.name}
                  className="h-14 w-auto object-contain"
                />
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute bottom-0 right-0 h-48 w-48" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
            <div className="absolute bottom-0 right-24 h-32 w-32" style={{ backgroundColor: '#16a34a', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
          </div>
        </div>

        {/* Company Presentation Page - O que nos move */}
        <div className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
          {/* Logo no topo */}
          <div className="absolute top-8 right-12">
            <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
          </div>

          <h2 className="mb-2 text-3xl font-bold" style={{ color: '#111827' }}>O que nos move?</h2>
          <p className="mb-12" style={{ color: '#4b5563' }}>Acreditamos em nossa missão e respeitamos os nossos valores.</p>

          <div className="grid grid-cols-1 gap-8">
            {/* Visão */}
            <div className="rounded-lg p-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#15803d' }}>Visão</h3>
              <p style={{ color: '#374151' }}>{company.vision}</p>
            </div>

            {/* Missão */}
            <div className="rounded-lg p-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#15803d' }}>Missão</h3>
              <p style={{ color: '#374151' }}>{company.mission}</p>
            </div>

            {/* Valores */}
            <div className="rounded-lg p-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#15803d' }}>Valores</h3>
              <div className="grid grid-cols-2 gap-2">
                {company.values.map((value, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                    <span style={{ color: '#374151' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Principais Clientes */}
          {company.clients && company.clients.length > 0 && (
            <div className="mt-12">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#111827' }}>Principais Clientes</h3>
              <div className="grid grid-cols-3 gap-6">
                {company.clients.map((client) => (
                  <div 
                    key={client.id} 
                    className="flex items-center justify-center rounded-lg p-4 h-20"
                    style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                  >
                    {client.logo ? (
                      <img 
                        src={client.logo} 
                        alt={client.name} 
                        className="max-h-14 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-sm font-medium" style={{ color: '#6b7280' }}>{client.name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Principais Marcas */}
          {company.brands && company.brands.length > 0 && (
            <div className="mt-12">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#111827' }}>Marcas que Trabalhamos</h3>
              <div className="grid grid-cols-3 gap-6">
                {company.brands.map((brand) => (
                  <div 
                    key={brand.id} 
                    className="flex items-center justify-center rounded-lg p-4 h-20"
                    style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                  >
                    {brand.logo ? (
                      <img 
                        src={brand.logo} 
                        alt={brand.name} 
                        className="max-h-14 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-sm font-medium" style={{ color: '#6b7280' }}>{brand.name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Page number and decorative elements */}
          <div className="absolute bottom-8 left-12 text-sm" style={{ color: '#9ca3af' }}>
            {proposal.number} de {formatDate(proposal.createdAt as Date)}
          </div>
          <div className="absolute bottom-0 right-0 h-32 w-32" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
          <div className="absolute bottom-0 right-16 h-20 w-20" style={{ backgroundColor: '#16a34a', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
        </div>

        {/* Preventiva-specific sections */}
        {isPreventiva && (
          <>
            {/* Objectives Page - Objetivos da Manutenção Preventiva */}
            <div className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
          {/* Logo no topo */}
          <div className="absolute top-8 right-12">
            <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
          </div>

          <h2 className="mb-2 text-3xl font-bold" style={{ color: '#111827' }}>Objetivos da Manutenção Preventiva</h2>
          <p className="mb-8" style={{ color: '#4b5563' }}>
            Nossa manutenção preventiva garante que todos os seus equipamentos operem no máximo desempenho, com segurança e durabilidade.
          </p>

          <div className="grid grid-cols-1 gap-6">
            <div className="rounded-lg p-6" style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f59e0b' }}>
                  <span className="text-white font-bold text-lg">1</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#92400e' }}>Evitar Paradas Imprevistas</h3>
                  <p style={{ color: '#78350f' }}>Eliminamos interrupções operacionais que podem comprometer seu serviço e gerar prejuízos financeiros significativos.</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-6" style={{ backgroundColor: '#dcfce7', border: '1px solid #bbf7d0' }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#22c55e' }}>
                  <span className="text-white font-bold text-lg">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#166534' }}>Reduzir Custos com Reparos</h3>
                  <p style={{ color: '#15803d' }}>Prevenir falhas é muito mais econômico do que realizar reparos emergenciais ou substituir equipamentos prematuramente.</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-6" style={{ backgroundColor: '#dbeafe', border: '1px solid #bfdbfe' }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#3b82f6' }}>
                  <span className="text-white font-bold text-lg">3</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#1e40af' }}>Garantir Conformidade Técnica</h3>
                  <p style={{ color: '#1d4ed8' }}>Mantemos seus equipamentos em conformidade com as normas NR10, NR12 e ABNT, evitando problemas legais e garantindo a segurança.</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-6" style={{ backgroundColor: '#f3e8ff', border: '1px solid #e9d5ff' }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#a855f7' }}>
                  <span className="text-white font-bold text-lg">4</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#6b21a8' }}>Preservar Investimentos</h3>
                  <p style={{ color: '#7e22ce' }}>Prolongamos a vida útil dos seus equipamentos, protegendo seu investimento e maximizando o retorno.</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-6" style={{ backgroundColor: '#fce7f3', border: '1px solid #fbcfe8' }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ec4899' }}>
                  <span className="text-white font-bold text-lg">5</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#9d174d' }}>Assegurar Qualidade Alimentar</h3>
                  <p style={{ color: '#be185d' }}>Garantimos que seus equipamentos mantenham condições ideais para a produção segura e de alta qualidade dos alimentos.</p>
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

        {/* Equipment Details Page - Detalhamento por Equipamento */}
        <div className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
          {/* Logo no topo */}
          <div className="absolute top-8 right-12">
            <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
          </div>

          <h2 className="mb-2 text-3xl font-bold" style={{ color: '#111827' }}>Nossa Abordagem por Equipamento</h2>
          <p className="mb-6" style={{ color: '#4b5563' }}>
            Desenvolvemos protocolos específicos para cada categoria de equipamento, garantindo que nenhum detalhe seja negligenciado.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Fogões Industriais */}
            <div className="rounded-lg p-4" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
              <h3 className="text-base font-bold mb-2" style={{ color: '#c2410c' }}>🔥 Fogões Industriais</h3>
              <ul className="text-xs space-y-1" style={{ color: '#9a3412' }}>
                <li>• Verificação de mangueiras, regulador e válvulas</li>
                <li>• Limpeza e descarbonização dos queimadores</li>
                <li>• Calibração de bicos injetores</li>
                <li>• Tratamento antiferrugem</li>
              </ul>
            </div>

            {/* Sistemas de Refrigeração */}
            <div className="rounded-lg p-4" style={{ backgroundColor: '#ecfeff', border: '1px solid #a5f3fc' }}>
              <h3 className="text-base font-bold mb-2" style={{ color: '#0e7490' }}>❄️ Refrigeração</h3>
              <ul className="text-xs space-y-1" style={{ color: '#155e75' }}>
                <li>• Ajuste de portas e borrachas de vedação</li>
                <li>• Higienização de condensadora e evaporadora</li>
                <li>• Verificação de controlador e sensores</li>
                <li>• Medição de corrente do compressor</li>
              </ul>
            </div>

            {/* Câmaras Frias */}
            <div className="rounded-lg p-4" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
              <h3 className="text-base font-bold mb-2" style={{ color: '#0369a1' }}>🧊 Câmaras Frias</h3>
              <ul className="text-xs space-y-1" style={{ color: '#0c4a6e' }}>
                <li>• Limpeza e desobstrução de componentes</li>
                <li>• Verificação de pressostatos e degelo</li>
                <li>• Teste de sistemas de alarme</li>
                <li>• Avaliação de vedação de painéis</li>
              </ul>
            </div>

            {/* Lava-Louças */}
            <div className="rounded-lg p-4" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <h3 className="text-base font-bold mb-2" style={{ color: '#15803d' }}>🍽️ Lava-Louças</h3>
              <ul className="text-xs space-y-1" style={{ color: '#166534' }}>
                <li>• Inspeção visual de corrosão e nivelamento</li>
                <li>• Testes elétricos e de placas eletrônicas</li>
                <li>• Limpeza de braços e filtros</li>
                <li>• Verificação de sensores de segurança</li>
              </ul>
            </div>

            {/* Fornos e Estufas */}
            <div className="rounded-lg p-4" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <h3 className="text-base font-bold mb-2" style={{ color: '#b91c1c' }}>🔥 Fornos e Estufas</h3>
              <ul className="text-xs space-y-1" style={{ color: '#991b1b' }}>
                <li>• Teste de resistências e termostatos</li>
                <li>• Verificação de fiação e isolamento</li>
                <li>• Limpeza técnica especializada</li>
                <li>• Ajuste de sistemas de segurança</li>
              </ul>
            </div>

            {/* Equipamentos de Bancada */}
            <div className="rounded-lg p-4" style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}>
              <h3 className="text-base font-bold mb-2" style={{ color: '#7e22ce' }}>🔧 Equipamentos de Bancada</h3>
              <ul className="text-xs space-y-1" style={{ color: '#6b21a8' }}>
                <li>• Verificação elétrica completa</li>
                <li>• Lubrificação de partes móveis</li>
                <li>• Ajuste de correias e retentores</li>
                <li>• Revisão de controles e comandos</li>
              </ul>
            </div>
          </div>

          {/* Approach Summary */}
          <div className="mt-6 rounded-lg p-4" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>✓</p>
                <p className="text-xs font-medium" style={{ color: '#374151' }}>Checklists Técnicos</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>Protocolos específicos</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>✓</p>
                <p className="text-xs font-medium" style={{ color: '#374151' }}>Inspeção Minuciosa</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>Identificação precoce</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>✓</p>
                <p className="text-xs font-medium" style={{ color: '#374151' }}>Ajustes Preventivos</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>Calibrações precisas</p>
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

        {/* Results Page - Resultados Comprovados */}
        <div className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
          {/* Logo no topo */}
          <div className="absolute top-8 right-12">
            <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
          </div>

          <h2 className="mb-2 text-3xl font-bold" style={{ color: '#111827' }}>Resultados Comprovados</h2>
          <p className="mb-8" style={{ color: '#4b5563' }}>
            Nosso programa de manutenção preventiva demonstra resultados significativos em clientes reais.
          </p>

          {/* Main Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="rounded-lg p-6 text-center" style={{ backgroundColor: '#dcfce7', border: '1px solid #bbf7d0' }}>
              <p className="text-4xl font-bold" style={{ color: '#15803d' }}>76,2%</p>
              <p className="text-sm font-medium mt-2" style={{ color: '#166534' }}>Redução de Custos</p>
              <p className="text-xs mt-1" style={{ color: '#22c55e' }}>em manutenção</p>
            </div>
            <div className="rounded-lg p-6 text-center" style={{ backgroundColor: '#dbeafe', border: '1px solid #bfdbfe' }}>
              <p className="text-4xl font-bold" style={{ color: '#1d4ed8' }}>68%</p>
              <p className="text-sm font-medium mt-2" style={{ color: '#1e40af' }}>Menos Emergências</p>
              <p className="text-xs mt-1" style={{ color: '#3b82f6' }}>chamados urgentes</p>
            </div>
            <div className="rounded-lg p-6 text-center" style={{ backgroundColor: '#f3e8ff', border: '1px solid #e9d5ff' }}>
              <p className="text-4xl font-bold" style={{ color: '#7e22ce' }}>+35%</p>
              <p className="text-sm font-medium mt-2" style={{ color: '#6b21a8' }}>Vida Útil</p>
              <p className="text-xs mt-1" style={{ color: '#a855f7' }}>dos equipamentos</p>
            </div>
          </div>

          {/* Case Study */}
          <div className="rounded-lg p-6 mb-8" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>📊 Case de Sucesso: Rede de Restaurantes</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#374151' }}>Evolução do Programa:</p>
                <ul className="text-sm space-y-2" style={{ color: '#4b5563' }}>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                    <span><strong>Fase Reativa:</strong> Custos de R$ 9.198/mês</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                    <span><strong>Fase Transição:</strong> Custos de R$ 5.812/mês</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                    <span><strong>Fase Consolidada:</strong> Custos de R$ 2.191/mês</span>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#374151' }}>Resultados da Rede:</p>
                <ul className="text-sm space-y-2" style={{ color: '#4b5563' }}>
                  <li>• 6 restaurantes atendidos</li>
                  <li>• R$ 9.604 de economia mensal</li>
                  <li>• 118 serviços contratuais executados</li>
                  <li>• 32,6% das operações preventivas</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Benefits Beyond Savings */}
          <div className="rounded-lg p-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#15803d' }}>✨ Benefícios Além da Economia</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: '#22c55e' }}>
                  <span className="text-white text-xl">📈</span>
                </div>
                <p className="text-sm font-medium" style={{ color: '#166534' }}>Previsibilidade Financeira</p>
                <p className="text-xs mt-1" style={{ color: '#15803d' }}>Custos fixos e planejáveis</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: '#22c55e' }}>
                  <span className="text-white text-xl">⚡</span>
                </div>
                <p className="text-sm font-medium" style={{ color: '#166534' }}>Menos Emergências</p>
                <p className="text-xs mt-1" style={{ color: '#15803d' }}>Operação sem interrupções</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: '#22c55e' }}>
                  <span className="text-white text-xl">🔧</span>
                </div>
                <p className="text-sm font-medium" style={{ color: '#166534' }}>Maior Durabilidade</p>
                <p className="text-xs mt-1" style={{ color: '#15803d' }}>Equipamentos duradouros</p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm italic text-center" style={{ color: '#6b7280' }}>
            "A estabilidade financeira proporcionada pelo programa nos permitiu realocar recursos antes destinados a contingências para investimentos em expansão."
          </p>

          {/* Page number and decorative elements */}
          <div className="absolute bottom-8 left-12 text-sm" style={{ color: '#9ca3af' }}>
            {proposal.number} de {formatDate(proposal.createdAt as Date)}
          </div>
          <div className="absolute bottom-0 right-0 h-32 w-32" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
          <div className="absolute bottom-0 right-16 h-20 w-20" style={{ backgroundColor: '#16a34a', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
          </div>
          </>
        )}

        {/* Proposal Details Page */}
        {proposal.title && (
          <div className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
            {/* Logo no topo */}
            <div className="absolute top-8 right-12">
              <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
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
          <div className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
            {/* Logo no topo */}
            <div className="absolute top-8 right-12">
              <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
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
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: '#374151' }}>Desconto</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: '#374151' }}>Valor total</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.products.map((product, index) => (
                    <tr key={product.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                      <td className="px-4 py-4">
                        <p className="font-medium" style={{ color: '#111827' }}>{product.name}</p>
                        <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>{product.description}</p>
                        {product.discountNote && (
                          <p className="mt-1 text-xs italic" style={{ color: '#9ca3af' }}>* {product.discountNote}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-sm" style={{ color: '#4b5563' }}>{product.unit}</td>
                      <td className="px-4 py-4 text-center text-sm" style={{ color: '#4b5563' }}>
                        {product.quantity.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-4 text-right text-sm" style={{ color: '#4b5563' }}>
                        {formatCurrency(product.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm" style={{ color: product.discount ? '#dc2626' : '#4b5563' }}>
                        {product.discount ? `-${formatCurrency(product.discount)}` : '-'}
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
          <div className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
            {/* Logo no topo */}
            <div className="absolute top-8 right-12">
              <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
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
          <div className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
            {/* Logo no topo */}
            <div className="absolute top-8 right-12">
              <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
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
        <div className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakInside: 'avoid' }}>
          {/* Logo no topo */}
          <div className="absolute top-8 right-12">
            <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
          </div>

          <div className="mt-24">
            <p className="text-lg leading-relaxed" style={{ color: '#374151' }}>
              Estando de acordo com os produtos, valores e termos relatados nesta proposta e por estarem assim justos e contratados, 
              <strong> {company.name}</strong> e o(a) <strong>{proposal.client?.name || 'Cliente'}</strong> firmam a proposta.
            </p>

            <div className="mt-16 grid grid-cols-2 gap-12">
              <div className="text-center">
                <div className="border-t pt-4" style={{ borderColor: '#374151' }}>
                  <p className="font-medium" style={{ color: '#111827' }}>{company.name}</p>
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
                {company.name} - {company.cnpj}
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
