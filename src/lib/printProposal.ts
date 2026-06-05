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

export async function generateProposalPdf(proposal: Partial<Proposal>, company: CompanySettings): Promise<boolean> {
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

    const pages = Array.from(tempContainer.querySelectorAll('.pdf-page')) as HTMLElement[];
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

      // Native render for attachments page (crisp text + clickable links)
      if (page.dataset.pdfAttachments === 'true') {
        renderAttachmentsNativePage(pdf, proposal.attachments || [], proposal.number);
        continue;
      }

      if (page.dataset.pdfSkip === 'true') {
        continue;
      }

      const bounds = page.getBoundingClientRect();
      await waitForImagesToLoad(page);
      await waitForNextPaint(1);

      const canvas = await html2canvas(page, {
        scale: 2.5,
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

      // JPEG q=0.85 reduz o PDF de ~60MB para ~2-5MB sem perda visual perceptível.
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
    }

    const clientName = proposal.client?.name?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'Cliente';
    const filename = `${proposal.number || 'Proposta'}_${clientName}.pdf`;
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

export async function openPrintWindow(proposal: Partial<Proposal>, company: CompanySettings): Promise<boolean> {
  return generateProposalPdf(proposal, company);
}
