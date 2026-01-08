import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Scene {
  sceneNumber: number;
  visualDescription: string;
  narration: string;
  duration: number;
}

interface ScriptResponse {
  title: string;
  scenes: Scene[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, sceneCount = 6, sceneDuration = 5, model = "google/gemini-2.5-flash-exp:free" } = await req.json();

    if (!topic || typeof topic !== "string") {
      return new Response(
        JSON.stringify({ error: "Topic is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "OpenRouter API key not configured. Please add OPENROUTER_API_KEY to Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalDuration = sceneCount * sceneDuration;
    console.log(`Generating script for topic: ${topic} with ${sceneCount} scenes of ${sceneDuration}s each (total: ${totalDuration}s)`);

    const systemPrompt = `You are an expert video script writer. You create compelling, viral seo optimzied video scripts.

The script should:
- Start with a hook that grabs attention
- Include relevant financial/investment insights
- Use adventure/exploration metaphors where appropriate
- End with a call to action or inspiring conclusion
- Total video length should be approximately ${totalDuration} seconds

Respond ONLY with valid JSON in this exact format:
{
  "title": "Engaging Video Title",
  "scenes": [
    {
      "sceneNumber": 1,
      "visualDescription": "Detailed description for AI image generation",
      "narration": "The narration text for this scene",
      "duration": ${sceneDuration}
    }
  ]
}`;

    const userPrompt = `Create a video script with EXACTLY ${sceneCount} scenes about the following topic:

Topic: ${topic}

Each scene should have:
1. A detailed visual description for AI image generation (be specific about colors, composition, elements)
2. Narration text that is engaging and educational
3. Duration of ${sceneDuration} seconds per scene

IMPORTANT: Generate exactly ${sceneCount} scenes, no more, no less.`;

    const model = "openai/gpt-oss-120b:free";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lovable.dev",
        "X-Title": "The Adventurous Investor"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate script", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("OpenRouter response received");

    const textContent = data.choices?.[0]?.message?.content;
    if (!textContent) {
      console.error("No text content in response");
      return new Response(
        JSON.stringify({ error: "No content generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from the response
    let scriptData: ScriptResponse;
    try {
      // Remove markdown code blocks if present
      let cleanedText = textContent.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.slice(7);
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();
      
      scriptData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse script JSON:", parseError, textContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse generated script", raw: textContent }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the response structure
    if (!scriptData.title || !Array.isArray(scriptData.scenes) || scriptData.scenes.length === 0) {
      console.error("Invalid script structure:", scriptData);
      return new Response(
        JSON.stringify({ error: "Invalid script structure generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Script generated successfully with ${scriptData.scenes.length} scenes`);

    return new Response(
      JSON.stringify({ ...scriptData, _meta: { provider: "openrouter", model, requestedScenes: sceneCount, requestedDuration: sceneDuration } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate script error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
