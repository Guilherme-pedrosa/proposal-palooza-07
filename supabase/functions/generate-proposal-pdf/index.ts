// Edge Function: generate-proposal-pdf
// Recebe HTML da proposta e retorna PDF binário renderizado pelo Chromium (Browserless).
// Mantém o texto selecionável, pesquisável e copiável.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const BROWSERLESS_TOKEN = Deno.env.get('BROWSERLESS_TOKEN');
const BROWSERLESS_ENDPOINT = 'https://production-sfo.browserless.io/pdf';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!BROWSERLESS_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'BROWSERLESS_TOKEN não configurado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let body: { html?: string; filename?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const html = body?.html;
  const filename = body?.filename || 'proposta.pdf';

  if (typeof html !== 'string' || html.length < 100) {
    return new Response(JSON.stringify({ error: 'HTML ausente ou muito pequeno' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const browserlessResp = await fetch(
      `${BROWSERLESS_ENDPOINT}?token=${encodeURIComponent(BROWSERLESS_TOKEN)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html,
          options: {
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
          },
          gotoOptions: { waitUntil: 'networkidle0', timeout: 45000 },
          waitForSelector: { selector: '.pdf-ready', timeout: 15000 },
        }),
      },
    );

    if (!browserlessResp.ok) {
      const errText = await browserlessResp.text();
      console.error('Browserless erro', browserlessResp.status, errText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: 'Falha ao renderizar PDF', detail: errText.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const pdfBuffer = await browserlessResp.arrayBuffer();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Erro na edge function', err);
    return new Response(
      JSON.stringify({ error: String((err as Error).message || err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
