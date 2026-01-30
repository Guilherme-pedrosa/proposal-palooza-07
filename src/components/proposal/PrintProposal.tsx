import { useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ProposalPreview } from './ProposalPreview';
import { Proposal } from '@/types/proposal';
import { CompanySettings } from '@/types/company';

interface PrintProposalProps {
  proposal: Partial<Proposal>;
  company: CompanySettings;
  onPrintComplete?: () => void;
}

export function usePrintProposal() {
  const printFrame = useRef<HTMLIFrameElement | null>(null);

  const printProposal = useCallback((proposal: Partial<Proposal>, company: CompanySettings) => {
    return new Promise<void>((resolve) => {
      // Create a hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        resolve();
        return;
      }

      // Get all stylesheets from the main document
      const styles = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch {
            // External stylesheets may throw CORS errors
            if (sheet.href) {
              return `@import url("${sheet.href}");`;
            }
            return '';
          }
        })
        .join('\n');

      // Create the print content
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Proposta ${proposal.number}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
              ${styles}
              
              * {
                box-sizing: border-box;
              }
              
              body {
                margin: 0;
                padding: 0;
                font-family: 'Inter', sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
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
            <div id="print-root"></div>
          </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(printContent);
      iframeDoc.close();

      // Wait for iframe to load
      iframe.onload = () => {
        const printRoot = iframeDoc.getElementById('print-root');
        if (!printRoot) {
          document.body.removeChild(iframe);
          resolve();
          return;
        }

        // Create a temporary container in the main document to render React
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        document.body.appendChild(tempContainer);

        // Import ReactDOM to render the component
        import('react-dom/client').then(({ createRoot }) => {
          import('react').then((React) => {
            const root = createRoot(tempContainer);
            
            const PreviewWrapper = () => {
              return React.createElement(ProposalPreview, {
                proposal,
                company,
                ref: null
              });
            };

            root.render(React.createElement(PreviewWrapper));

            // Wait for render to complete
            setTimeout(() => {
              // Copy the rendered HTML to the iframe
              printRoot.innerHTML = tempContainer.innerHTML;

              // Wait a bit for styles to apply
              setTimeout(() => {
                iframe.contentWindow?.print();
                
                // Cleanup after print dialog closes
                setTimeout(() => {
                  root.unmount();
                  document.body.removeChild(tempContainer);
                  document.body.removeChild(iframe);
                  resolve();
                }, 500);
              }, 500);
            }, 500);
          });
        });
      };

      // Trigger load
      printFrame.current = iframe;
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
