import { Proposal } from '@/types/proposal';
import { CompanySettings } from '@/types/company';
import industrialKitchenBg from '@/assets/industrial-kitchen-bg.jpg';

// Convert image to base64 for print HTML
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

export async function openPrintWindow(proposal: Partial<Proposal>, company: CompanySettings): Promise<boolean> {
  const previewElement = document.querySelector('.proposal-preview');

  if (!previewElement) {
    console.error('Preview element not found');
    return false;
  }

  // IMPORTANT: open window synchronously from user click to avoid popup blockers
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    return false;
  }

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

  const clonedContent = previewElement.cloneNode(true) as HTMLElement;
  const bgImageBase64 = await getImageAsBase64(industrialKitchenBg);

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

  const coverDiv = clonedContent.querySelector('.pdf-page');
  if (coverDiv) {
    const bgDiv = coverDiv.querySelector('.bg-cover');
    if (bgDiv instanceof HTMLElement) {
      bgDiv.style.backgroundImage = `url('${bgImageBase64}')`;
    }
  }

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
        ${clonedContent.outerHTML}
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

  return true;
}
