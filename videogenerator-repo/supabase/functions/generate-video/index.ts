import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERTEX_AI_API_KEY = Deno.env.get('GOOGLE_VERTEX_AI_KEY') ?? '';
const PROJECT_ID = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID') ?? 'adventurousinvestorgauth';
const LOCATION = "us-central1";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body received:', JSON.stringify(body));

    const { scenes, guestSessionId, scriptTitle, generationId, aspectRatio = "16:9", resolution = "1080p" } = body;

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check if user is authenticated
    let userId: string | null = null;
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        userId = user?.id || null;
      }
    } catch (authError) {
      console.log('No authenticated user, proceeding as guest');
    }

    console.log('Scenes extracted:', Array.isArray(scenes), scenes?.length);

    if (!Array.isArray(scenes) || scenes.length === 0) {
      throw new Error(`Request must include a non-empty array of scenes. Received: ${JSON.stringify(body)}`);
    }

    // Parse resolution to dimensions
    const resolutionMap: { [key: string]: { width: number; height: number } } = {
      "1080p": aspectRatio === "16:9" ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 },
      "720p": aspectRatio === "16:9" ? { width: 1280, height: 720 } : { width: 720, height: 1280 },
    };

    const dimensions = resolutionMap[resolution] || resolutionMap["1080p"];

    // For each scene, call Vertex AI Veo 3.1 to generate video from image
    const results: Array<{ sceneNumber: number; video?: string; audio?: string; error?: string }> = [];

    for (const scene of scenes) {
      const sceneNumber = scene.sceneNumber ?? null;
      try {
        if (!scene.imageUrl) {
          throw new Error('Scene missing imageUrl');
        }

        const imageUrl = scene.imageUrl;
        const duration = scene.duration || 4; // Default to 4 seconds
        const audioUrl = scene.audioUrl || null;

        console.log(`Generating video for scene ${sceneNumber} with Vertex AI Veo 3.1...`);

        // Call Vertex AI Veo 3.1 API using API Key (for testing/development)
        // Note: For production, use service account OAuth2
        const vertexResponse = await fetch(
          `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/veo-3.1-fast:streamGenerateVideo?key=${VERTEX_AI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              instances: [{
                prompt: scene.visualDescription || "Animate this image",
                image: {
                  bytesBase64Encoded: imageUrl.startsWith('data:') 
                    ? imageUrl.split(',')[1]
                    : await imageToBase64(imageUrl)
                },
                parameters: {
                  duration: duration,
                  aspectRatio: aspectRatio,
                  resolution: {
                    width: dimensions.width,
                    height: dimensions.height
                  }
                }
              }]
            }),
          }
        );

        if (!vertexResponse.ok) {
          const errorText = await vertexResponse.text();
          throw new Error(`Vertex AI error: ${errorText}`);
        }

        const vertexData = await vertexResponse.json();
        
        // Extract video data from response
        let videoBase64 = vertexData.predictions?.[0]?.videoBytes;
        
        if (!videoBase64) {
          throw new Error('No video generated from Vertex AI');
        }

        // Convert base64 to blob
        const videoBytes = Uint8Array.from(atob(videoBase64), c => c.charCodeAt(0));
        
        // Upload video to Supabase Storage
        const videoFileName = `${generationId}/videos/scene_${sceneNumber}.mp4`;
        const { error: uploadError } = await supabaseClient.storage
          .from('generated-content')
          .upload(videoFileName, videoBytes, {
            contentType: 'video/mp4',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Failed to upload video: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabaseClient.storage
          .from('generated-content')
          .getPublicUrl(videoFileName);

        console.log(`Video generated and uploaded for scene ${sceneNumber}`);

        results.push({
          sceneNumber,
          video: urlData.publicUrl,
          audio: audioUrl,
        });

      } catch (sceneError) {
        const errMsg = sceneError instanceof Error ? sceneError.message : String(sceneError);
        console.error(`Scene ${sceneNumber} error:`, errMsg);
        results.push({
          sceneNumber,
          error: errMsg,
        });
      }
    }

    // Save generation to database
    if (generationId) {
      try {
        const { error: dbError } = await supabaseClient
          .from('generations')
          .update({
            video_scenes: results,
            status: 'videos_generated',
            updated_at: new Date().toISOString(),
          })
          .eq('id', generationId);

        if (dbError) {
          console.error('Database update error:', dbError);
        }
      } catch (dbErr) {
        console.error('Database operation failed:', dbErr);
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('generate-video error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to convert image URL to base64
async function imageToBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
