import { forwardRef } from 'react';
import { Proposal } from '@/types/proposal';
import { CompanySettings } from '@/types/company';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoWedoDefault from '@/assets/logo-wedo.png';
import industrialKitchenBg from '@/assets/industrial-kitchen-bg.jpg';

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
        <div className="relative overflow-hidden pdf-page" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid', backgroundColor: '#0A1628' }}>
          {/* Background image — full page */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${industrialKitchenBg})`,
            }}
          />
          {/* Gradient overlay — navy top fading into semi-transparent bottom */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, #0A1628 0%, #0A1628 35%, rgba(10,22,40,0.6) 65%, rgba(10,22,40,0.45) 100%)',
          }} />

          {/* Decorative geometric accent — top right */}
          <div className="absolute" style={{ top: 0, right: 0, width: '200px', height: '200px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', border: '2px solid rgba(0,102,255,0.3)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', border: '1px solid rgba(0,102,255,0.15)', borderRadius: '50%' }} />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col" style={{ height: '297mm', padding: '80px 56px 48px 56px' }}>
            {/* Logo — top right */}
            <div className="flex justify-end" style={{ marginBottom: '60px' }}>
              <div className="bg-white rounded-lg p-3" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
                <img src={companyLogo} alt={company.name} className="h-12 w-auto object-contain" />
              </div>
            </div>

            {/* Title block */}
            <div style={{ marginTop: '20px' }}>
              {/* Electric blue accent line above title */}
              <div style={{ width: '64px', height: '4px', backgroundColor: '#0066FF', marginBottom: '28px', borderRadius: '2px' }} />

              <h1 style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: '68px', lineHeight: 1.08, color: '#ffffff', fontWeight: 700, letterSpacing: '-1px', marginBottom: '0' }}>
                Proposta
              </h1>
              <h1 style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: '68px', lineHeight: 1.08, color: '#ffffff', fontWeight: 700, letterSpacing: '-1px', marginBottom: '36px' }}>
                Comercial
              </h1>

              {/* Client name — with subtle card */}
              <div style={{ backgroundColor: 'rgba(0,102,255,0.12)', borderLeft: '3px solid #0066FF', padding: '16px 20px', borderRadius: '0 8px 8px 0', marginBottom: '24px', maxWidth: '85%' }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '4px' }}>
                  Elaborada para
                </p>
                <p style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, letterSpacing: '0.3px' }}>
                  {proposal.client?.name || '[NOME DO CLIENTE]'}
                </p>
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-6" style={{ marginTop: '8px' }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Data</p>
                  <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500 }}>{formatDate(proposal.createdAt as Date)}</p>
                </div>
                <div style={{ width: '1px', height: '32px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Proposta nº</p>
                  <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700 }}>{proposal.number || 'WDO-0000'}</p>
                </div>
              </div>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Bottom bar */}
            <div className="flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                {company.name} • {company.phone}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                {company.cnpj}
              </p>
            </div>
          </div>
        </div>

        {/* Company Presentation Page - Sobre a Empresa */}
        <div className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
          {/* Logo no topo */}
          <div className="absolute top-8 right-12">
            <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
          </div>

          {/* Header com linha decorativa */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-8 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
              <h2 className="text-2xl font-semibold tracking-tight" style={{ color: '#111827' }}>Sobre a WeDo</h2>
            </div>
          </div>

          {/* Texto institucional - layout editorial */}
          <div className="mb-6 pl-4" style={{ borderLeft: '2px solid #e5e7eb' }}>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#374151', lineHeight: '1.7' }}>
              A WeDo é uma empresa especializada em soluções técnicas para cozinhas profissionais, atuando na especificação, fornecimento e manutenção preventiva de equipamentos, com foco em <strong style={{ color: '#111827' }}>continuidade operacional</strong>, <strong style={{ color: '#111827' }}>controle de custos</strong> e <strong style={{ color: '#111827' }}>redução de riscos</strong>.
            </p>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#374151', lineHeight: '1.7' }}>
              Nossa atuação é baseada em programas estruturados de manutenção preventiva, com protocolos técnicos definidos por tipo de equipamento, gestão de ativos e acompanhamento contínuo da operação — permitindo a substituição do modelo corretivo reativo por um modelo <strong style={{ color: '#111827' }}>previsível, planejado e financeiramente controlado</strong>.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#374151', lineHeight: '1.7' }}>
              Com histórico comprovado de redução significativa de falhas, emergências e custos de manutenção, a WeDo se posiciona como <strong style={{ color: '#111827' }}>parceira técnica da operação</strong>, apoiando decisões, sustentando o desempenho dos equipamentos e garantindo previsibilidade ao longo de todo o ciclo operacional.
            </p>
          </div>

          {/* Separador sutil */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }}></div>
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9ca3af' }}>O que nos move</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }}></div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Visão */}
            <div className="rounded-lg p-4" style={{ backgroundColor: '#fafafa' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#111827' }}>Visão</h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#4b5563' }}>{company.vision}</p>
            </div>

            {/* Missão */}
            <div className="rounded-lg p-4" style={{ backgroundColor: '#fafafa' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#111827' }}>Missão</h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#4b5563' }}>{company.mission}</p>
            </div>

            {/* Valores */}
            <div className="rounded-lg p-4" style={{ backgroundColor: '#fafafa' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#111827' }}>Valores</h3>
              </div>
              <ul className="space-y-1">
                {company.values.map((value, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs" style={{ color: '#4b5563' }}>
                    <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#22c55e' }}></span>
                    <span>{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Page number and decorative elements */}
          <div className="absolute bottom-8 left-12 text-sm" style={{ color: '#9ca3af' }}>
            {proposal.number} de {formatDate(proposal.createdAt as Date)}
          </div>
          <div className="absolute bottom-0 right-0 h-32 w-32" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
          <div className="absolute bottom-0 right-16 h-20 w-20" style={{ backgroundColor: '#16a34a', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
        </div>

        {/* Clients & Brands Page - Separate page for better layout */}
        {((company.clients && company.clients.length > 0) || (company.brands && company.brands.length > 0)) && (
          <div className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
            {/* Logo no topo */}
            <div className="absolute top-8 right-12">
              <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
            </div>

            {/* Principais Clientes */}
            {company.clients && company.clients.length > 0 && (
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-6" style={{ color: '#111827' }}>Principais Clientes</h2>
                <div className="grid grid-cols-4 gap-4">
                  {company.clients.slice(0, 12).map((client) => (
                    <div 
                      key={client.id} 
                      className="flex items-center justify-center rounded-lg p-3 h-16"
                      style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                    >
                      {client.logo ? (
                        <img 
                          src={client.logo} 
                          alt={client.name} 
                          className="max-h-12 max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs font-medium text-center" style={{ color: '#6b7280' }}>{client.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Principais Marcas */}
            {company.brands && company.brands.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-6" style={{ color: '#111827' }}>Marcas que Trabalhamos</h2>
                <div className="grid grid-cols-4 gap-4">
                  {company.brands.slice(0, 12).map((brand) => (
                    <div 
                      key={brand.id} 
                      className="flex items-center justify-center rounded-lg p-3 h-16"
                      style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                    >
                      {brand.logo ? (
                        <img 
                          src={brand.logo} 
                          alt={brand.name} 
                          className="max-h-12 max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs font-medium text-center" style={{ color: '#6b7280' }}>{brand.name}</span>
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
        )}

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

          <div className="space-y-0">
            {/* Item 1 */}
            <div className="flex items-start gap-5 py-5" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef3c7' }}>
                <span className="font-bold text-base" style={{ color: '#d97706' }}>1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-1" style={{ color: '#111827' }}>Evitar Paradas Imprevistas</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#4b5563' }}>Eliminamos interrupções operacionais que podem comprometer seu serviço e gerar prejuízos financeiros significativos.</p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-start gap-5 py-5" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#dcfce7' }}>
                <span className="font-bold text-base" style={{ color: '#16a34a' }}>2</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-1" style={{ color: '#111827' }}>Reduzir Custos com Reparos</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#4b5563' }}>Prevenir falhas é muito mais econômico do que realizar reparos emergenciais ou substituir equipamentos prematuramente.</p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-start gap-5 py-5" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#dbeafe' }}>
                <span className="font-bold text-base" style={{ color: '#2563eb' }}>3</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-1" style={{ color: '#111827' }}>Garantir Conformidade Técnica</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#4b5563' }}>Mantemos seus equipamentos em conformidade com as normas NR10, NR12 e ABNT, evitando problemas legais e garantindo a segurança.</p>
              </div>
            </div>

            {/* Item 4 */}
            <div className="flex items-start gap-5 py-5" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f3e8ff' }}>
                <span className="font-bold text-base" style={{ color: '#9333ea' }}>4</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-1" style={{ color: '#111827' }}>Preservar Investimentos</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#4b5563' }}>Prolongamos a vida útil dos seus equipamentos, protegendo seu investimento e maximizando o retorno.</p>
              </div>
            </div>

            {/* Item 5 */}
            <div className="flex items-start gap-5 py-5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fce7f3' }}>
                <span className="font-bold text-base" style={{ color: '#db2777' }}>5</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold mb-1" style={{ color: '#111827' }}>Assegurar Qualidade Alimentar</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#4b5563' }}>Garantimos que seus equipamentos mantenham condições ideais para a produção segura e de alta qualidade dos alimentos.</p>
              </div>
            </div>
          </div>

          {/* Page number and decorative elements */}
          <div className="absolute bottom-8 left-12 text-sm" style={{ color: '#9ca3af' }}>
            {proposal.number} de {formatDate(proposal.createdAt as Date)}
          </div>
          <div className="absolute bottom-0 right-0 h-24 w-24" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.8 }} />
        </div>

        {/* Equipment Details Page - Detalhamento por Equipamento */}
        <div className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
          {/* Logo no topo */}
          <div className="absolute top-8 right-12">
            <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
          </div>

          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
            <h2 className="text-2xl font-semibold tracking-tight" style={{ color: '#111827' }}>Nossa Abordagem por Equipamento</h2>
          </div>
          <p className="mb-6 ml-4 text-sm" style={{ color: '#6b7280' }}>
            Protocolos específicos para cada categoria, garantindo que nenhum detalhe seja negligenciado.
          </p>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {/* Fogões Industriais */}
            <div className="py-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🔥</span>
                <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Fogões Industriais</h3>
              </div>
              <ul className="text-xs space-y-1 pl-6" style={{ color: '#4b5563' }}>
                <li>• Verificação de mangueiras, regulador e válvulas</li>
                <li>• Limpeza e descarbonização dos queimadores</li>
                <li>• Calibração de bicos injetores</li>
                <li>• Tratamento antiferrugem</li>
              </ul>
            </div>

            {/* Sistemas de Refrigeração */}
            <div className="py-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">❄️</span>
                <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Refrigeração</h3>
              </div>
              <ul className="text-xs space-y-1 pl-6" style={{ color: '#4b5563' }}>
                <li>• Ajuste de portas e borrachas de vedação</li>
                <li>• Higienização de condensadora e evaporadora</li>
                <li>• Verificação de controlador e sensores</li>
                <li>• Medição de corrente do compressor</li>
              </ul>
            </div>

            {/* Câmaras Frias */}
            <div className="py-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🧊</span>
                <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Câmaras Frias</h3>
              </div>
              <ul className="text-xs space-y-1 pl-6" style={{ color: '#4b5563' }}>
                <li>• Limpeza e desobstrução de componentes</li>
                <li>• Verificação de pressostatos e degelo</li>
                <li>• Teste de sistemas de alarme</li>
                <li>• Avaliação de vedação de painéis</li>
              </ul>
            </div>

            {/* Lava-Louças */}
            <div className="py-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🍽️</span>
                <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Lava-Louças</h3>
              </div>
              <ul className="text-xs space-y-1 pl-6" style={{ color: '#4b5563' }}>
                <li>• Inspeção visual de corrosão e nivelamento</li>
                <li>• Testes elétricos e de placas eletrônicas</li>
                <li>• Limpeza de braços e filtros</li>
                <li>• Verificação de sensores de segurança</li>
              </ul>
            </div>

            {/* Fornos e Estufas */}
            <div className="py-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🔥</span>
                <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Fornos e Estufas</h3>
              </div>
              <ul className="text-xs space-y-1 pl-6" style={{ color: '#4b5563' }}>
                <li>• Teste de resistências e termostatos</li>
                <li>• Verificação de fiação e isolamento</li>
                <li>• Limpeza técnica especializada</li>
                <li>• Ajuste de sistemas de segurança</li>
              </ul>
            </div>

            {/* Equipamentos de Bancada */}
            <div className="py-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🔧</span>
                <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Equipamentos de Bancada</h3>
              </div>
              <ul className="text-xs space-y-1 pl-6" style={{ color: '#4b5563' }}>
                <li>• Verificação elétrica completa</li>
                <li>• Lubrificação de partes móveis</li>
                <li>• Ajuste de correias e retentores</li>
                <li>• Revisão de controles e comandos</li>
              </ul>
            </div>
          </div>

          {/* Approach Summary */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid #e5e7eb' }}>
            <div className="grid grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
                  <span style={{ color: '#22c55e' }}>✓</span>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: '#111827' }}>Checklists Técnicos</p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>Protocolos específicos</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
                  <span style={{ color: '#22c55e' }}>✓</span>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: '#111827' }}>Inspeção Minuciosa</p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>Identificação precoce</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
                  <span style={{ color: '#22c55e' }}>✓</span>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: '#111827' }}>Ajustes Preventivos</p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>Calibrações precisas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Page number and decorative elements */}
          <div className="absolute bottom-8 left-12 text-sm" style={{ color: '#9ca3af' }}>
            {proposal.number} de {formatDate(proposal.createdAt as Date)}
          </div>
          <div className="absolute bottom-0 right-0 h-24 w-24" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.8 }} />
        </div>

        {/* Results Page - Resultados Comprovados */}
        <div className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
          {/* Logo no topo */}
          <div className="absolute top-8 right-12">
            <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
          </div>

          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
            <h2 className="text-2xl font-semibold tracking-tight" style={{ color: '#111827' }}>Resultados Comprovados</h2>
          </div>
          <p className="mb-6 ml-4 text-sm" style={{ color: '#6b7280' }}>
            Nosso programa demonstra resultados significativos em clientes reais.
          </p>

          {/* Main Stats - Clean design */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="text-center py-6 rounded-xl" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
              <p className="text-4xl font-bold tracking-tight" style={{ color: '#16a34a' }}>76,2%</p>
              <p className="text-sm font-medium mt-2" style={{ color: '#166534' }}>Redução de Custos</p>
              <p className="text-xs mt-1" style={{ color: '#4ade80' }}>em manutenção</p>
            </div>
            <div className="text-center py-6 rounded-xl" style={{ border: '2px solid #e5e7eb' }}>
              <p className="text-4xl font-bold tracking-tight" style={{ color: '#111827' }}>68%</p>
              <p className="text-sm font-medium mt-2" style={{ color: '#374151' }}>Menos Emergências</p>
              <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>chamados urgentes</p>
            </div>
            <div className="text-center py-6 rounded-xl" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' }}>
              <p className="text-4xl font-bold tracking-tight" style={{ color: '#9333ea' }}>+35%</p>
              <p className="text-sm font-medium mt-2" style={{ color: '#7e22ce' }}>Vida Útil</p>
              <p className="text-xs mt-1" style={{ color: '#c084fc' }}>dos equipamentos</p>
            </div>
          </div>

          {/* Case Study - Minimal */}
          <div className="mb-6 p-5 rounded-xl" style={{ backgroundColor: '#fafafa' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📊</span>
              <h3 className="text-base font-semibold" style={{ color: '#111827' }}>Case de Sucesso: Rede de Restaurantes</h3>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: '#6b7280' }}>Evolução do Programa</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                      <span style={{ color: '#374151' }}>Fase Reativa</span>
                    </span>
                    <span className="font-medium" style={{ color: '#111827' }}>R$ 9.198/mês</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                      <span style={{ color: '#374151' }}>Fase Transição</span>
                    </span>
                    <span className="font-medium" style={{ color: '#111827' }}>R$ 5.812/mês</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                      <span style={{ color: '#374151' }}>Fase Consolidada</span>
                    </span>
                    <span className="font-medium" style={{ color: '#16a34a' }}>R$ 2.191/mês</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: '#6b7280' }}>Resultados da Rede</p>
                <div className="space-y-2 text-sm" style={{ color: '#374151' }}>
                  <p>• 6 restaurantes atendidos</p>
                  <p>• <strong style={{ color: '#16a34a' }}>R$ 9.604</strong> de economia mensal</p>
                  <p>• 118 serviços contratuais executados</p>
                  <p>• 32,6% das operações preventivas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits - Clean icons */}
          <div className="p-5 rounded-xl" style={{ border: '1px solid #e5e7eb' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">✨</span>
              <h3 className="text-base font-semibold" style={{ color: '#111827' }}>Benefícios Além da Economia</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
                  <span className="text-lg">📈</span>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#111827' }}>Previsibilidade Financeira</p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>Custos fixos e planejáveis</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
                  <span className="text-lg">⚡</span>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#111827' }}>Menos Emergências</p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>Operação sem interrupções</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dbeafe' }}>
                  <span className="text-lg">🔧</span>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#111827' }}>Maior Durabilidade</p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>Equipamentos duradouros</p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-5 text-xs italic text-center px-8" style={{ color: '#6b7280' }}>
            "A estabilidade financeira proporcionada pelo programa nos permitiu realocar recursos antes destinados a contingências para investimentos em expansão."
          </p>

          {/* Page number and decorative elements */}
          <div className="absolute bottom-8 left-12 text-sm" style={{ color: '#9ca3af' }}>
            {proposal.number} de {formatDate(proposal.createdAt as Date)}
          </div>
          <div className="absolute bottom-0 right-0 h-24 w-24" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.8 }} />
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

            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-8 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
              <h2 className="text-2xl font-semibold tracking-tight" style={{ color: '#111827' }}>Proposta Comercial</h2>
            </div>
            
            <div className="mt-6 rounded-lg p-8" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <h3 className="text-xl font-bold mb-4" style={{ color: '#15803d' }}>{proposal.title}</h3>
              {proposal.description && (() => {
                const parts = proposal.description.split('•').map(s => s.trim()).filter(Boolean);
                const intro = parts[0];
                const bullets = parts.slice(1);
                
                return (
                  <>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: '#374151', lineHeight: '1.8' }}>
                      {intro}
                    </p>
                    {bullets.length > 0 && (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#15803d' }}>Principais diferenciais:</p>
                        <ul className="space-y-2 mb-4">
                          {bullets.map((bullet, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#374151', lineHeight: '1.6' }}>
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#22c55e' }} />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                );
              })()}
              
              <div className="pt-4" style={{ borderTop: '1px solid #e5e7eb' }}>
                <p className="text-xs" style={{ color: '#6b7280' }}>
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
                        <div className="flex items-start gap-3">
                          {product.photoUrl && (
                            <img
                              src={product.photoUrl}
                              alt={product.name}
                              style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, border: '1px solid #e5e7eb' }}
                            />
                          )}
                          <div>
                            <p className="font-medium" style={{ color: '#111827' }}>{product.name}</p>
                            <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>{product.description}</p>
                            {product.discountNote && (
                              <p className="mt-1 text-xs italic" style={{ color: '#9ca3af' }}>* {product.discountNote}</p>
                            )}
                          </div>
                        </div>
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

        {/* Terms and Conditions Pages - Paginated */}
        {proposal.termsConditions && proposal.termsConditions.length > 0 && (() => {
          // Split terms into pages (max 6 terms per page to fit A4)
          const termsPerPage = 6;
          const termsPages: typeof proposal.termsConditions[] = [];
          for (let i = 0; i < proposal.termsConditions.length; i += termsPerPage) {
            termsPages.push(proposal.termsConditions.slice(i, i + termsPerPage));
          }

          return termsPages.map((pageTerms, pageIndex) => (
            <div key={`terms-page-${pageIndex}`} className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
              {/* Logo no topo */}
              <div className="absolute top-8 right-12">
                <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
              </div>

              <h2 className="mb-2 text-2xl font-bold" style={{ color: '#111827' }}>
                Termos e Condições
                {termsPages.length > 1 && <span className="text-base font-normal ml-2" style={{ color: '#9ca3af' }}>({pageIndex + 1}/{termsPages.length})</span>}
              </h2>
              {pageIndex === 0 && (
                <p className="mb-6 text-sm" style={{ color: '#4b5563' }}>
                  Os dados abaixo descrevem os termos e condições para fornecimento dos produtos e serviços descritos nesta proposta comercial.
                </p>
              )}

              {/* Terms List - Compact design */}
              <div className="space-y-3">
                {pageTerms.map((term, index) => (
                  <div 
                    key={term.id} 
                    className="rounded-lg p-4"
                    style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: '#dcfce7' }}
                      >
                        <span className="text-xs font-bold" style={{ color: '#16a34a' }}>
                          {pageIndex * termsPerPage + index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>{term.title}</h4>
                        <p className="text-xs leading-relaxed" style={{ color: '#4b5563', lineHeight: '1.6' }}>{term.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Page number */}
              <div className="absolute bottom-8 left-12 text-sm" style={{ color: '#9ca3af' }}>
                {proposal.number} de {formatDate(proposal.createdAt as Date)}
              </div>

              {/* Decorative elements */}
              <div className="absolute bottom-0 right-0 h-32 w-32" style={{ backgroundColor: '#22c55e', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
              <div className="absolute bottom-0 right-16 h-20 w-20" style={{ backgroundColor: '#16a34a', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
            </div>
          ));
        })()}

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

        {/* Condições Comerciais — Leasing */}
        {proposal.templateId && ['rational', 'equipamentos', 'ivario'].includes(proposal.templateId) && totalValue > 0 && (
          <div className="relative bg-white p-12 pdf-page overflow-hidden" style={{ width: '210mm', height: '297mm', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
            <div className="absolute top-8 right-12">
              <img src={companyLogo} alt={company.name} className="h-12 w-auto" />
            </div>

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-1 h-8 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                <h2 className="text-2xl font-semibold tracking-tight" style={{ color: '#111827' }}>Condições Comerciais</h2>
              </div>
              <p className="text-sm mt-2 pl-4" style={{ color: '#4b5563' }}>
                Simulação de investimento e modalidades de pagamento para os equipamentos desta proposta.
              </p>
            </div>

            {/* Investimento */}
            <div className="mb-6 pl-4" style={{ borderLeft: '2px solid #e5e7eb' }}>
              <p className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: '#9ca3af' }}>Investimento total</p>
              <p className="text-4xl font-bold tracking-tight" style={{ color: '#111827' }}>{formatCurrency(totalValue)}</p>
            </div>

            {/* Modalidades */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="rounded-lg p-5" style={{ backgroundColor: '#fafafa', border: '1px solid #e5e7eb' }}>
                <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: '#6b7280' }}>À Vista</p>
                <p className="text-xl font-bold" style={{ color: '#111827' }}>{formatCurrency(totalValue)}</p>
                <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>PIX / Transferência</p>
              </div>
              <div className="rounded-lg p-5" style={{ backgroundColor: '#fafafa', border: '1px solid #e5e7eb' }}>
                <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: '#6b7280' }}>Parcelado 12x</p>
                <p className="text-xl font-bold" style={{ color: '#111827' }}>{formatCurrency(totalValue / 12)}<span className="text-sm font-normal">/mês</span></p>
                <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>Boleto Bancário</p>
              </div>
              <div className="rounded-lg p-5" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: '#15803d' }}>Leasing 36x</p>
                <p className="text-xl font-bold" style={{ color: '#15803d' }}>{formatCurrency(totalValue / 36)}<span className="text-sm font-normal">/mês</span></p>
                <p className="text-xs mt-1" style={{ color: '#16a34a' }}>Locação de equipamentos</p>
              </div>
            </div>

            {/* Separador */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }}></div>
              <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#9ca3af' }}>Benefício fiscal — Leasing</span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }}></div>
            </div>

            {/* Texto explicativo */}
            <div className="mb-5 pl-4" style={{ borderLeft: '2px solid #bbf7d0' }}>
              <p className="text-sm leading-relaxed" style={{ color: '#374151', lineHeight: '1.7' }}>
                Empresas enquadradas no regime de <strong style={{ color: '#111827' }}>Lucro Real</strong> podem contabilizar 
                as parcelas de locação como <strong style={{ color: '#111827' }}>despesa operacional dedutível</strong>, 
                reduzindo a base de cálculo de tributos federais. A economia potencial pode chegar a 
                <strong style={{ color: '#111827' }}> 43,25%</strong> do valor do contrato.
              </p>
            </div>

            {/* Tabela de tributos — limpa, sem emojis */}
            <div className="overflow-hidden rounded-lg mb-5" style={{ border: '1px solid #e5e7eb' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Tributo</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Alíquota</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Economia estimada</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { nome: 'IRPJ — Imposto de Renda Pessoa Jurídica', aliquota: '25%', valor: totalValue * 0.25 },
                    { nome: 'CSLL — Contribuição Social sobre Lucro Líquido', aliquota: '9%', valor: totalValue * 0.09 },
                    { nome: 'PIS — Crédito sobre despesas de locação', aliquota: '1,65%', valor: totalValue * 0.0165 },
                    { nome: 'COFINS — Crédito sobre despesas de locação', aliquota: '7,6%', valor: totalValue * 0.076 },
                  ].map((item, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>{item.nome}</td>
                      <td className="px-5 py-3 text-sm text-center font-medium" style={{ color: '#111827' }}>{item.aliquota}</td>
                      <td className="px-5 py-3 text-sm text-right font-semibold" style={{ color: '#15803d' }}>{formatCurrency(item.valor)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f0fdf4', borderTop: '2px solid #bbf7d0' }}>
                    <td className="px-5 py-3 text-sm font-bold" style={{ color: '#111827' }}>Economia potencial total</td>
                    <td className="px-5 py-3 text-sm text-center font-bold" style={{ color: '#111827' }}>43,25%</td>
                    <td className="px-5 py-3 text-sm text-right font-bold" style={{ color: '#15803d' }}>{formatCurrency(totalValue * 0.4325)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mensalidade após benefícios fiscais */}
            <div className="rounded-lg p-5" style={{ backgroundColor: '#f0fdf4', border: '2px solid #86efac' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#15803d' }}>
                Mensalidade após benefícios fiscais
              </p>
              <p className="text-2xl font-bold" style={{ color: '#15803d' }}>
                {formatCurrency((totalValue / 36) * (1 - 0.4325))}
                <span className="text-sm font-normal" style={{ color: '#16a34a' }}>/mês</span>
              </p>
              <p className="text-xs mt-2" style={{ color: '#6b7280', lineHeight: '1.6' }}>
                Parcela de {formatCurrency(totalValue / 36)} com aproveitamento de créditos de PIS e COFINS (9,25%) e deduções de IRPJ (25%) e CSLL (9%) sobre a despesa de locação.
              </p>
            </div>

            {/* Base legal e disclaimer */}
            <div className="space-y-2">
              <p className="text-xs" style={{ color: '#6b7280' }}>
                <strong style={{ color: '#374151' }}>Base legal:</strong> Art. 249 e 250 do RIR — Decreto 3.000/1999 · Art. 3º, IV da Lei 10.833/2003 · Art. 15, IV da Lei 10.865/2002
              </p>
              <p className="text-xs italic" style={{ color: '#9ca3af' }}>
                * O valor indicado é uma estimativa para empresas no regime de Lucro Real. Consulte seu contador para confirmar a aplicabilidade ao seu CNPJ.
              </p>
            </div>

            <div className="absolute bottom-8 left-12 text-sm" style={{ color: '#9ca3af' }}>
              {proposal.number} de {formatDate(proposal.createdAt as Date)}
            </div>
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
