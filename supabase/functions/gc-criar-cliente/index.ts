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
      tipo_pessoa, nome, razao_social, cnpj, cpf,
      telefone, celular, email, endereco, cidade, estado, cep,
      inscricao_estadual, contato,
    } = body;

    if (!nome) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'Nome é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build GC payload
    const gcPayload: Record<string, any> = {
      tipo_pessoa: tipo_pessoa || 'PJ',
      nome,
      loja_id: GC_LOJA_ID,
      ativo: '1',
    };

    if (razao_social) gcPayload.razao_social = razao_social;
    if (cnpj) gcPayload.cnpj = cnpj;
    if (cpf) gcPayload.cpf = cpf;
    if (telefone) gcPayload.telefone = telefone;
    if (celular) gcPayload.celular = celular;
    if (email) gcPayload.email = email;
    if (inscricao_estadual) gcPayload.inscricao_estadual = inscricao_estadual;
    if (contato) {
      gcPayload.contatos = [{ contato: { nome: contato } }];
    }


    // Build address if provided
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

    console.log('Creating client in GestãoClick:', JSON.stringify(gcPayload));

    const response = await fetch(`${GC_BASE_URL}/clientes`, {
      method: 'POST',
      headers: {
        'access-token': ACCESS_TOKEN,
        'secret-access-token': SECRET_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gcPayload),
    });

    const responseData = await response.json();
    console.log('GC response:', JSON.stringify(responseData));

    if (!response.ok || responseData.code !== 200) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          erro: responseData.message || responseData.error || 'Erro ao cadastrar no GestãoClick',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gcId = responseData.data?.id || responseData.id;

    return new Response(
      JSON.stringify({ sucesso: true, gc_id: String(gcId) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating client in GC:', error);
    return new Response(
      JSON.stringify({ sucesso: false, erro: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
