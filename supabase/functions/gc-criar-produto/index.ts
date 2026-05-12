import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GC_BASE_URL = 'https://api.gestaoclick.com';
const GC_LOJA_ID = 446246;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ACCESS_TOKEN = Deno.env.get('GC_ACCESS_TOKEN');
    const SECRET_TOKEN = Deno.env.get('GC_SECRET_ACCESS_TOKEN');
    if (!ACCESS_TOKEN || !SECRET_TOKEN) {
      return new Response(JSON.stringify({ sucesso: false, erro: 'Credenciais GC não configuradas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const {
      tipo = 'produto', // 'produto' | 'servico'
      nome,
      codigo,
      descricao,
      categoria,            // nome do grupo (produto)
      unidade,              // produto
      preco_custo,
      estoque,              // produto
      foto_url,             // produto (1ª foto)
      ativo = true,
    } = body ?? {};

    if (!nome || typeof nome !== 'string') {
      return new Response(JSON.stringify({ sucesso: false, erro: 'Nome é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const headers = {
      'access-token': ACCESS_TOKEN,
      'secret-access-token': SECRET_TOKEN,
      'Content-Type': 'application/json',
    };

    let endpoint = '';
    let payload: Record<string, any> = {};

    if (tipo === 'servico') {
      endpoint = '/servicos';
      payload = {
        loja_id: GC_LOJA_ID,
        nome,
        codigo: codigo || undefined,
        valor_venda: preco_venda != null ? Number(preco_venda) : 0,
        observacoes: descricao || undefined,
      };
    } else {
      endpoint = '/produtos';
      payload = {
        loja_id: GC_LOJA_ID,
        nome,
        codigo_interno: codigo || undefined,
        descricao: descricao || undefined,
        unidade: unidade || 'UN',
        estoque: estoque != null ? Number(estoque) : 0,
        valor_venda: preco_venda != null ? Number(preco_venda) : 0,
        valor_custo: preco_custo != null ? Number(preco_custo) : 0,
        ativo: ativo ? '1' : '0',
        nome_grupo: categoria || undefined,
        fotos: foto_url ? [foto_url] : undefined,
      };
    }

    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    console.log('Creating in GC:', endpoint, JSON.stringify(payload));
    const resp = await fetch(`${GC_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    console.log('GC response:', resp.status, JSON.stringify(data));

    if (!resp.ok || (data.code && data.code !== 200)) {
      return new Response(JSON.stringify({
        sucesso: false,
        erro: data.message || data.error || `Erro ${resp.status} ao cadastrar no GestãoClick`,
        detalhes: data,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const gcId = String(data.data?.id ?? data.id ?? '');
    if (!gcId) {
      return new Response(JSON.stringify({ sucesso: false, erro: 'GC não retornou ID', detalhes: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Upsert local cache
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const fotos = foto_url ? [foto_url] : [];
    const registro = {
      gc_id: gcId,
      codigo: codigo || null,
      nome,
      descricao: descricao || null,
      categoria: tipo === 'servico' ? 'Serviços' : (categoria || null),
      tipo,
      preco_venda: preco_venda != null ? Number(preco_venda) : null,
      unidade: tipo === 'servico' ? 'SV' : (unidade || 'UN'),
      estoque_atual: tipo === 'servico' ? 0 : (estoque != null ? Number(estoque) : 0),
      ativo: !!ativo,
      foto_url: fotos[0] || null,
      fotos_urls: fotos,
      gc_synced_at: new Date().toISOString(),
    };

    const { data: upserted, error } = await supabase
      .from('produtos_gc')
      .upsert(registro, { onConflict: 'gc_id', ignoreDuplicates: false })
      .select()
      .single();

    if (error) {
      console.error('Upsert local error:', error);
      return new Response(JSON.stringify({ sucesso: true, gc_id: gcId, aviso: 'Criado no GC, mas falhou cache local', erro_local: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ sucesso: true, gc_id: gcId, produto: upserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Erro gc-criar-produto:', e);
    return new Response(JSON.stringify({ sucesso: false, erro: e instanceof Error ? e.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
