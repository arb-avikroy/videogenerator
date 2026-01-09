import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');

    console.log(`Env check - HUGGINGFACE_API_KEY: ${HUGGINGFACE_API_KEY ? 'present' : 'missing'}`);

    const body = await req.json();
    console.log('Request body received:', JSON.stringify(body));

    const { scenes } = body;
    console.log('Scenes extracted:', Array.isArray(scenes), scenes?.length);

    if (!Array.isArray(scenes) || scenes.length === 0) {
      throw new Error(`Request must include a non-empty array of scenes. Received: ${JSON.stringify(body)}`);
    }

    // Parse global parameters and provide safe defaults and clamps. Callers can pass `parameters` at the root
    // or per-scene as `scene.parameters` to override values for that scene.
    const globalParams = (body.parameters && typeof body.parameters === 'object') ? body.parameters : {};

    const clampInt = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(Number(v) || 0)));
    const clampFloat = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Number(v)));

    const DEFAULTS = {
      num_inference_steps: 25,
      num_frames: 14,
      height: 576,
      width: 1024,
      guidance_scale: 7.5,
      seed: null,
      max_frames: 60,
      max_height: 768,
      max_width: 1280,
    };

    const resolvedGlobalParams = {
      num_inference_steps: clamp(Number(globalParams.num_inference_steps ?? DEFAULTS.num_inference_steps), 1, 50),
      num_frames: clamp(Number(globalParams.num_frames ?? DEFAULTS.num_frames), 1, DEFAULTS.max_frames),
      height: clamp(Number(globalParams.height ?? DEFAULTS.height), 128, DEFAULTS.max_height),
      width: clamp(Number(globalParams.width ?? DEFAULTS.width), 128, DEFAULTS.max_width),
      guidance_scale: Number(globalParams.guidance_scale ?? DEFAULTS.guidance_scale),
      seed: globalParams.seed ?? DEFAULTS.seed,
    };

    console.log('Resolved global parameters:', JSON.stringify(resolvedGlobalParams));

    // For each scene, call HF Stable Video Diffusion image->video endpoint and a TTS endpoint to produce audio
    const results: Array<{ sceneNumber: number; video?: string; audio?: string; error?: string }> = [];

    for (const scene of scenes) {
      const sceneNumber = scene.sceneNumber ?? null;
      try {
        if (!scene.image && !scene.imageUrl) {
          throw new Error('Scene missing image data');
        }

        const imageUrl = scene.imageUrl || scene.image; // data URL or url
        const narration = scene.narration || '';

        // Merge parameters: global -> scene override
        const sceneParamsRaw = (scene.parameters && typeof scene.parameters === 'object') ? scene.parameters : {};
        const sceneParams = {
          num_inference_steps: clampInt(sceneParamsRaw.num_inference_steps ?? resolvedGlobalParams.num_inference_steps, 1, 50),
          num_frames: clampInt(sceneParamsRaw.num_frames ?? resolvedGlobalParams.num_frames, 1, DEFAULTS.max_frames),
          height: clampInt(sceneParamsRaw.height ?? resolvedGlobalParams.height, 128, DEFAULTS.max_height),
          width: clampInt(sceneParamsRaw.width ?? resolvedGlobalParams.width, 128, DEFAULTS.max_width),
          guidance_scale: clampFloat(sceneParamsRaw.guidance_scale ?? resolvedGlobalParams.guidance_scale, 0, 30),
          seed: sceneParamsRaw.seed ?? resolvedGlobalParams.seed,
        };

        // Call Hugging Face Stable Video Diffusion endpoint
        if (!HUGGINGFACE_API_KEY) {
          throw new Error('HUGGINGFACE_API_KEY not configured');
        }

        console.log(`Generating video for scene ${sceneNumber} via Stable Video Diffusion...`);

        console.log(`Scene ${sceneNumber} parameters:`, JSON.stringify(sceneParams));

        const svdPayload: any = {
          inputs: imageUrl,
          parameters: sceneParams
        };

        const svdResp = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-video-diffusion-img2vid', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(svdPayload)
        });

        if (!svdResp.ok) {
          const txt = await svdResp.text();
          console.error('SVD video generation error:', svdResp.status, txt);
          throw new Error(`SVD video generation failed: ${svdResp.status} - ${txt}`);
        }

        const ct = svdResp.headers.get('content-type') || '';
        let videoDataUrl: string | undefined = undefined;

        if (ct.includes('application/json')) {
          // JSON response with base64 video
          const json = await svdResp.json();
          if (json?.b64_json) {
            videoDataUrl = `data:video/mp4;base64,${json.b64_json}`;
          } else if (json?.video_url) {
            const vfetch = await fetch(json.video_url);
            if (vfetch.ok) {
              const vab = await vfetch.arrayBuffer();
              const vbytes = new Uint8Array(vab);
              const vb64 = btoa(String.fromCharCode(...vbytes));
              videoDataUrl = `data:video/mp4;base64,${vb64}`;
            }
          }
        } else if (ct.includes('video') || ct.includes('octet-stream')) {
          // Binary video response
          const videoBuf = await svdResp.arrayBuffer();
          const videoBytes = new Uint8Array(videoBuf);
          const videoB64 = btoa(String.fromCharCode(...videoBytes));
          videoDataUrl = `data:video/mp4;base64,${videoB64}`;
        }

        if (!videoDataUrl) {
          console.error('No video returned from SVD:', JSON.stringify(await svdResp.clone().json().catch(() => ({}))));
          throw new Error('No video generated by Stable Video Diffusion');
        }

        // TTS (attempt HF TTS). Fallback: no audio
        let audioDataUrl: string | undefined = undefined;
        if (narration && narration.trim().length > 0) {
          try {
            console.log(`Generating TTS for scene ${sceneNumber}...`);
            const ttsResp = await fetch('https://router.huggingface.co/models/espnet/kan-bayashi_ljspeech_vits', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ inputs: narration })
            });

            if (ttsResp.ok) {
              const tct = ttsResp.headers.get('content-type') || '';
              if (tct.includes('audio') || tct.includes('application/octet-stream')) {
                const ab = await ttsResp.arrayBuffer();
                const bytes = new Uint8Array(ab);
                const b64 = btoa(String.fromCharCode(...bytes));
                const ext = tct.includes('wav') ? 'wav' : (tct.includes('mpeg') || tct.includes('mp3') ? 'mp3' : 'wav');
                audioDataUrl = `data:audio/${ext};base64,${b64}`;
              } else {
                const tjs = await ttsResp.json();
                const maybe = tjs?.b64 || tjs?.data?.[0]?.b64 || tjs?.audio || tjs?.b64_audio;
                if (maybe) audioDataUrl = maybe.startsWith('data:') ? maybe : `data:audio/wav;base64,${maybe}`;
              }
            } else {
              const tt = await ttsResp.text();
              console.warn('TTS request failed:', ttsResp.status, tt);
            }
          } catch (e) {
            console.warn('TTS generation error:', String(e));
          }
        }

        results.push({ sceneNumber, video: videoDataUrl, audio: audioDataUrl });
      } catch (err) {
        console.error('Scene error:', err);
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ sceneNumber: scene.sceneNumber ?? -1, error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, scenes: results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in generate-video function:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
