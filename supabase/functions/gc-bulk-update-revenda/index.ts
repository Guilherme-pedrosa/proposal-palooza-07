import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GC = 'https://api.gestaoclick.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('UPABASE_SERVICE_ROLE_KEY')!,
  );
  const AT = Deno.env.get('GC_ACCESS_TOKEN')!;
  const ST = Deno.env.get('GC_SECRET_ACCESS_TOKEN')!;

  const { items } = await req.json() as {
    items: { gc_id: string; codigo: string; nome: string; descricao: string; foto_url: string }[];
  };

  const results: any[] = [];
  for (const it of items) {
    // PUT in GC
    const gcResp = await fetch(`${GC}/produtos/${it.gc_id}`, {
      method: 'PUT',
      headers: {
        'access-token': AT,
        'secret-access-token': ST,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nome: it.nome,
        codigo_interno: it.codigo,
        descricao: it.descricao,
        fotos: [it.foto_url],
      }),
    });
    const gcText = await gcResp.text();
    const gcOk = gcResp.ok;

    // Local DB update
    const { error } = await supa
      .from('produtos_gc')
      .update({
        descricao: it.descricao,
        foto_url: it.foto_url,
        fotos_urls: [it.foto_url],
        gc_synced_at: new Date().toISOString(),
      })
      .eq('gc_id', it.gc_id);

    results.push({
      gc_id: it.gc_id,
      codigo: it.codigo,
      gc_status: gcResp.status,
      gc_ok: gcOk,
      gc_body: gcOk ? null : gcText.slice(0, 300),
      db_error: error?.message ?? null,
    });

    await new Promise((r) => setTimeout(r, 350));
  }

  const ok = results.filter((r) => r.gc_ok && !r.db_error).length;
  return new Response(JSON.stringify({ ok, total: items.length, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
