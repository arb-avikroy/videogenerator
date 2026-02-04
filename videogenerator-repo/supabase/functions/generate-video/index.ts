import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenes } = await req.json();

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Scenes array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating video from ${scenes.length} scenes`);

    // Validate all scenes have required data
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (!scene.imageUrl) {
        return new Response(
          JSON.stringify({ error: `Scene ${i + 1} missing imageUrl` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!scene.audioUrl) {
        return new Response(
          JSON.stringify({ error: `Scene ${i + 1} missing audioUrl` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Return scenes data for client-side FFmpeg processing
    // The actual video assembly will happen in the browser using ffmpeg.wasm
    return new Response(
      JSON.stringify({ 
        success: true,
        scenes: scenes.map((scene: any, index: number) => ({
          sceneNumber: index + 1,
          imageUrl: scene.imageUrl,
          audioUrl: scene.audioUrl,
          text: scene.text
        })),
        message: "Ready for video assembly"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate video error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
