// Supabase Edge Function: API Proxy for MapTiler CORS Issues
// This function acts as a proxy to bypass CORS restrictions for MapTiler API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface MapTilerConfig {
  apiKey: string;
  baseUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname
    
    // Extract tile parameters from path: /api-proxy/tiles/{style}/{z}/{x}/{y}
    const pathMatch = path.match(/\/api-proxy\/tiles\/([^\/]+)\/(\d+)\/(\d+)\/(\d+)/)
    
    if (!pathMatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid tile path format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    const [, style, z, x, y] = pathMatch
    
    // Get MapTiler API key from environment
    const apiKey = Deno.env.get('MAPTILER_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'MapTiler API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Map styles to MapTiler style IDs
    const styleMap: Record<string, string> = {
      'streets': 'streets-v2',
      'basic': 'basic-v2',
      'satellite': 'satellite-v2',
      'outdoor': 'outdoor-v2',
      'topo': 'topo-v2'
    }
    
    const mapId = styleMap[style] || 'basic-v2'
    
    // Construct MapTiler API URL
    const tileUrl = `https://api.maptiler.com/maps/${mapId}/256/${z}/${x}/${y}.png?key=${apiKey}`
    
    console.log(`Proxying tile request: ${style} -> ${tileUrl}`)
    
    // Fetch tile from MapTiler
    const response = await fetch(tileUrl, {
      headers: {
        'User-Agent': 'VeterinaryClinicApp/1.0'
      }
    })
    
    if (!response.ok) {
      console.error(`MapTiler API error: ${response.status} for ${tileUrl}`)
      
      // Fallback to OpenStreetMap on error
      const fallbackUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'VeterinaryClinicApp/1.0'
        }
      })
      
      if (fallbackResponse.ok) {
        console.log(`Using OpenStreetMap fallback for ${z}/${x}/${y}`)
        const tileData = await fallbackResponse.arrayBuffer()
        
        return new Response(tileData, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=86400',
          }
        })
      }
      
      return new Response(
        JSON.stringify({ error: `Tile fetch failed: ${response.status}` }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Return the tile data
    const tileData = await response.arrayBuffer()
    
    return new Response(tileData, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      }
    })
    
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})