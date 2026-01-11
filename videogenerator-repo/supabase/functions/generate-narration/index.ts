/// <reference types="https://deno.land/x/deno@v1.30.0/cli/dts/lib.deno.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NarrationRequest {
  text: string;
  sceneNumber: number;
  generationId: string;
  voice?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, sceneNumber, generationId, voice = "alloy" }: NarrationRequest = await req.json();

    if (!text || !generationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: text, generationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating narration for scene ${sceneNumber}...`);

    // Option 0: Google Cloud Text-to-Speech (Primary - Best for production)
    const googleApiKey = Deno.env.get("GOOGLE_CLOUD_TTS_API_KEY");
    
    if (googleApiKey) {
      try {
        console.log("Using Google Cloud Text-to-Speech...");
        
        // Map voice names to their actual gender
        const voiceGenderMap: { [key: string]: "MALE" | "FEMALE" } = {
          "en-US-Neural2-J": "MALE",
          "en-US-Neural2-D": "MALE",
          "en-US-Neural2-I": "MALE",
          "en-US-Neural2-F": "FEMALE",
          "en-US-Neural2-C": "FEMALE",
          "en-US-Neural2-E": "FEMALE",
          "en-GB-Neural2-D": "MALE",
          "en-GB-Neural2-F": "FEMALE",
          "en-AU-Neural2-B": "MALE",
          "en-AU-Neural2-C": "FEMALE",
        };
        
        const voiceName = voice || "en-US-Neural2-J";
        const languageCode = voiceName.split('-').slice(0, 2).join('-');
        const gender = voiceGenderMap[voiceName] || "MALE";
        
        const googleTTSResponse = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: { text: text },
              voice: {
                languageCode: languageCode,
                name: voiceName,
                ssmlGender: gender
              },
              audioConfig: {
                audioEncoding: "MP3",
                speakingRate: 0.9,
                pitch: 0.0,
                volumeGainDb: 0.0,
                effectsProfileId: ["small-bluetooth-speaker-class-device"]
              }
            }),
          }
        );

        if (!googleTTSResponse.ok) {
          const errorText = await googleTTSResponse.text();
          throw new Error(`Google Cloud TTS failed: ${errorText}`);
        }

        const googleData = await googleTTSResponse.json();
        
        if (googleData.audioContent) {
          // Decode base64 audio
          const audioBytes = Uint8Array.from(atob(googleData.audioContent), c => c.charCodeAt(0));
          
          // Upload to Supabase Storage
          const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
          );

          const fileName = `${generationId}/narration/scene_${sceneNumber}_${Date.now()}.mp3`;
          
          const { error: uploadError } = await supabase.storage
            .from("generated-content")
            .upload(fileName, audioBytes, {
              contentType: "audio/mpeg",
              upsert: false,
            });

          if (uploadError) {
            console.error("Storage upload error:", uploadError);
            // Fallback: return base64 data URL
            return new Response(
              JSON.stringify({
                success: true,
                audioUrl: `data:audio/mpeg;base64,${googleData.audioContent}`,
                sceneNumber,
                provider: "google-cloud-tts"
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("generated-content")
            .getPublicUrl(fileName);

          console.log(`Google Cloud TTS narration generated: ${urlData.publicUrl}`);

          return new Response(
            JSON.stringify({
              success: true,
              audioUrl: urlData.publicUrl,
              sceneNumber,
              provider: "google-cloud-tts"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (googleError) {
        console.error("Google Cloud TTS error:", googleError);
        console.log("Falling back to next TTS option...");
        // Continue to next option
      }
    }

    // Option 1: Chatterbox TTS (if available)
    const chatterboxUrl = Deno.env.get("CHATTERBOX_TTS_URL");
    
    if (chatterboxUrl) {
      try {
        console.log("Using Chatterbox TTS service...");
        
        const chatterboxResponse = await fetch(`${chatterboxUrl}/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: text,
            language: "en", // Can be parameterized
            scene_number: sceneNumber,
          }),
        });

        if (!chatterboxResponse.ok) {
          throw new Error(`Chatterbox TTS failed: ${await chatterboxResponse.text()}`);
        }

        const chatterboxData = await chatterboxResponse.json();
        
        if (chatterboxData.success) {
          // Download the audio file from Chatterbox service
          const audioResponse = await fetch(`${chatterboxUrl}${chatterboxData.audio_url}`);
          
          if (!audioResponse.ok) {
            throw new Error("Failed to download audio from Chatterbox");
          }

          const audioBlob = await audioResponse.blob();
          const audioBuffer = await audioBlob.arrayBuffer();
          
          // Upload to Supabase Storage
          const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
          );

          const fileName = `${generationId}/narration/scene_${sceneNumber}_${Date.now()}.wav`;
          
          const { error: uploadError } = await supabase.storage
            .from("generated-content")
            .upload(fileName, audioBuffer, {
              contentType: "audio/wav",
              upsert: false,
            });

          if (uploadError) {
            console.error("Storage upload error:", uploadError);
            // Return Chatterbox URL as fallback
            return new Response(
              JSON.stringify({
                success: true,
                audioUrl: `${chatterboxUrl}${chatterboxData.audio_url}`,
                sceneNumber,
                provider: "chatterbox",
                duration: chatterboxData.duration_seconds
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("generated-content")
            .getPublicUrl(fileName);

          console.log(`Chatterbox narration generated: ${urlData.publicUrl}`);

          return new Response(
            JSON.stringify({
              success: true,
              audioUrl: urlData.publicUrl,
              sceneNumber,
              provider: "chatterbox",
              duration: chatterboxData.duration_seconds
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (chatterboxError) {
        console.error("Chatterbox TTS error:", chatterboxError);
        console.log("Falling back to OpenAI TTS...");
        // Continue to next option
      }
    }

    // Option 2: OpenAI TTS (requires OPENAI_API_KEY in Supabase secrets)
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (openaiKey) {
      // Use OpenAI TTS API
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          voice: voice, // alloy, echo, fable, onyx, nova, shimmer
          input: text,
          speed: 0.9,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI TTS failed: ${error}`);
      }

      // Get audio as blob
      const audioBlob = await response.blob();
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
      
      // Upload to Supabase Storage
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const fileName = `${generationId}/narration/scene_${sceneNumber}_${Date.now()}.mp3`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("generated-content")
        .upload(fileName, audioBuffer, {
          contentType: "audio/mpeg",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        // Fallback: return base64 data URL
        return new Response(
          JSON.stringify({
            success: true,
            audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
            sceneNumber,
            provider: "openai-tts"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("generated-content")
        .getPublicUrl(fileName);

      console.log(`Narration generated successfully: ${urlData.publicUrl}`);

      return new Response(
        JSON.stringify({
          success: true,
          audioUrl: urlData.publicUrl,
          sceneNumber,
          provider: "openai-tts"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Option 3: ElevenLabs TTS (requires ELEVENLABS_API_KEY)
    const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (elevenLabsKey) {
      const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice (default)
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenLabsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS failed: ${await response.text()}`);
      }

      const audioBlob = await response.blob();
      const audioBuffer = await audioBlob.arrayBuffer();
      
      // Upload to Supabase Storage
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const fileName = `${generationId}/narration/scene_${sceneNumber}_${Date.now()}.mp3`;
      
      const { error: uploadError } = await supabase.storage
        .from("generated-content")
        .upload(fileName, audioBuffer, {
          contentType: "audio/mpeg",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("generated-content")
        .getPublicUrl(fileName);

      return new Response(
        JSON.stringify({
          success: true,
          audioUrl: urlData.publicUrl,
          sceneNumber,
          provider: "elevenlabs"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Option 4: Fallback to browser-based TTS (return metadata only)
    return new Response(
      JSON.stringify({
        success: true,
        audioUrl: null,
        useBrowserTTS: true,
        sceneNumber,
        text,
        message: "No TTS API key configured. Use browser TTS on client side."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Narration generation error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate narration",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
