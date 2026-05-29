import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GC = 'https://api.gestaoclick.com';
const LOJA_ID = 446246;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('UPABASE_SERVICE_ROLE_KEY')!,
  );
  const AT = Deno.env.get('GC_ACCESS_TOKEN')!;
  const ST = Deno.env.get('GC_SECRET_ACCESS_TOKEN')!;
  const gcHeaders = {
    'access-token': AT,
    'secret-access-token': ST,
    'Content-Type': 'application/json',
  };

  const body = await req.json();
  const items = (body.items ?? []) as {
    gc_id: string;
    codigo: string;
    nome: string;
    descricao: string;
    foto_url: string;
  }[];
  const probeOnly = !!body.probe;

  const results: any[] = [];
  for (const it of items) {
    // GET existing product
    const getResp = await fetch(`${GC}/produtos/${it.gc_id}`, { headers: gcHeaders });
    const getJson = await getResp.json();
    if (probeOnly) {
      results.push({ gc_id: it.gc_id, get_status: getResp.status, sample: getJson });
      continue;
    }
    const existing = getJson?.data ?? {};

    // Build a clean payload — only writable fields, preserve prices/group/etc.
    const valoresClean = Array.isArray(existing.valores)
      ? existing.valores.map((v: any) => ({
          tipo_id: Number(v.tipo_id),
          lucro_utilizado: parseFloat(v.lucro_utilizado) || 0,
          valor_custo: parseFloat(v.valor_custo) || 0,
          valor_venda: parseFloat(v.valor_venda) || 0,
        }))
      : undefined;

    const merged: Record<string, any> = {
      loja_id: LOJA_ID,
      nome: it.nome,
      codigo_interno: it.codigo,
      descricao: it.descricao,
      fotos: [it.foto_url],
      ativo: existing.ativo ?? '1',
      grupo_id: existing.grupo_id ? Number(existing.grupo_id) : undefined,
      unidade_id: existing.unidade_id ? Number(existing.unidade_id) : undefined,
      marca_id: existing.marca_id ? Number(existing.marca_id) : undefined,
      movimenta_estoque: existing.movimenta_estoque ?? '1',
      valor_custo: parseFloat(existing.valor_custo) || 0,
      valor_venda: parseFloat(existing.valor_venda) || 0,
      valores: valoresClean,
    };
    Object.keys(merged).forEach((k) => merged[k] === undefined && delete merged[k]);

    const putResp = await fetch(`${GC}/produtos/${it.gc_id}`, {
      method: 'PUT',
      headers: gcHeaders,
      body: JSON.stringify(merged),
    });
    const putText = await putResp.text();
    const gcOk = putResp.ok && !putText.includes('"status":"error"');

    let dbErr: string | null = null;
    if (gcOk) {
      const { error } = await supa
        .from('produtos_gc')
        .update({
          descricao: it.descricao,
          foto_url: it.foto_url,
          fotos_urls: [it.foto_url],
          gc_synced_at: new Date().toISOString(),
        })
        .eq('gc_id', it.gc_id);
      dbErr = error?.message ?? null;
    }

    results.push({
      gc_id: it.gc_id,
      codigo: it.codigo,
      gc_status: putResp.status,
      gc_ok: gcOk,
      gc_body: gcOk ? null : putText.slice(0, 400),
      db_error: dbErr,
      payload_keys: Object.keys(merged),
    });

    await new Promise((r) => setTimeout(r, 350));
  }

  const ok = results.filter((r) => r.gc_ok && !r.db_error).length;
  return new Response(JSON.stringify({ ok, total: items.length, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
