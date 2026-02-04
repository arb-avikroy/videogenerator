/// <reference types="https://deno.land/x/deno@v1.30.0/cli/dts/lib.deno.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = "coral", sceneNumber, generationId, provider = "aiml" } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating narration for scene ${sceneNumber || 'unknown'} with voice: ${voice}, provider: ${provider}`);

    let audioUrl: string;
    let characters = 0;

    // Voice RSS TTS Provider
    if (provider === "voicerss") {
      const VOICERSS_API_KEY = Deno.env.get("VOICERSS_API_KEY");
      if (!VOICERSS_API_KEY) {
        console.error("VOICERSS_API_KEY is not configured");
        return new Response(
          JSON.stringify({ error: "Voice RSS API key not configured. Please add VOICERSS_API_KEY to Supabase secrets." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build Voice RSS API request
      const params = new URLSearchParams({
        key: VOICERSS_API_KEY,
        src: text,
        hl: voice, // Voice RSS uses language codes like en-us, en-gb, etc.
        c: "MP3",
        f: "48khz_16bit_stereo",
      });

      const voiceRssUrl = `http://api.voicerss.org/?${params.toString()}`;
      
      console.log(`Calling Voice RSS API with language: ${voice}`);
      const response = await fetch(voiceRssUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Voice RSS API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to generate narration with Voice RSS", details: errorText }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if response is actually an error message (Voice RSS returns errors as text)
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/plain")) {
        const responseText = await response.text();
        // Voice RSS returns error messages like "ERROR: Invalid API key"
        if (responseText.startsWith("ERROR:")) {
          console.error("Voice RSS error response:", responseText);
          return new Response(
            JSON.stringify({ error: "Voice RSS API Error", details: responseText }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Voice RSS returns audio directly, convert to base64 data URL
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = arrayBufferToBase64(audioBuffer);
      audioUrl = `data:audio/mp3;base64,${base64Audio}`;
      characters = text.length;
      
      console.log(`Voice RSS narration generated successfully. Characters: ${characters}, Audio size: ${audioBuffer.byteLength} bytes`);
    } 
    // AIML TTS Provider (default)
    else {
      const AIML_API_KEY = Deno.env.get("AIML_API_KEY");
      if (!AIML_API_KEY) {
        console.error("AIML_API_KEY is not configured");
        return new Response(
          JSON.stringify({ error: "AIML API key not configured. Please add AIML_API_KEY to Supabase secrets." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Call AIML API for TTS
      const response = await fetch("https://api.aimlapi.com/v1/tts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${AIML_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini-tts",
          text,
          voice,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AIML API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to generate narration", details: errorText }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      
      if (!data.audio || !data.audio.url) {
        console.error("No audio URL in response");
        return new Response(
          JSON.stringify({ error: "No audio URL generated" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      audioUrl = data.audio.url;
      characters = data.usage?.characters || 0;
      
      console.log(`AIML narration generated successfully. Characters: ${characters}`);
      console.log(`Audio URL: ${audioUrl}`);
    }

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

    // Update generation record with audio URL if generationId is provided
    if (generationId && sceneNumber) {
      try {
        const { error: updateError } = await supabaseClient
          .from('generations')
          .update({
            metadata: supabaseClient.rpc('jsonb_set_nested', {
              target: 'metadata',
              path: `{scenes,${sceneNumber - 1},audioUrl}`,
              new_value: JSON.stringify(audioUrl)
            })
          })
          .eq('id', generationId);

        if (updateError) {
          console.error('Error updating generation with audio URL:', updateError);
        }
      } catch (dbError) {
        console.error('Database update error:', dbError);
      }
    }

    return new Response(
      JSON.stringify({ 
        audioUrl,
        characters,
        voice,
        sceneNumber,
        provider
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate narration error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
