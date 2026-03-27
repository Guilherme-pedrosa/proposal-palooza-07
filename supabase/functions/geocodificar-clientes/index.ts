import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const googleKey = Deno.env.get('GOOGLE_MAPS_API_KEY')!

    if (!googleKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY not set' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // Fetch clients without geocoding
    const { data: clientes, error } = await supabase
      .from('clientes_gc')
      .select('id, nome, endereco, cidade, estado')
      .or('geocodificado.is.null,geocodificado.eq.false')
      .not('cidade', 'is', null)
      .limit(50)

    if (error) throw error
    if (!clientes || clientes.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum cliente pendente', total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let geocoded = 0
    let errors = 0

    for (const cliente of clientes) {
      const address = [cliente.endereco, cliente.cidade, cliente.estado, 'Brasil']
        .filter(Boolean)
        .join(', ')

      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleKey}`
        const res = await fetch(url)
        const data = await res.json()

        if (data.status === 'OK' && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location
          await supabase
            .from('clientes_gc')
            .update({ latitude: lat, longitude: lng, geocodificado: true })
            .eq('id', cliente.id)
          geocoded++
        } else {
          // Mark as attempted so we don't retry bad addresses indefinitely
          await supabase
            .from('clientes_gc')
            .update({ geocodificado: true })
            .eq('id', cliente.id)
          errors++
        }
      } catch (e) {
        console.error(`Erro geocodificando ${cliente.nome}:`, e)
        errors++
      }

      // Rate limit: 50ms between requests
      await new Promise(r => setTimeout(r, 50))
    }

    return new Response(
      JSON.stringify({ total: clientes.length, geocoded, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e: any) {
    console.error('Error:', e)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})