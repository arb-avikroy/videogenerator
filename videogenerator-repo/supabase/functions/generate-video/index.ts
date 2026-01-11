/// <reference types="https://deno.land/x/deno@v1.30.0/cli/dts/lib.deno.d.ts" />

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROJECT_ID = "adventurousinvestorgauth";
const LOCATION = "us-central1";

// Rate limiting configuration
const CONCURRENT_REQUESTS = 2;
const DELAY_BETWEEN_BATCHES = 2000;

// Workload Identity Federation configuration
const WIF_PROVIDER = Deno.env.get('GCP_WIF_PROVIDER') ?? '';
const WIF_SERVICE_ACCOUNT = Deno.env.get('GCP_WIF_SERVICE_ACCOUNT') ?? '';

// Token caching
let cachedToken: { token: string; expiresAt: number } | null = null;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body received:', JSON.stringify(body));

    const { scenes, guestSessionId, scriptTitle, generationId, aspectRatio = "16:9", resolution = "1080p" } = body;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let userId: string | null = null;
    let supabaseToken: string | null = null;
    
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        supabaseToken = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(supabaseToken);
        userId = user?.id || null;
      }
    } catch (authError) {
      console.log('No authenticated user, proceeding as guest');
    }

    if (!Array.isArray(scenes) || scenes.length === 0) {
      throw new Error(`Request must include a non-empty array of scenes`);
    }

    // Get GCP access token once and cache it
    const accessToken = await getGCPAccessTokenViaWIF(supabaseToken);

    // Process scenes in batches to avoid rate limits
    const results: Array<{ sceneNumber: number; video?: string; audio?: string; error?: string }> = [];
    
    for (let i = 0; i < scenes.length; i += CONCURRENT_REQUESTS) {
      const batch = scenes.slice(i, i + CONCURRENT_REQUESTS);
      console.log(`Processing batch ${Math.floor(i / CONCURRENT_REQUESTS) + 1} of ${Math.ceil(scenes.length / CONCURRENT_REQUESTS)}`);
      
      const batchPromises = batch.map(scene => 
        processScene(scene, accessToken, aspectRatio, resolution, supabaseClient, generationId)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const sceneNumber = batch[index].sceneNumber ?? null;
          results.push({
            sceneNumber,
            error: result.reason?.message || 'Unknown error',
          });
        }
      });
      
      if (i + CONCURRENT_REQUESTS < scenes.length) {
        console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await delay(DELAY_BETWEEN_BATCHES);
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

    // Check if any scenes failed
    const failedScenes = results.filter(r => r.error);
    const successfulScenes = results.filter(r => r.video);

    if (successfulScenes.length === 0) {
      throw new Error(`All scenes failed to generate. Errors: ${failedScenes.map(s => `Scene ${s.sceneNumber}: ${s.error}`).join('; ')}`);
    }

    // Format response to match expected structure
    return new Response(JSON.stringify({ 
      success: true,
      videos: successfulScenes.map(scene => ({
        sceneNumber: scene.sceneNumber,
        videoUrl: scene.video,
        audioUrl: scene.audio
      })),
      failures: failedScenes.length > 0 ? failedScenes : undefined
    }), {
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

async function processScene(
  scene: any,
  accessToken: string,
  aspectRatio: string,
  resolution: string,
  supabaseClient: any,
  generationId: string
): Promise<{ sceneNumber: number; video?: string; audio?: string; error?: string }> {
  const sceneNumber = scene.sceneNumber ?? null;
  
  try {
    if (!scene.imageUrl) {
      throw new Error('Scene missing imageUrl');
    }

    const imageUrl = scene.imageUrl;
    const duration = scene.duration || 4;
    const audioUrl = scene.audioUrl || null;

    console.log(`Generating video for scene ${sceneNumber}...`);
    console.log(`Using model: veo-3.1-generate-001`);
    console.log(`Endpoint: https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/veo-3.1-generate-001:predictLongRunning`);

    // CORRECT endpoint: predictLongRunning (NOT streamGenerateVideo)
    const vertexResponse = await fetchWithRetry(
      `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/veo-3.1-generate-001:predictLongRunning`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{
            prompt: scene.visualDescription || "Animate this image",
            image: {
              bytesBase64Encoded: imageUrl.startsWith('data:') 
                ? imageUrl.split(',')[1]
                : await imageToBase64(imageUrl),
              mimeType: "image/jpeg"
            }
          }],
          parameters: {
            durationSeconds: duration,
            aspectRatio: aspectRatio,
            resolution: resolution,
            sampleCount: 1
          }
        }),
      },
      3
    );

    if (!vertexResponse.ok) {
      const errorText = await vertexResponse.text();
      throw new Error(`Vertex AI error (${vertexResponse.status}): ${errorText}`);
    }

    // Log the response for debugging
    const responseText = await vertexResponse.text();
    console.log(`Vertex AI Response Status: ${vertexResponse.status}`);
    console.log(`Vertex AI Response (first 500 chars): ${responseText.substring(0, 500)}`);
    
    // Check if response is HTML (error page)
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      throw new Error(`Received HTML instead of JSON. This usually means an API error or rate limit. Status: ${vertexResponse.status}`);
    }
    
    let vertexData;
    try {
      vertexData = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Failed to parse Vertex AI response as JSON: ${responseText.substring(0, 200)}`);
    }
    
    // Get operation name
    const operationName = vertexData.name;
    
    if (!operationName) {
      throw new Error('No operation name returned from Vertex AI');
    }

    console.log(`Video generation started for scene ${sceneNumber}, operation: ${operationName}`);
    
    // Construct the proper operation URL
    // Operation name format: "projects/{project}/locations/{location}/operations/{operation}"
    // OR full path: "projects/{project}/locations/{location}/publishers/google/models/{model}/operations/{operation}"
    let operationUrl;
    if (operationName.startsWith('http')) {
      operationUrl = operationName;
    } else if (operationName.startsWith('projects/')) {
      operationUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/${operationName}`;
    } else {
      // Just the operation ID
      operationUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/operations/${operationName}`;
    }
    
    console.log(`Polling URL: ${operationUrl}`);

    // Poll for completion
    let videoBase64;
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      await delay(5000);
      
      const statusResponse = await fetch(
        operationUrl,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );
      
      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        throw new Error(`Status check failed (${statusResponse.status}): ${errorText}`);
      }
      
      const statusText = await statusResponse.text();
      
      // Check for HTML response
      if (statusText.trim().startsWith('<!DOCTYPE') || statusText.trim().startsWith('<html')) {
        throw new Error(`Received HTML during status check. API may have rate limited or errored.`);
      }
      
      let statusData;
      try {
        statusData = JSON.parse(statusText);
      } catch (parseErr) {
        throw new Error(`Failed to parse status response: ${statusText.substring(0, 200)}`);
      }
      
      if (statusData.done) {
        if (statusData.error) {
          throw new Error(`Video generation failed: ${JSON.stringify(statusData.error)}`);
        }
        
        videoBase64 = statusData.response?.predictions?.[0]?.bytesBase64Encoded;
        break;
      }
      
      attempts++;
      console.log(`Waiting for scene ${sceneNumber}... (${attempts}/${maxAttempts})`);
    }
    
    if (!videoBase64) {
      throw new Error('Video generation timeout or no video data returned');
    }

    const videoBytes = Uint8Array.from(atob(videoBase64), c => c.charCodeAt(0));
    
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

    const { data: urlData } = supabaseClient.storage
      .from('generated-content')
      .getPublicUrl(videoFileName);

    console.log(`✓ Scene ${sceneNumber} completed`);

    return {
      sceneNumber,
      video: urlData.publicUrl,
      audio: audioUrl,
    };

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`✗ Scene ${sceneNumber} failed:`, errMsg);
    throw error;
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        console.log(`Rate limited. Waiting ${retryAfter}s before retry ${attempt + 1}/${maxRetries}...`);
        await delay(retryAfter * 1000);
        continue;
      }
      
      if (response.status >= 500) {
        const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`Server error. Retrying in ${backoffTime}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await delay(backoffTime);
        continue;
      }
      
      return response;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.log(`Request failed. Retrying in ${backoffTime}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await delay(backoffTime);
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

async function getGCPAccessTokenViaWIF(supabaseToken: string | null): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    console.log('Using cached GCP token');
    return cachedToken.token;
  }

  if (!WIF_PROVIDER || !WIF_SERVICE_ACCOUNT) {
    throw new Error('Workload Identity Federation not configured');
  }

  let subjectToken = supabaseToken;
  
  if (!subjectToken) {
    console.log('No user token, using service role key for WIF');
    subjectToken = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  }

  const stsResponse = await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      audience: `//iam.googleapis.com/${WIF_PROVIDER}`,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      subject_token: subjectToken || '',
    }),
  });

  if (!stsResponse.ok) {
    const errorText = await stsResponse.text();
    throw new Error(`STS token exchange failed: ${errorText}`);
  }

  const stsData = await stsResponse.json();
  const federatedToken = stsData.access_token;

  const impersonateResponse = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${WIF_SERVICE_ACCOUNT}:generateAccessToken`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${federatedToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scope: ['https://www.googleapis.com/auth/cloud-platform'],
        lifetime: '3600s',
      }),
    }
  );

  if (!impersonateResponse.ok) {
    const errorText = await impersonateResponse.text();
    throw new Error(`Service account impersonation failed: ${errorText}`);
  }

  const impersonateData = await impersonateResponse.json();
  
  cachedToken = {
    token: impersonateData.accessToken,
    expiresAt: Date.now() + (50 * 60 * 1000),
  };
  
  console.log('Generated new GCP token');
  return impersonateData.accessToken;
}

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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}