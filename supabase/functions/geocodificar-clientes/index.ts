import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_RESULT_TYPES = new Set(['street_address', 'premise', 'route'])
const MAX_CITY_DISTANCE_KM = 100

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return 2 * R * Math.asin(Math.sqrt(a))
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

    // Fetch only clients with enough location data
    const { data: clientes, error } = await supabase
      .from('clientes_gc')
      .select('id, nome, endereco, cidade, estado')
      .or('geocodificado.is.null,geocodificado.eq.false')
      .not('cidade', 'is', null)
      .not('estado', 'is', null)
      .limit(50)

    if (error) throw error
    if (!clientes || clientes.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum cliente pendente com cidade/estado', total: 0, geocoded: 0, errors: 0 }), {
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
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleKey}`
        const geocodeRes = await fetch(geocodeUrl)
        const geocodeData = await geocodeRes.json()

        if (geocodeData.status !== 'OK' || geocodeData.results.length === 0) {
          errors++
          continue
        }

        const result = geocodeData.results[0]
        const resultTypes: string[] = result.types || []
        const hasPreciseType = resultTypes.some((t) => ALLOWED_RESULT_TYPES.has(t))

        if (!hasPreciseType) {
          errors++
          continue
        }

        const cityAnchorAddress = [cliente.cidade, cliente.estado, 'Brasil'].filter(Boolean).join(', ')
        const cityAnchorUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityAnchorAddress)}&key=${googleKey}`
        const cityAnchorRes = await fetch(cityAnchorUrl)
        const cityAnchorData = await cityAnchorRes.json()

        if (cityAnchorData.status !== 'OK' || cityAnchorData.results.length === 0) {
          errors++
          continue
        }

        const point = result.geometry?.location
        const cityPoint = cityAnchorData.results[0]?.geometry?.location

        if (!point || !cityPoint) {
          errors++
          continue
        }

        const distanceKm = haversineKm(point.lat, point.lng, cityPoint.lat, cityPoint.lng)
        if (distanceKm > MAX_CITY_DISTANCE_KM) {
          errors++
          continue
        }

        const { error: updateError } = await supabase
          .from('clientes_gc')
          .update({ latitude: point.lat, longitude: point.lng, geocodificado: true })
          .eq('id', cliente.id)

        if (updateError) {
          errors++
          continue
        }

        geocoded++
      } catch (e) {
        console.error(`Erro geocodificando ${cliente.nome}:`, e)
        errors++
      }

      // Rate limit: 100ms between requests
      await new Promise(r => setTimeout(r, 100))
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