import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Proposal } from '@/types/proposal';
import { CompanySettings } from '@/types/company';
import industrialKitchenBg from '@/assets/industrial-kitchen-bg.jpg';
import { buildPdfSafeImageUrl, getImageAsBase64 } from '@/lib/pdfImageUtils';

async function waitForImagesToLoad(container: ParentNode): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));

  await Promise.all(
    images.map(async (img) => {
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
    })
  );
}

export async function openPrintWindow(proposal: Partial<Proposal>, company: CompanySettings): Promise<boolean> {
  const previewElement = document.querySelector('.proposal-preview');

  if (!(previewElement instanceof HTMLElement)) {
    console.error('Preview element not found');
    return false;
  }

  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-99999px';
  tempContainer.style.top = '0';
  tempContainer.style.width = '210mm';
  tempContainer.style.backgroundColor = '#ffffff';

  const clonedContent = previewElement.cloneNode(true) as HTMLElement;
  tempContainer.appendChild(clonedContent);
  document.body.appendChild(tempContainer);

  try {
    const bgImageBase64 = await getImageAsBase64(industrialKitchenBg);

    const bgDivs = tempContainer.querySelectorAll('[style*="background-image"]');
    bgDivs.forEach((el) => {
      if (el instanceof HTMLElement) {
        const backgroundImage = el.style.backgroundImage;
        if (backgroundImage && (backgroundImage.includes('industrial-kitchen') || backgroundImage.includes('/assets/'))) {
          el.style.backgroundImage = `url('${bgImageBase64}')`;
        }
      }
    });

    const allImages = Array.from(tempContainer.querySelectorAll('img'));
    await Promise.all(
      allImages.map(async (img) => {
        if (!img.src || img.src.startsWith('data:')) return;

        const safeSrc = buildPdfSafeImageUrl(img.src);
        const base64 = await getImageAsBase64(safeSrc);
        if (base64) {
          img.src = base64;
        }
      })
    );

    await waitForImagesToLoad(tempContainer);

    const pages = Array.from(tempContainer.querySelectorAll('.pdf-page')) as HTMLElement[];
    if (pages.length === 0) {
      return false;
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;

    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      page.style.position = 'relative';
      page.style.left = '0';

      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: page.scrollWidth || page.offsetWidth,
        height: page.scrollHeight || page.offsetHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (index > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
    }

    const clientName = proposal.client?.name?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'Cliente';
    const filename = `${proposal.number || 'Proposta'}_${clientName}.pdf`;
    pdf.save(filename);

    return true;
  } catch (error) {
    console.error('Erro ao gerar PDF da proposta', error);
    return false;
  } finally {
    document.body.removeChild(tempContainer);
  }
}
