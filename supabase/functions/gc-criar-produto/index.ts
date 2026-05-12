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
      preco_custo,          // valor de custo "puro" (sem despesas)
      despesas_acessorias,  // R$ - frete/seguro/etc (campo "Despesas acessórias" do GC)
      outras_despesas,      // R$ - opcional
      estoque,              // produto
      foto_url,             // produto (1ª foto)
      ncm,                  // produto - NCM fiscal
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

    // Checa duplicidade de código no GC (busca por código)
    if (codigo) {
      try {
        const buscaUrl = tipo === 'servico'
          ? `${GC_BASE_URL}/servicos?codigo=${encodeURIComponent(codigo)}`
          : `${GC_BASE_URL}/produtos?codigo_interno=${encodeURIComponent(codigo)}`;
        const checkResp = await fetch(buscaUrl, { headers });
        if (checkResp.ok) {
          const checkData = await checkResp.json();
          const lista = Array.isArray(checkData?.data) ? checkData.data : [];
          const colide = lista.some((it: any) =>
            String(it.codigo_interno ?? it.codigo ?? '') === String(codigo)
          );
          if (colide) {
            return new Response(JSON.stringify({
              sucesso: false,
              erro: `Código "${codigo}" já está em uso no GestãoClick.`,
            }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
      } catch (e) {
        console.warn('Falha ao checar duplicidade no GC:', e);
      }
    }

    let endpoint = '';
    let payload: Record<string, any> = {};

    if (tipo === 'servico') {
      endpoint = '/servicos';
      payload = {
        loja_id: GC_LOJA_ID,
        nome,
        codigo: codigo || undefined,
        observacoes: descricao || undefined,
      };
    } else {
      endpoint = '/produtos';

      // Busca tabelas de preço ativas e calcula valores via markup_padrao
      const supabaseTmp = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: tabelas } = await supabaseTmp
        .from('tabelas_preco')
        .select('gc_tipo_id, markup_padrao')
        .eq('ativa', true);

      const custo = preco_custo != null ? Number(preco_custo) : 0;
      const desp = despesas_acessorias != null ? Number(despesas_acessorias) : 0;
      const outras = outras_despesas != null ? Number(outras_despesas) : 0;
      const custoFinal = +(custo + desp + outras).toFixed(2);

      const valores = (tabelas ?? []).map((t: any) => {
        const markup = Number(t.markup_padrao) || 0;
        const valor_venda = +(custoFinal * (1 + markup / 100)).toFixed(2);
        return {
          tipo_id: Number(t.gc_tipo_id),
          valor_custo: custoFinal,
          valor_venda,
          lucro_utilizado: markup,
        };
      });

      payload = {
        loja_id: GC_LOJA_ID,
        nome,
        codigo_interno: codigo || undefined,
        descricao: descricao || undefined,
        unidade: unidade || 'UN',
        estoque: estoque != null ? Number(estoque) : 0,
        valor_custo: custo,
        despesas_acessorias: desp > 0 ? desp : undefined,
        outras_despesas: outras > 0 ? outras : undefined,
        ativo: ativo ? '1' : '0',
        nome_grupo: categoria || undefined,
        ncm: ncm ? String(ncm).replace(/\D/g, '') : undefined,
        fotos: foto_url ? [foto_url] : undefined,
        valores: valores.length > 0 ? valores : undefined,
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
      preco_venda: null,
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

    // Grava preços locais (precos_produto) para tipo produto
    if (tipo !== 'servico' && upserted?.id) {
      try {
        const custoBase = preco_custo != null ? Number(preco_custo) : 0;
        const dAcc = despesas_acessorias != null ? Number(despesas_acessorias) : 0;
        const dOut = outras_despesas != null ? Number(outras_despesas) : 0;
        const custoLocal = +(custoBase + dAcc + dOut).toFixed(2);
        const { data: tabelasFull } = await supabase
          .from('tabelas_preco')
          .select('id, gc_tipo_id, markup_padrao')
          .eq('ativa', true);
        const rows = (tabelasFull ?? []).map((t: any) => ({
          produto_id: upserted.id,
          tabela_preco_id: t.id,
          valor_custo: custoLocal,
          valor_venda: +(custoLocal * (1 + (Number(t.markup_padrao) || 0) / 100)).toFixed(2),
          lucro_percentual: Number(t.markup_padrao) || 0,
        }));
        if (rows.length > 0) {
          // Limpa antigos e insere
          await supabase.from('precos_produto').delete().eq('produto_id', upserted.id);
          await supabase.from('precos_produto').insert(rows);
        }
      } catch (e) {
        console.error('Erro ao gravar precos_produto:', e);
      }
    }

    return new Response(JSON.stringify({ sucesso: true, gc_id: gcId, produto: upserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Erro gc-criar-produto:', e);
    return new Response(JSON.stringify({ sucesso: false, erro: e instanceof Error ? e.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
