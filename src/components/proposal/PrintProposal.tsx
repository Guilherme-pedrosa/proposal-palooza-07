import { useRef, useCallback } from 'react';
import { ProposalPreview } from './ProposalPreview';
import { Proposal } from '@/types/proposal';
import { CompanySettings } from '@/types/company';
import industrialKitchenBg from '@/assets/industrial-kitchen-bg.jpg';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { buildPdfSafeImageUrl, getImageAsBase64 } from '@/lib/pdfImageUtils';

interface PrintProposalProps {
  proposal: Partial<Proposal>;
  company: CompanySettings;
  onPrintComplete?: () => void;
}

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

export function usePrintProposal() {
  const printFrame = useRef<HTMLIFrameElement | null>(null);

  const printProposal = useCallback(async (proposal: Partial<Proposal>, company: CompanySettings) => {
    // Pre-convert background image to base64
    const bgBase64 = await getImageAsBase64(industrialKitchenBg);

    // Create a temporary container to render ProposalPreview
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '210mm';
    document.body.appendChild(tempContainer);

    const { createRoot } = await import('react-dom/client');
    const React = await import('react');

    const root = createRoot(tempContainer);

    const PreviewWrapper = () => {
      return React.createElement(ProposalPreview, {
        proposal,
        company,
        ref: null
      });
    };

    root.render(React.createElement(PreviewWrapper));

    // Wait for React render to complete
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    // Replace background images with base64
    const bgDivs = tempContainer.querySelectorAll('[style*="background-image"]');
    bgDivs.forEach((el) => {
      if (el instanceof HTMLElement) {
        const style = el.style.backgroundImage;
        if (style && (style.includes('industrial-kitchen') || style.includes('/assets/'))) {
          el.style.backgroundImage = `url('${bgBase64}')`;
        }
      }
    });

    // Convert ALL images to base64
    const allImgs = tempContainer.querySelectorAll('img');
    const imgConversions = Array.from(allImgs).map(async (img) => {
      if (!img.src || img.src.startsWith('data:')) return;
      try {
        const safeSrc = buildPdfSafeImageUrl(img.src);
        const b64 = await getImageAsBase64(safeSrc);
        img.src = b64;
        await new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }

          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        });
      } catch {
        // Keep original src if conversion fails
      }
    });
    await Promise.all(imgConversions);

    await waitForImagesToLoad(tempContainer);

    // Get all pdf-page elements
    const pages = tempContainer.querySelectorAll('.pdf-page');
    
    if (pages.length === 0) {
      root.unmount();
      document.body.removeChild(tempContainer);
      return;
    }

    // A4 dimensions in mm
    const A4_W = 210;
    const A4_H = 297;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;

      // Ensure the page is visible for html2canvas
      page.style.position = 'relative';
      page.style.left = '0';

      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: page.offsetWidth,
        height: page.offsetHeight,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, A4_W, A4_H);
    }

    // Generate filename
    const clientName = proposal.client?.name?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'Cliente';
    const filename = `${proposal.number || 'Proposta'}_${clientName}.pdf`;

    pdf.save(filename);

    // Cleanup
    root.unmount();
    document.body.removeChild(tempContainer);
  }, []);

  return { printProposal };
}

export function PrintProposalButton({ 
  proposal, 
  company, 
  className,
  children 
}: PrintProposalProps & { className?: string; children: React.ReactNode }) {
  const { printProposal } = usePrintProposal();

  const handlePrint = async () => {
    await printProposal(proposal, company);
  };

  return (
    <button onClick={handlePrint} className={className}>
      {children}
    </button>
  );
}
