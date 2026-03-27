import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Accept more result types - only reject very generic ones
const REJECTED_TYPES = new Set(['country', 'administrative_area_level_1'])

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

    // Get a small batch of pending clients (avoid timeout)
    const BATCH_SIZE = 30
    const { data: clientes, error } = await supabase
      .from('clientes_gc')
      .select('id, nome, endereco, cidade, estado')
      .or('geocodificado.is.null,geocodificado.eq.false')
      .order('nome')
      .limit(BATCH_SIZE)

    if (error) throw error

    // Filter in code: must have cidade+estado with actual content
    const pendentes = (clientes || []).filter(c => 
      c.cidade && c.cidade.trim().length > 0 && 
      c.estado && c.estado.trim().length > 0
    )

    if (pendentes.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'Nenhum cliente pendente com cidade/estado preenchidos', 
        total: 0, geocoded: 0, errors: 0, skipped: (clientes || []).length - pendentes.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cache city coordinates to avoid duplicate API calls
    const cityCache: Record<string, { lat: number; lng: number } | null> = {}

    async function getCityCoords(cidade: string, estado: string): Promise<{ lat: number; lng: number } | null> {
      const key = `${cidade}-${estado}`
      if (key in cityCache) return cityCache[key]

      const cityAddress = `${cidade}, ${estado}, Brasil`
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityAddress)}&key=${googleKey}`
      const res = await fetch(url)
      const data = await res.json()

      if (data.status === 'OK' && data.results.length > 0) {
        const loc = data.results[0].geometry?.location
        cityCache[key] = loc ? { lat: loc.lat, lng: loc.lng } : null
      } else {
        cityCache[key] = null
      }
      return cityCache[key]
    }

    let geocoded = 0
    let errors = 0
    let skipped = 0

    // Process ALL clients sequentially with rate limiting
    for (const cliente of pendentes) {
      const address = [cliente.endereco, cliente.cidade, cliente.estado, 'Brasil']
        .filter(v => v && v.trim().length > 0)
        .join(', ')

      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleKey}`
        const geocodeRes = await fetch(geocodeUrl)
        const geocodeData = await geocodeRes.json()

        if (geocodeData.status !== 'OK' || geocodeData.results.length === 0) {
          console.log(`No result for: ${cliente.nome} (${address})`)
          errors++
          continue
        }

        const result = geocodeData.results[0]
        const resultTypes: string[] = result.types || []

        // Only reject very generic types (country, state level)
        const isTooGeneric = resultTypes.every((t: string) => REJECTED_TYPES.has(t))
        if (isTooGeneric) {
          console.log(`Too generic for: ${cliente.nome} - types: ${resultTypes.join(',')}`)
          skipped++
          continue
        }

        const point = result.geometry?.location
        if (!point) {
          errors++
          continue
        }

        // Validate distance from city center - if too far, use city center as fallback
        const cityCoords = await getCityCoords(cliente.cidade, cliente.estado)
        let finalLat = point.lat
        let finalLng = point.lng
        if (cityCoords) {
          const distanceKm = haversineKm(point.lat, point.lng, cityCoords.lat, cityCoords.lng)
          if (distanceKm > 300) {
            console.log(`Too far for: ${cliente.nome} - ${distanceKm.toFixed(0)}km from ${cliente.cidade}, using city center`)
            finalLat = cityCoords.lat
            finalLng = cityCoords.lng
          }
        }

        const { error: updateError } = await supabase
          .from('clientes_gc')
          .update({ latitude: finalLat, longitude: finalLng, geocodificado: true })
          .eq('id', cliente.id)

        if (updateError) {
          console.error(`Update error for ${cliente.nome}:`, updateError)
          errors++
          continue
        }

        geocoded++
      } catch (e) {
        console.error(`Error geocoding ${cliente.nome}:`, e)
        errors++
      }

      // Rate limit: 50ms between requests (Google allows 50 QPS)
      await new Promise(r => setTimeout(r, 50))
    }

    return new Response(
      JSON.stringify({ 
        total: pendentes.length, 
        geocoded, 
        errors, 
        skipped,
        sem_endereco: (clientes || []).length - pendentes.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e: any) {
    console.error('Error:', e)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})