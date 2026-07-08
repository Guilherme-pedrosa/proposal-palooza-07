import React from 'react';
import { createRoot } from 'react-dom/client';
import { Proposal } from '@/types/proposal';
import { CompanySettings } from '@/types/company';
import { ProposalPreview } from '@/components/proposal/ProposalPreview';
import { getImageAsBase64 } from '@/lib/pdfImageUtils';
import pdfPrintCss from '@/styles/pdf-print.css?raw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const FN_URL = `${SUPABASE_URL}/functions/v1/generate-proposal-pdf`;

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

const nextPaint = (n = 1) =>
  new Promise<void>((resolve) => {
    let left = n;
    const tick = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

async function waitImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.addEventListener('load', () => res(), { once: true });
            img.addEventListener('error', () => res(), { once: true });
            setTimeout(() => res(), 8000);
          }),
    ),
  );
}

async function inlineImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('data:')) return;
      try {
        const dataUrl = await getImageAsBase64(src);
        if (dataUrl) img.setAttribute('src', dataUrl);
      } catch { /* ignore */ }
    }),
  );

  // Inline background-image urls declaradas via style inline
  const bgEls = Array.from(root.querySelectorAll<HTMLElement>('[style*="background-image"]'));
  await Promise.all(
    bgEls.map(async (el) => {
      const style = el.getAttribute('style') || '';
      const match = style.match(/background-image:\s*url\((['"]?)([^'")]+)\1\)/i);
      if (!match) return;
      const url = match[2];
      if (url.startsWith('data:')) return;
      try {
        const dataUrl = await getImageAsBase64(url);
        if (dataUrl) {
          el.setAttribute(
            'style',
            style.replace(match[0], `background-image: url("${dataUrl}")`),
          );
        }
      } catch { /* ignore */ }
    }),
  );
}

async function collectDocumentStyles(): Promise<string> {
  const parts: string[] = [];

  // <style> inline (Tailwind em dev usa isso)
  document.querySelectorAll('style').forEach((s) => {
    parts.push(s.textContent || '');
  });

  // <link rel="stylesheet"> (Tailwind em produção usa isso)
  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  );
  await Promise.all(
    links.map(async (link) => {
      try {
        const resp = await fetch(link.href, { credentials: 'omit' });
        if (resp.ok) parts.push(await resp.text());
      } catch { /* ignore */ }
    }),
  );

  return parts.join('\n');
}

function buildHtmlDocument(bodyHtml: string, appCss: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=210mm" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&display=swap" />
<style>${appCss}</style>
<style>${pdfPrintCss}</style>
</head>
<body>
${bodyHtml}
<div class="pdf-ready" style="width:0;height:0;overflow:hidden;"></div>
</body>
</html>`;
}

export async function generateProposalPdf(
  proposal: Partial<Proposal>,
  company: CompanySettings,
  variant: PdfVariant = 'completo',
): Promise<boolean> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-200vw';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.background = '#ffffff';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    root.render(React.createElement(ProposalPreview, { proposal, company, ref: null }));

    await nextPaint(3);
    if (document.fonts?.ready) await document.fonts.ready;
    await waitImages(container);
    await inlineImages(container);
    await nextPaint(2);

    const allowed = new Set(
      proposal.includedSections && proposal.includedSections.length > 0
        ? proposal.includedSections
        : VARIANT_SECTIONS[variant],
    );

    const pages = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page')).filter((p) => {
      const sec = p.dataset.pdfSection;
      return !sec || allowed.has(sec);
    });

    if (pages.length === 0) {
      console.error('Nenhuma página encontrada para exportação');
      return false;
    }

    const bodyHtml = pages.map((p) => p.outerHTML).join('\n');
    const appCss = await collectDocumentStyles();
    const fullHtml = buildHtmlDocument(bodyHtml, appCss);

    const clientName = proposal.client?.name?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'Cliente';
    const suffix = variant === 'completo' ? '' : `_${variant}`;
    const filename = `${proposal.number || 'Proposta'}_${clientName}${suffix}.pdf`;

    const resp = await fetch(FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ html: fullHtml, filename }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Falha ao gerar PDF via edge function', resp.status, errText);
      return false;
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    return true;
  } catch (err) {
    console.error('Erro ao gerar PDF', err);
    return false;
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

export async function openPrintWindow(
  proposal: Partial<Proposal>,
  company: CompanySettings,
  variant: PdfVariant = 'completo',
): Promise<boolean> {
  return generateProposalPdf(proposal, company, variant);
}
