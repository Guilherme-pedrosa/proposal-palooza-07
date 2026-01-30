import { Proposal } from '@/types/proposal';
import { CompanySettings } from '@/types/company';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function generatePrintHTML(proposal: Partial<Proposal>, company: CompanySettings): string {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '--/--/----';
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const totalValue = proposal.products?.reduce((sum, p) => sum + p.totalPrice, 0) || 0;
  const isPreventiva = proposal.templateId === 'preventiva' || !proposal.templateId;

  const pageStyles = `
    @page {
      size: A4 portrait;
      margin: 0;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .page {
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      position: relative;
      page-break-after: always;
      page-break-inside: avoid;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    .page-content {
      padding: 48px;
      height: 100%;
      position: relative;
    }
    
    .logo-top {
      position: absolute;
      top: 32px;
      right: 48px;
      height: 48px;
    }
    
    .corner-decoration {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 128px;
      height: 128px;
      background-color: #22c55e;
      clip-path: polygon(100% 0, 100% 100%, 0 100%);
    }
    
    .corner-decoration-small {
      position: absolute;
      bottom: 0;
      right: 64px;
      width: 80px;
      height: 80px;
      background-color: #16a34a;
      clip-path: polygon(100% 0, 100% 100%, 0 100%);
    }
    
    .title { font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 8px; }
    .subtitle { font-size: 14px; color: #4b5563; margin-bottom: 24px; }
    
    .card {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 16px;
    }
    
    .card-title { font-size: 18px; font-weight: 700; color: #15803d; margin-bottom: 12px; }
    .card-text { font-size: 14px; color: #374151; line-height: 1.6; }
    
    .values-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .value-item { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #374151; }
    .value-dot { width: 8px; height: 8px; background-color: #22c55e; border-radius: 50%; }
    
    .clients-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px; }
    .client-box {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .client-logo { max-height: 56px; max-width: 100%; object-fit: contain; }
    .client-name { font-size: 12px; color: #6b7280; text-align: center; }
    
    .table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .table th { background-color: #f9fafb; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
    .table td { padding: 16px; font-size: 12px; color: #4b5563; border-bottom: 1px solid #e5e7eb; }
    .table tr:nth-child(even) { background-color: #f9fafb; }
    
    .total-box { text-align: right; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
    .total-label { font-size: 12px; color: #4b5563; }
    .total-value { font-size: 28px; font-weight: 700; color: #15803d; }
    
    .signature-line { border-top: 1px solid #374151; padding-top: 16px; text-align: center; }
    .signature-name { font-size: 14px; font-weight: 500; color: #111827; }
    .signature-role { font-size: 12px; color: #6b7280; }
    
    .footer-info { position: absolute; bottom: 32px; left: 48px; font-size: 12px; color: #9ca3af; }
  `;

  // Cover page
  const coverPage = `
    <div class="page" style="background-color: #1a1a1a;">
      <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.6));"></div>
      <div style="position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; padding: 48px; color: white;">
        <div style="margin-bottom: 32px;">
          <h1 style="font-size: 48px; font-weight: 700; letter-spacing: -0.5px; margin: 0;">Proposta</h1>
          <h1 style="font-size: 48px; font-weight: 700; letter-spacing: -0.5px; margin: 0;">Comercial</h1>
        </div>
        <div style="flex: 1;">
          <p style="font-size: 16px; color: #d1d5db; margin-bottom: 16px;">
            A seguinte proposta comercial foi elaborada em ${formatDate(proposal.createdAt as Date)} para 
            <span style="font-weight: 600; color: white;">${proposal.client?.name || 'Cliente'}</span>.
          </p>
          <p style="color: #d1d5db; margin-bottom: 8px;">A proposta é válida até ${formatDate(proposal.validUntil as Date)}.</p>
          <p style="color: #d1d5db;">Número da proposta <span style="font-weight: 600;">${proposal.number || 'P0000'}</span>.</p>
        </div>
        <div style="display: flex; align-items: center; gap: 16px; margin-top: auto;">
          <div>
            <p style="font-size: 16px; font-weight: 500;">${company.name}</p>
            <p style="color: #9ca3af;">Tel: ${company.phone}</p>
          </div>
          <div style="margin-left: auto; background: white; border-radius: 8px; padding: 8px;">
            ${company.logo ? `<img src="${company.logo}" alt="${company.name}" style="height: 56px; width: auto;">` : ''}
          </div>
        </div>
        <div class="corner-decoration" style="width: 192px; height: 192px;"></div>
        <div class="corner-decoration-small" style="right: 96px; width: 128px; height: 128px;"></div>
      </div>
    </div>
  `;

  // Company presentation page
  const companyPage = `
    <div class="page" style="background: white;">
      <div class="page-content">
        ${company.logo ? `<img src="${company.logo}" class="logo-top" alt="${company.name}">` : ''}
        <h2 class="title">O que nos move?</h2>
        <p class="subtitle">Acreditamos em nossa missão e respeitamos os nossos valores.</p>
        
        <div class="card">
          <h3 class="card-title">Visão</h3>
          <p class="card-text">${company.vision || ''}</p>
        </div>
        
        <div class="card">
          <h3 class="card-title">Missão</h3>
          <p class="card-text">${company.mission || ''}</p>
        </div>
        
        <div class="card">
          <h3 class="card-title">Valores</h3>
          <div class="values-grid">
            ${(company.values || []).map(v => `
              <div class="value-item">
                <div class="value-dot"></div>
                <span>${v}</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        ${(company.clients && company.clients.length > 0) ? `
          <div style="margin-top: 24px;">
            <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 16px;">Principais Clientes</h3>
            <div class="clients-grid">
              ${company.clients.map(c => `
                <div class="client-box">
                  ${c.logo ? `<img src="${c.logo}" class="client-logo" alt="${c.name}">` : `<span class="client-name">${c.name}</span>`}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${(company.brands && company.brands.length > 0) ? `
          <div style="margin-top: 24px;">
            <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 16px;">Marcas que Trabalhamos</h3>
            <div class="clients-grid">
              ${company.brands.map(b => `
                <div class="client-box">
                  ${b.logo ? `<img src="${b.logo}" class="client-logo" alt="${b.name}">` : `<span class="client-name">${b.name}</span>`}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="corner-decoration"></div>
        <div class="corner-decoration-small"></div>
        <div class="footer-info">${proposal.number} de ${formatDate(proposal.createdAt as Date)}</div>
      </div>
    </div>
  `;

  // Products page
  const productsPage = proposal.products && proposal.products.length > 0 ? `
    <div class="page" style="background: white;">
      <div class="page-content">
        ${company.logo ? `<img src="${company.logo}" class="logo-top" alt="${company.name}">` : ''}
        <h2 class="title">Os produtos</h2>
        <p class="subtitle">Lista de produtos orçados nesta proposta comercial.</p>
        
        <table class="table">
          <thead>
            <tr>
              <th style="width: 40%;">Produto</th>
              <th style="text-align: center;">Unid.</th>
              <th style="text-align: center;">Qtde</th>
              <th style="text-align: right;">Valor unitário</th>
              <th style="text-align: right;">Desconto</th>
              <th style="text-align: right;">Valor total</th>
            </tr>
          </thead>
          <tbody>
            ${proposal.products.map((p, i) => `
              <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td>
                  <p style="font-weight: 500; color: #111827; margin-bottom: 4px;">${p.name}</p>
                  <p style="font-size: 11px; color: #6b7280;">${p.description || ''}</p>
                  ${p.discountNote ? `<p style="font-size: 10px; font-style: italic; color: #9ca3af; margin-top: 4px;">* ${p.discountNote}</p>` : ''}
                </td>
                <td style="text-align: center;">${p.unit}</td>
                <td style="text-align: center;">${p.quantity.toFixed(2).replace('.', ',')}</td>
                <td style="text-align: right;">${formatCurrency(p.unitPrice)}</td>
                <td style="text-align: right; color: ${p.discount ? '#dc2626' : '#4b5563'};">${p.discount ? `-${formatCurrency(p.discount)}` : '-'}</td>
                <td style="text-align: right; font-weight: 500; color: #111827;">${formatCurrency(p.totalPrice)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total-box">
          <p class="total-label">Valor total da proposta:</p>
          <p class="total-value">${formatCurrency(totalValue)}</p>
        </div>
        
        <div class="corner-decoration"></div>
        <div class="corner-decoration-small"></div>
        <div class="footer-info">${proposal.number} de ${formatDate(proposal.createdAt as Date)}</div>
      </div>
    </div>
  ` : '';

  // Terms page
  const termsPage = proposal.termsConditions && proposal.termsConditions.length > 0 ? `
    <div class="page" style="background: white;">
      <div class="page-content">
        ${company.logo ? `<img src="${company.logo}" class="logo-top" alt="${company.name}">` : ''}
        <h2 class="title">Termos e Condições</h2>
        <p class="subtitle">Os dados abaixo descrevem os termos e condições para fornecimento dos produtos e serviços descritos nesta proposta comercial.</p>
        
        <table class="table">
          <thead>
            <tr>
              <th style="width: 30%;">Item</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>
            ${proposal.termsConditions.map((t, i) => `
              <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="font-weight: 500; color: #111827; vertical-align: top;">${t.title}</td>
                <td>${t.description}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="corner-decoration"></div>
        <div class="corner-decoration-small"></div>
      </div>
    </div>
  ` : '';

  // Signature page
  const signaturePage = `
    <div class="page" style="background: white;">
      <div class="page-content">
        ${company.logo ? `<img src="${company.logo}" class="logo-top" alt="${company.name}">` : ''}
        
        <div style="margin-top: 96px;">
          <p style="font-size: 16px; line-height: 1.8; color: #374151;">
            Estando de acordo com os produtos, valores e termos relatados nesta proposta e por estarem assim justos e contratados, 
            <strong>${company.name}</strong> e o(a) <strong>${proposal.client?.name || 'Cliente'}</strong> firmam a proposta.
          </p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 64px;">
            <div class="signature-line">
              <p class="signature-name">${company.name}</p>
              <p class="signature-role">Contratada</p>
            </div>
            <div class="signature-line">
              <p class="signature-name">${proposal.client?.name || 'Cliente'}</p>
              <p class="signature-role">Contratante</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 64px;">
            <p style="font-size: 12px; color: #9ca3af;">
              ${company.name} - ${company.cnpj}
            </p>
          </div>
        </div>
        
        <div class="corner-decoration"></div>
        <div class="corner-decoration-small"></div>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Proposta ${proposal.number} - ${proposal.client?.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>${pageStyles}</style>
      </head>
      <body>
        ${coverPage}
        ${companyPage}
        ${productsPage}
        ${termsPage}
        ${signaturePage}
      </body>
    </html>
  `;
}

export function openPrintWindow(proposal: Partial<Proposal>, company: CompanySettings) {
  const html = generatePrintHTML(proposal, company);
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for fonts and images to load
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
}
