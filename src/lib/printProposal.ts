import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Proposal, ProposalAttachment } from '@/types/proposal';
import { CompanySettings } from '@/types/company';
import industrialKitchenBg from '@/assets/industrial-kitchen-bg.jpg';
import { ProposalPreview } from '@/components/proposal/ProposalPreview';
import { getImageAsBase64 } from '@/lib/pdfImageUtils';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

async function waitForNextPaint(frames = 2): Promise<void> {
  for (let index = 0; index < frames; index += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

async function waitForSingleImage(img: HTMLImageElement): Promise<void> {
  img.loading = 'eager';
  img.decoding = 'sync';

  if (img.complete && img.naturalWidth > 0) {
    if (typeof img.decode === 'function') {
      await img.decode().catch(() => undefined);
    }
    return;
  }

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });

  if (typeof img.decode === 'function') {
    await img.decode().catch(() => undefined);
  }
}

async function waitForImagesToLoad(container: ParentNode): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(images.map((img) => waitForSingleImage(img)));
}

async function inlineImage(img: HTMLImageElement): Promise<void> {
  const source = img.currentSrc || img.src;
  if (!source) return;

  img.removeAttribute('srcset');
  img.removeAttribute('sizes');
  img.crossOrigin = 'anonymous';
  img.referrerPolicy = 'no-referrer';

  const inlined = await getImageAsBase64(source);
  if (inlined && inlined !== source) {
    img.src = inlined;
  }

  await waitForSingleImage(img);
}

async function inlineAllImages(container: HTMLElement): Promise<void> {
  const bgImageBase64 = await getImageAsBase64(industrialKitchenBg);

  const bgDivs = Array.from(container.querySelectorAll('[style*="background-image"]'));
  bgDivs.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;

    const backgroundImage = el.style.backgroundImage;
    if (backgroundImage && (backgroundImage.includes('industrial-kitchen') || backgroundImage.includes('/assets/'))) {
      el.style.backgroundImage = `url('${bgImageBase64}')`;
    }
  });

  const allImages = Array.from(container.querySelectorAll('img'));
  await Promise.all(allImages.map((img) => inlineImage(img)));
}

function renderProductsNativePages(pdf: jsPDF, proposal: Partial<Proposal>): void {
  const products = proposal.products ?? [];
  const margin = 12;
  const pageW = A4_WIDTH_MM;
  const pageH = A4_HEIGHT_MM;
  const contentW = pageW - margin * 2;
  const tableTop = 34;
  const footerY = 287;
  const columns = [
    { key: 'item', label: 'Item', width: 86, align: 'left' as const },
    { key: 'unit', label: 'Unid.', width: 14, align: 'center' as const },
    { key: 'qty', label: 'Qtde', width: 16, align: 'center' as const },
    { key: 'unitPrice', label: 'Valor unit.', width: 28, align: 'right' as const },
    { key: 'discount', label: 'Desc.', width: 18, align: 'right' as const },
    { key: 'total', label: 'Valor total', width: 36, align: 'right' as const },
  ];
  const subtotalProdutos = products.reduce((sum, p) => sum + p.totalPrice, 0);
  const totalValue = proposal.totalValue ?? subtotalProdutos;
  const hasDescontoGeral = totalValue < subtotalProdutos;
  const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const qty = (value: number) => value.toFixed(2).replace('.', ',');

  let y = tableTop;
  let pageIndex = 0;

  const drawPageHeader = () => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(17, 24, 39);
    pdf.text('Produtos e serviços', margin, 18);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(75, 85, 99);
    pdf.text('Lista de itens orçados nesta proposta comercial.', margin, 24);

    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(229, 231, 235);
    pdf.rect(margin, y, contentW, 10, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(55, 65, 81);

    let x = margin;
    columns.forEach((column) => {
      const textX = column.align === 'left' ? x + 2 : column.align === 'center' ? x + column.width / 2 : x + column.width - 2;
      pdf.text(column.label, textX, y + 6, { align: column.align });
      x += column.width;
    });

    y += 10;
  };

  const drawFooter = () => {
    if (proposal.number) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(156, 163, 175);
      pdf.text(proposal.number, margin, footerY);
    }
  };

  const drawSummary = () => {
    pdf.setDrawColor(229, 231, 235);
    pdf.line(margin, y + 2, pageW - margin, y + 2);
    y += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(75, 85, 99);
    if (hasDescontoGeral) {
      pdf.text(`Subtotal: ${currency(subtotalProdutos)}`, pageW - margin, y, { align: 'right' });
      y += 6;
      pdf.setTextColor(185, 28, 28);
      pdf.text(`Desconto: -${currency(subtotalProdutos - totalValue)}`, pageW - margin, y, { align: 'right' });
      y += 7;
    }

    pdf.setTextColor(75, 85, 99);
    pdf.text('Valor total da proposta:', pageW - margin, y, { align: 'right' });
    y += 8;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(21, 128, 61);
    pdf.text(currency(totalValue), pageW - margin, y, { align: 'right' });
  };

  drawPageHeader();

  products.forEach((product, index) => {
    const itemWidth = columns[0].width - 4;
    const itemLines = [
      ...(pdf.splitTextToSize(product.name || '', itemWidth) as string[]),
      ...(product.observation ? pdf.splitTextToSize(`Obs.: ${product.observation}`, itemWidth) as string[] : []),
      ...(product.discountNote ? pdf.splitTextToSize(`* ${product.discountNote}`, itemWidth) as string[] : []),
    ];
    const textLines = Math.max(itemLines.length, 1);
    const rowHeight = Math.max(11, 4 + textLines * 4.4);
    const needSummarySpace = index === products.length - 1 ? 30 : 0;

    if (y + rowHeight + needSummarySpace > 268) {
      drawFooter();
      pdf.addPage();
      pageIndex += 1;
      y = tableTop;
      drawPageHeader();
    }

    pdf.setFillColor(index % 2 === 0 ? 255 : 249, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 251);
    pdf.setDrawColor(229, 231, 235);
    pdf.rect(margin, y, contentW, rowHeight, 'FD');

    let x = margin;
    const rowTop = y + 4.5;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(17, 24, 39);
    pdf.text(pdf.splitTextToSize(product.name || '', itemWidth), x + 2, rowTop);

    let detailY = rowTop + Math.max(1, (pdf.splitTextToSize(product.name || '', itemWidth) as string[]).length) * 3.8;
    if (product.observation) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(75, 85, 99);
      pdf.text(pdf.splitTextToSize(`Obs.: ${product.observation}`, itemWidth), x + 2, detailY);
      detailY += (pdf.splitTextToSize(`Obs.: ${product.observation}`, itemWidth) as string[]).length * 3.8;
    }
    if (product.discountNote) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7.5);
      pdf.setTextColor(156, 163, 175);
      pdf.text(pdf.splitTextToSize(`* ${product.discountNote}`, itemWidth), x + 2, detailY);
    }
    x += columns[0].width;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(75, 85, 99);
    pdf.text(product.unit || '-', x + columns[1].width / 2, rowTop, { align: 'center' });
    x += columns[1].width;
    pdf.text(qty(product.quantity || 0), x + columns[2].width / 2, rowTop, { align: 'center' });
    x += columns[2].width;
    pdf.text(currency(product.unitPrice || 0), x + columns[3].width - 2, rowTop, { align: 'right' });
    x += columns[3].width;

    pdf.setTextColor(product.discount ? 185 : 75, product.discount ? 28 : 85, product.discount ? 28 : 99);
    pdf.text(product.discount ? `-${product.discount}%` : '-', x + columns[4].width - 2, rowTop, { align: 'right' });
    x += columns[4].width;

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(currency(product.totalPrice || 0), x + columns[5].width - 2, rowTop, { align: 'right' });

    y += rowHeight;
  });

  drawSummary();
  drawFooter();
}

function renderAttachmentsNativePage(pdf: jsPDF, attachments: ProposalAttachment[], proposalNumber?: string): void {
  const pageW = A4_WIDTH_MM;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 28;

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(17, 24, 39);
  pdf.text('Arquivos Anexos', margin, y);
  y += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Documentos complementares desta proposta. Clique em qualquer linha para abrir.', margin, y);
  y += 12;

  const rowH = 16;
  const badgeSize = 10;

  attachments.forEach((file, idx) => {
    if (y + rowH > 275) {
      pdf.addPage();
      y = 25;
    }

    // Card background
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(margin, y, contentW, rowH - 2, 2, 2, 'FD');

    // Centered numbered badge
    const badgeX = margin + 4;
    const badgeY = y + (rowH - 2 - badgeSize) / 2;
    pdf.setFillColor(0, 102, 255);
    pdf.roundedRect(badgeX, badgeY, badgeSize, badgeSize, 1.5, 1.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(String(idx + 1), badgeX + badgeSize / 2, badgeY + badgeSize / 2, { align: 'center', baseline: 'middle' });

    // Filename (clickable, bold dark)
    const textX = badgeX + badgeSize + 5;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(10, 22, 40);
    const maxNameW = contentW - (textX - margin) - 4;
    const nameLine = pdf.splitTextToSize(file.name, maxNameW)[0] || file.name;
    pdf.text(nameLine, textX, y + 6);

    // Meta: size + "Abrir documento" (blue link colour)
    const sizeKb = file.size ? `${(file.size / 1024).toFixed(0)} KB` : '';
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(37, 99, 235);
    const meta = `${sizeKb}${sizeKb ? '  •  ' : ''}Abrir documento`;
    pdf.text(meta, textX, y + 11);

    // Make the entire card a clickable annotation
    if (file.url) {
      pdf.link(margin, y, contentW, rowH - 2, { url: file.url });
    }

    y += rowH;
  });

  // Footer page number / proposal number
  if (proposalNumber) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(156, 163, 175);
    pdf.text(proposalNumber, margin, 287);
  }
}

function renderCommercialConditionsNativePage(pdf: jsPDF, proposal: Partial<Proposal>): void {
  const margin = 15;
  const contentW = A4_WIDTH_MM - margin * 2;
  const totalValue = proposal.totalValue ?? 0;
  const taxa = proposal.taxaJuros ?? 2.303;
  const descontoAVista = proposal.descontoAVista ?? 0;
  const descontoTipo = proposal.descontoAVistaTipo ?? 'percent';
  const opts = proposal.opcoesPagamento && proposal.opcoesPagamento.length > 0
    ? proposal.opcoesPagamento
    : [
        { id: '1', forma: proposal.formaPagamento || 'boleto', parcelas: proposal.numParcelas || 1, entrada: proposal.entradaPercent || 0, juros: proposal.taxaJurosCartao || 0 },
        { id: '2', forma: proposal.formaPagamento2 || 'leasing', parcelas: proposal.numParcelas2 || 36, entrada: proposal.entradaPercent2 || 0, juros: proposal.taxaJurosCartao2 || 0 },
      ];
  const commercialText = proposal.condicoesPagamentoTexto?.trim();
  const prazoEntrega = proposal.prazoEntrega?.trim();

  const pmtCalc = (pv: number, rate: number, n: number) => {
    if (!n || n <= 0) return pv;
    if (rate === 0) return pv / n;
    const r = rate / 100;
    return pv * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  };

  const valorAVista = descontoTipo === 'percent' ? totalValue * (1 - descontoAVista / 100) : totalValue - descontoAVista;
  const labelMap: Record<string, string> = {
    avista: 'À Vista',
    boleto: 'Boleto',
    cartao: 'Cartão',
    leasing: 'Leasing',
    financiamento: 'Financiamento',
  };
  const descMap: Record<string, string> = {
    avista: 'PIX / Transferência',
    boleto: 'Boleto Bancário',
    cartao: 'Cartão de Crédito',
    leasing: 'Locação de equipamentos',
    financiamento: 'Financiamento',
  };

  const getValor = (opt: { forma: string; parcelas: number; entrada: number; juros: number }) => {
    const base = totalValue * (1 - (opt.entrada || 0) / 100);
    if (opt.forma === 'leasing') return pmtCalc(totalValue, taxa, opt.parcelas);
    if (opt.forma === 'cartao' && opt.juros > 0) return pmtCalc(base, opt.juros, opt.parcelas);
    return base / Math.max(opt.parcelas || 1, 1);
  };

  let y = 22;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(17, 24, 39);
  pdf.text('Condições Comerciais', margin, y);
  y += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Simulação de investimento e modalidades de pagamento desta proposta.', margin, y);
  y += 12;

  pdf.setDrawColor(229, 231, 235);
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin, y, contentW, 22, 2, 2, 'FD');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Investimento total', margin + 4, y + 6);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(17, 24, 39);
  pdf.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue), margin + 4, y + 16);
  y += 30;

  pdf.setFillColor(236, 253, 245);
  pdf.setDrawColor(167, 243, 208);
  pdf.roundedRect(margin, y, contentW, 18, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(4, 120, 87);
  pdf.text('À Vista (PIX / Transferência)', margin + 4, y + 6);
  pdf.setFontSize(18);
  pdf.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(valorAVista, 0)), margin + 4, y + 14);
  if (descontoAVista > 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(75, 85, 99);
    const discountLabel = descontoTipo === 'percent'
      ? `Desconto: -${descontoAVista}%`
      : `Desconto: -${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(descontoAVista)}`;
    pdf.text(discountLabel, A4_WIDTH_MM - margin - 4, y + 10, { align: 'right' });
  }
  y += 26;

  const cardW = (contentW - 5) / 2;
  let currentY = y;
  opts.filter(Boolean).forEach((opt, idx) => {
    const col = idx % 2;
    if (idx > 0 && col === 0) currentY += 30;
    const x = margin + col * (cardW + 5);
    const boxY = currentY;
    const isLeasing = opt.forma === 'leasing';
    const valor = getValor(opt);

    pdf.setFillColor(isLeasing ? 240 : 250, isLeasing ? 253 : 250, isLeasing ? 244 : 250);
    pdf.setDrawColor(isLeasing ? 187 : 229, isLeasing ? 247 : 231, isLeasing ? 208 : 235);
    pdf.roundedRect(x, boxY, cardW, 24, 2, 2, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Opção ${idx + 1}`, x + 4, boxY + 5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(isLeasing ? 21 : 17, isLeasing ? 128 : 24, isLeasing ? 61 : 39);
    pdf.text(`${labelMap[opt.forma] || opt.forma} ${opt.parcelas}x`, x + cardW / 2, boxY + 10, { align: 'center' });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor), x + cardW / 2, boxY + 17, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    const detail = [descMap[opt.forma] || opt.forma, opt.entrada ? `Entrada ${opt.entrada}%` : '', opt.forma === 'cartao' && opt.juros > 0 ? `${opt.juros.toFixed(2).replace('.', ',')}% a.m.` : '', opt.forma === 'leasing' ? `${taxa.toFixed(3).replace('.', ',')}% a.m.` : '']
      .filter(Boolean)
      .join(' • ');
    pdf.text(detail, x + cardW / 2, boxY + 22, { align: 'center' });
  });

  y = currentY + (opts.length > 0 ? 34 : 0);

  if (commercialText) {
    const textLines = pdf.splitTextToSize(commercialText, contentW - 8);
    const boxHeight = Math.max(16, 8 + textLines.length * 4.5);
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(229, 231, 235);
    pdf.roundedRect(margin, y, contentW, boxHeight, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(17, 24, 39);
    pdf.text('Condições de Pagamento', margin + 4, y + 6);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(55, 65, 81);
    pdf.text(textLines, margin + 4, y + 12);
    y += boxHeight + 8;
  }

  if (prazoEntrega) {
    const prazoLines = pdf.splitTextToSize(prazoEntrega, contentW - 8);
    const boxHeight = Math.max(14, 8 + prazoLines.length * 4.5);
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(229, 231, 235);
    pdf.roundedRect(margin, y, contentW, boxHeight, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(17, 24, 39);
    pdf.text('Prazo de Entrega / Execução', margin + 4, y + 6);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(55, 65, 81);
    pdf.text(prazoLines, margin + 4, y + 12);
    y += boxHeight + 8;
  }

  const leasingOpt = opts.find((o) => o.forma === 'leasing');
  if (leasingOpt) {
    const parcelaLeasing = pmtCalc(totalValue, taxa, leasingOpt.parcelas || 36);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(21, 128, 61);
    pdf.text('Benefício fiscal — Leasing', margin, y);
    y += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(55, 65, 81);
    const leasingText = pdf.splitTextToSize(
      'Empresas em Lucro Real podem contabilizar as parcelas de locação como despesa operacional dedutível, com economia potencial de até 43,25% do contrato.',
      contentW
    );
    pdf.text(leasingText, margin, y);
    y += leasingText.length * 4.3 + 3;

    const tribRows = [
      ['IRPJ', '25%', totalValue * 0.25],
      ['CSLL', '9%', totalValue * 0.09],
      ['PIS', '1,65%', totalValue * 0.0165],
      ['COFINS', '7,6%', totalValue * 0.076],
    ];

    pdf.setDrawColor(229, 231, 235);
    pdf.setFillColor(249, 250, 251);
    pdf.rect(margin, y, contentW, 8, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Tributo', margin + 3, y + 5);
    pdf.text('Alíquota', margin + 95, y + 5, { align: 'center' });
    pdf.text('Economia estimada', margin + contentW - 3, y + 5, { align: 'right' });
    y += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    tribRows.forEach(([nome, aliq, valor], index) => {
      pdf.setFillColor(index % 2 === 0 ? 255 : 249, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 251);
      pdf.rect(margin, y, contentW, 7, 'FD');
      pdf.setTextColor(55, 65, 81);
      pdf.text(String(nome), margin + 3, y + 4.5);
      pdf.text(String(aliq), margin + 95, y + 4.5, { align: 'center' });
      pdf.setTextColor(21, 128, 61);
      pdf.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor)), margin + contentW - 3, y + 4.5, { align: 'right' });
      y += 7;
    });

    pdf.setFillColor(240, 253, 244);
    pdf.rect(margin, y, contentW, 9, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(17, 24, 39);
    pdf.text('Economia potencial total', margin + 3, y + 5.5);
    pdf.text('43,25%', margin + 95, y + 5.5, { align: 'center' });
    pdf.setTextColor(21, 128, 61);
    pdf.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue * 0.4325), margin + contentW - 3, y + 5.5, { align: 'right' });
    y += 14;

    pdf.setFillColor(240, 253, 244);
    pdf.setDrawColor(134, 239, 172);
    pdf.roundedRect(margin, y, contentW, 16, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(21, 128, 61);
    pdf.text('Mensalidade após benefícios fiscais', margin + 4, y + 6);
    pdf.setFontSize(16);
    pdf.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcelaLeasing * (1 - 0.4325)), margin + 4, y + 13);
    y += 21;
  }

  if (proposal.number) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(156, 163, 175);
    pdf.text(proposal.number, margin, 287);
  }
}

export type PdfVariant = 'completo' | 'resumido' | 'tecnico' | 'comercial';

const VARIANT_SECTIONS: Record<PdfVariant, string[]> = {
  completo: ['cover', 'presentation', 'clients', 'objectives', 'equipment', 'results', 'details', 'products', 'template-extra', 'terms', 'images', 'attachments', 'commercial', 'signature'],
  resumido: ['cover', 'products', 'commercial', 'signature'],
  tecnico: ['cover', 'presentation', 'objectives', 'equipment', 'results', 'details', 'products', 'template-extra', 'images', 'terms', 'signature'],
  comercial: ['cover', 'presentation', 'clients', 'results', 'products', 'commercial', 'signature'],
};

export const PDF_VARIANT_LABELS: Record<PdfVariant, string> = {
  completo: 'Completo (todas as páginas)',
  resumido: 'Resumido (1-2 páginas)',
  tecnico: 'Técnico (foco em produtos)',
  comercial: 'Comercial (foco em valor)',
};

export async function generateProposalPdf(proposal: Partial<Proposal>, company: CompanySettings, variant: PdfVariant = 'completo'): Promise<boolean> {
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'fixed';
  tempContainer.style.left = '-200vw';
  tempContainer.style.top = '0';
  tempContainer.style.width = '210mm';
  tempContainer.style.backgroundColor = '#ffffff';
  tempContainer.style.zIndex = '-1';
  document.body.appendChild(tempContainer);

  const root = createRoot(tempContainer);

  try {
    root.render(React.createElement(ProposalPreview, { proposal, company, ref: null }));

    await waitForNextPaint(3);
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    await inlineAllImages(tempContainer);
    await waitForImagesToLoad(tempContainer);
    await waitForNextPaint(2);

    // Sections explicitly chosen by the user take precedence over variant defaults.
    const allowedSections = new Set(
      proposal.includedSections && proposal.includedSections.length > 0
        ? proposal.includedSections
        : VARIANT_SECTIONS[variant]
    );
    const allPages = Array.from(tempContainer.querySelectorAll('.pdf-page')) as HTMLElement[];
    const pages = allPages.filter((p) => {
      const sec = p.dataset.pdfSection;
      return !sec || allowedSections.has(sec);
    });

    if (pages.length === 0) {
      console.error('Nenhuma página PDF encontrada para exportação');
      return false;
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    let firstPage = true;

    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];

      if (!firstPage) pdf.addPage();
      firstPage = false;

      if (page.dataset.pdfAttachments === 'true') {
        renderAttachmentsNativePage(pdf, proposal.attachments || [], proposal.number);
        continue;
      }

      if (page.dataset.pdfCommercial === 'true') {
        renderCommercialConditionsNativePage(pdf, proposal);
        continue;
      }

      if (page.dataset.pdfSection === 'products') {
        renderProductsNativePages(pdf, proposal);
        while (page.nextElementSibling instanceof HTMLElement && page.nextElementSibling.dataset.pdfSection === 'products') {
          index += 1;
        }
        continue;
      }

      if (page.dataset.pdfSkip === 'true') {
        continue;
      }

      const bounds = page.getBoundingClientRect();
      await waitForImagesToLoad(page);
      await waitForNextPaint(1);

      // Cover page has a photo background → JPEG is fine and keeps file small.
      // All other pages are text-heavy → use PNG + higher scale so text stays razor-sharp.
      const isCover = page.dataset.pdfSection === 'cover';
      const scale = isCover ? 2.5 : 4;

      const canvas = await html2canvas(page, {
        scale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        width: Math.ceil(bounds.width),
        height: Math.ceil(bounds.height),
        windowWidth: Math.ceil(bounds.width),
        windowHeight: Math.ceil(bounds.height),
        scrollX: 0,
        scrollY: 0,
      });

      if (isCover) {
        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
      } else {
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
      }
    }


    const clientName = proposal.client?.name?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'Cliente';
    const suffix = variant === 'completo' ? '' : `_${variant}`;
    const filename = `${proposal.number || 'Proposta'}_${clientName}${suffix}.pdf`;
    pdf.save(filename);

    return true;
  } catch (error) {
    console.error('Erro ao gerar PDF da proposta', error);
    return false;
  } finally {
    root.unmount();
    document.body.removeChild(tempContainer);
  }
}

export async function openPrintWindow(proposal: Partial<Proposal>, company: CompanySettings, variant: PdfVariant = 'completo'): Promise<boolean> {
  return generateProposalPdf(proposal, company, variant);
}

