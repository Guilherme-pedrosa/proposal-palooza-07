import { useRef, useCallback } from 'react';
import { ProposalPreview } from './ProposalPreview';
import { Proposal } from '@/types/proposal';
import { CompanySettings } from '@/types/company';
import industrialKitchenBg from '@/assets/industrial-kitchen-bg.jpg';

interface PrintProposalProps {
  proposal: Partial<Proposal>;
  company: CompanySettings;
  onPrintComplete?: () => void;
}

// Convert image to base64 so it works inside the print iframe/window
async function getImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

export function usePrintProposal() {
  const printFrame = useRef<HTMLIFrameElement | null>(null);

  const printProposal = useCallback((proposal: Partial<Proposal>, company: CompanySettings) => {
    return new Promise<void>(async (resolve) => {
      // Pre-convert background image to base64
      const bgBase64 = await getImageAsBase64(industrialKitchenBg);

      // Also convert company logo if available
      let logoBase64: string | undefined;
      if (company.logo) {
        try {
          logoBase64 = await getImageAsBase64(company.logo);
        } catch {
          logoBase64 = undefined;
        }
      }

      // IMPORTANT: open window synchronously-ish to avoid popup blockers
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) {
        resolve();
        return;
      }

      // Show loading message immediately
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Gerando PDF...</title>
            <style>
              body { font-family: Arial, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; color:#334155; }
            </style>
          </head>
          <body>Preparando proposta para impressão...</body>
        </html>
      `);
      printWindow.document.close();

      // Create a temporary container to render ProposalPreview
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
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
      await new Promise(r => setTimeout(r, 600));

      // Clone the rendered content
      const clonedContent = tempContainer.cloneNode(true) as HTMLElement;

      // Replace background images with base64 versions
      const bgDivs = clonedContent.querySelectorAll('[style*="background-image"]');
      bgDivs.forEach((el) => {
        if (el instanceof HTMLElement) {
          const style = el.style.backgroundImage;
          if (style && (style.includes('industrial-kitchen') || style.includes('/assets/'))) {
            el.style.backgroundImage = `url('${bgBase64}')`;
          }
        }
      });

      // Replace logo images with base64 if available
      if (logoBase64) {
        const imgs = clonedContent.querySelectorAll('img');
        imgs.forEach((img) => {
          if (img.src && !img.src.includes('data:') && !img.src.includes('logo-wedo')) {
            img.src = logoBase64!;
          }
        });
      }

      // Get all stylesheets from the main document
      const styles = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch {
            if (sheet.href) {
              return `@import url("${sheet.href}");`;
            }
            return '';
          }
        })
        .join('\n');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Proposta ${proposal.number} - ${proposal.client?.name || 'Cliente'}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
              ${styles}

              * {
                box-sizing: border-box;
              }

              body {
                margin: 0;
                padding: 0;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }

              @page {
                size: A4 portrait;
                margin: 0;
              }

              @media print {
                body {
                  margin: 0;
                  padding: 0;
                }

                .pdf-page {
                  width: 210mm !important;
                  height: 297mm !important;
                  page-break-after: always !important;
                  page-break-inside: avoid !important;
                  overflow: hidden !important;
                  position: relative !important;
                }

                .pdf-page:last-child {
                  page-break-after: auto !important;
                }

                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
              }

              .proposal-preview {
                width: 210mm;
              }

              .pdf-page {
                width: 210mm;
                height: 297mm;
                overflow: hidden;
                position: relative;
                page-break-after: always;
                page-break-inside: avoid;
              }
            </style>
          </head>
          <body>
            ${clonedContent.innerHTML}
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 800);
      };

      // Cleanup React
      root.unmount();
      document.body.removeChild(tempContainer);

      resolve();
    });
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