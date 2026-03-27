import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GC_BASE_URL = 'https://api.gestaoclick.com';
const GC_LOJA_ID = 446246;
const GC_RATE_LIMIT_DELAY_MS = 350;
const GC_MAX_RETRIES = 3;
const GC_MAX_PER_PAGE = 100;

async function fetchComRetry(url: string, headers: Record<string, string>, maxRetries: number): Promise<Response> {
  for (let tentativa = 0; tentativa < maxRetries; tentativa++) {
    const response = await fetch(url, { headers });
    if (response.status === 429) {
      const espera = Math.pow(2, tentativa) * 1000;
      await new Promise(r => setTimeout(r, espera));
      continue;
    }
    return response;
  }
  throw new Error('Máximo de tentativas atingido');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const ACCESS_TOKEN = Deno.env.get('GC_ACCESS_TOKEN')!;
  const SECRET_TOKEN = Deno.env.get('GC_SECRET_ACCESS_TOKEN')!;

  if (!ACCESS_TOKEN || !SECRET_TOKEN) {
    return new Response(JSON.stringify({ erro: 'Credenciais GC não configuradas' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const gcHeaders = {
    'access-token': ACCESS_TOKEN,
    'secret-access-token': SECRET_TOKEN,
    'Content-Type': 'application/json',
  };

  let pagina = 1;
  let totalSincronizados = 0;
  let erros = 0;
  let continuar = true;

  while (continuar) {
    if (pagina > 1) {
      await new Promise(resolve => setTimeout(resolve, GC_RATE_LIMIT_DELAY_MS));
    }

    const url = `${GC_BASE_URL}/clientes?` + new URLSearchParams({
      loja_id: String(GC_LOJA_ID),
      limite: String(GC_MAX_PER_PAGE),
      pagina: String(pagina),
    });

    try {
      const response = await fetchComRetry(url, gcHeaders, GC_MAX_RETRIES);

      if (!response.ok) {
        await supabase.from('gc_sync_log').insert({
          entidade: 'clientes', acao: 'sync_pagina',
          status: 'erro',
          detalhes: { pagina, status: response.status, body: await response.text() }
        });
        break;
      }

      const body = await response.json();
      const clientes = body?.data || body;

      if (!Array.isArray(clientes) || clientes.length === 0) {
        continuar = false;
        break;
      }

      const registros = clientes.map((c: any) => {
        const enderecoGc = c?.enderecos?.[0]?.endereco;
        const logradouro = enderecoGc?.logradouro ?? c.logradouro ?? null;
        const numero = enderecoGc?.numero ? String(enderecoGc.numero) : null;
        const complemento = enderecoGc?.complemento ? String(enderecoGc.complemento) : null;
        const bairro = enderecoGc?.bairro ? String(enderecoGc.bairro) : null;
        const enderecoMontado = [logradouro, numero, complemento, bairro].filter(Boolean).join(', ') || null;
        const cidade = enderecoGc?.nome_cidade ?? c.cidade ?? null;
        const estado = enderecoGc?.estado ?? c.estado ?? null;

        return {
          gc_id: String(c.id),
          tipo_pessoa: c.tipo_pessoa || 'PJ',
          nome: c.nome || c.razao_social || 'Sem nome',
          razao_social: c.razao_social,
          cnpj: c.cnpj,
          cpf: c.cpf,
          telefone: c.telefone,
          celular: c.celular,
          email: c.email,
          endereco: enderecoMontado,
          cidade,
          estado,
          ativo: c.ativo !== false,
          gc_synced_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('clientes_gc')
        .upsert(registros, { onConflict: 'gc_id', ignoreDuplicates: false });

      if (error) {
        erros++;
      } else {
        totalSincronizados += registros.length;
      }

      if (clientes.length < GC_MAX_PER_PAGE) {
        continuar = false;
      } else {
        pagina++;
      }
    } catch (e) {
      erros++;
      continuar = false;
    }
  }

  // Atualizar segmentos via CNAE da Receita Federal
  await supabase.rpc('atualizar_segmentos_clientes');

  await supabase.from('gc_sync_log').insert({
    entidade: 'clientes',
    acao: 'sync_completo',
    status: erros === 0 ? 'sucesso' : 'parcial',
    detalhes: { total: totalSincronizados, erros, paginas: pagina }
  });

  return new Response(JSON.stringify({
    sucesso: true, total: totalSincronizados, erros
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
