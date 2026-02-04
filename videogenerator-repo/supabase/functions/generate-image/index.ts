/// <reference types="https://deno.land/x/deno@v1.30.0/cli/dts/lib.deno.d.ts" />

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chunked ArrayBuffer -> base64 to avoid call stack overflow on large payloads
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000; // 32K
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, Array.from(slice) as number[]);
  }
  return btoa(binary);
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, sceneNumber, provider, guestSessionId, scriptTitle, generationId } = await req.json();

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Check if user is authenticated
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      userId = user?.id || null;
    } catch (authError) {
      console.log('No authenticated user, proceeding as guest');
    }

    // Cloudflare Worker URL for image generation
    const CLOUDFLARE_WORKER_URL = Deno.env.get('CLOUDFLARE_WORKER_URL') || 'https://freeimagegen.arb-avikroy.workers.dev';
    const CLOUDFLARE_WORKER_KEY = Deno.env.get('CLOUDFLARE_WORKER_KEY');

    console.log(`Using Cloudflare Worker: ${CLOUDFLARE_WORKER_URL}`);

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log(`Received request - scene: ${sceneNumber}, promptPreview: ${prompt.substring(0, 200)}`);

    // Call Cloudflare Worker for image generation
    console.log('Calling Cloudflare Worker for image generation...');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (CLOUDFLARE_WORKER_KEY) {
        headers['Authorization'] = `Bearer ${CLOUDFLARE_WORKER_KEY}`;
      }

      const res = await fetch(CLOUDFLARE_WORKER_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Cloudflare Worker API error:', res.status, errText);
        throw new Error(`Cloudflare Worker failed: ${res.status} - ${errText}`);
      }

      const contentType = res.headers.get('content-type') || '';
      const arrayBuffer = await res.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      const imageMime = contentType && contentType.includes('png') ? 'image/png' : 'image/jpeg';
      const imageUrl = `data:${imageMime};base64,${base64}`;

      // Save to database - append to images array
      if (generationId && (userId || guestSessionId)) {
        try {
          // First fetch the current images array
          const { data: currentGen } = await supabaseClient
            .from('generations')
            .select('images')
            .eq('id', generationId)
            .single();

          const currentImages = currentGen?.images || [];
          const newImage = {
            sceneNumber,
            url: imageUrl,
            prompt,
            provider: 'cloudflare'
          };

          // Append new image
          const { error: dbError } = await supabaseClient
            .from('generations')
            .update({
              images: [...currentImages, newImage]
            })
            .eq('id', generationId);

          if (dbError) {
            console.error('Error updating images in database:', dbError);
          } else {
            console.log('Image added to generation:', generationId);
          }
        } catch (dbError) {
          console.error('Database update error:', dbError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          imageUrl,
          sceneNumber 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Cloudflare Worker error:', msg);
      throw new Error(`Image generation failed: ${msg}`);
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in generate-image function:", errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
