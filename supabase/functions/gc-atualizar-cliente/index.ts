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
    const ACCESS_TOKEN = Deno.env.get('GC_ACCESS_TOKEN')!;
    const SECRET_TOKEN = Deno.env.get('GC_SECRET_ACCESS_TOKEN')!;

    if (!ACCESS_TOKEN || !SECRET_TOKEN) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'Credenciais GC não configuradas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      gc_id, tipo_pessoa, nome, razao_social, cnpj, cpf,
      telefone, celular, email, endereco, cidade, estado, cep,
      inscricao_estadual, contato,
    } = body;

    if (!gc_id) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'gc_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = {
      'access-token': ACCESS_TOKEN,
      'secret-access-token': SECRET_TOKEN,
      'Content-Type': 'application/json',
    };

    // Fetch existing to preserve required fields
    const existingResp = await fetch(`${GC_BASE_URL}/clientes/${gc_id}`, { headers });
    const existingBody = await existingResp.json();
    const existing = existingBody?.data || existingBody || {};

    const gcPayload: Record<string, any> = {
      loja_id: GC_LOJA_ID,
      tipo_pessoa: tipo_pessoa || existing.tipo_pessoa || 'PJ',
      nome: nome ?? existing.nome,
      ativo: '1',
    };

    if (razao_social !== undefined) gcPayload.razao_social = razao_social || '';
    if (cnpj !== undefined) gcPayload.cnpj = cnpj || '';
    if (cpf !== undefined) gcPayload.cpf = cpf || '';
    if (telefone !== undefined) gcPayload.telefone = telefone || '';
    if (celular !== undefined) gcPayload.celular = celular || '';
    if (email !== undefined) gcPayload.email = email || '';
    if (inscricao_estadual !== undefined) gcPayload.inscricao_estadual = inscricao_estadual || '';

    if (contato !== undefined && contato !== null && contato !== '') {
      gcPayload.contatos = [{ contato: { nome: contato } }];
    }

    if (endereco || cidade || estado || cep) {
      gcPayload.enderecos = [{
        endereco: {
          cep: cep || '',
          logradouro: endereco || '',
          numero: '',
          complemento: '',
          bairro: '',
          nome_cidade: cidade || '',
          estado: estado || '',
        }
      }];
    }

    console.log('Updating client in GestãoClick:', gc_id, JSON.stringify(gcPayload));

    const response = await fetch(`${GC_BASE_URL}/clientes/${gc_id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(gcPayload),
    });

    const responseData = await response.json();
    console.log('GC update response:', JSON.stringify(responseData));

    if (!response.ok || (responseData.code && responseData.code !== 200)) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          erro: responseData.message || responseData.error || 'Erro ao atualizar no GestãoClick',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ sucesso: true, gc_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating client in GC:', error);
    return new Response(
      JSON.stringify({ sucesso: false, erro: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
