# TTS & Image Generation Setup Guide

## Text-to-Speech Configuration

This app supports multiple TTS providers for high-quality narration.

### Provider 1: AIML API (OpenAI TTS) - Default

**Service:** AIML API  
**Model:** OpenAI GPT-4o-mini-tts  
**Features:**
- 🎙️ 7 natural-sounding voices
- ⚡ Fast generation
- 🎯 High quality
- 🔑 Requires API key

**Available Voices:**
- **alloy** - Neutral voice
- **echo** - Male voice
- **fable** - British male voice
- **onyx** - Deep male voice
- **nova** - Female voice
- **shimmer** - Female voice
- **coral** - Warm female voice (default)

**Setup:**
```bash
# Get API key from https://aimlapi.com/
npx supabase secrets set AIML_API_KEY=your-api-key-here --project-ref zzgfoxyawssvnzzjvotl
```

**Pricing:** Check [AIML API Pricing](https://aimlapi.com/pricing)

---

### Provider 2: Voice RSS

**Service:** Voice RSS  
**Model:** Multi-language TTS  
**Features:**
- 🌍 40+ languages and dialects
- 💰 Free tier available
- 🎭 Multiple accents
- 🔑 Requires API key

**Available Languages:**
- English (US, UK, Australia, India)
- Spanish (Spain, Mexico)
- French, German, Italian
- Portuguese (Brazil)
- Japanese, Korean, Chinese (Mandarin)
- Hindi, and 30+ more

**Setup:**
```bash
# Get free API key from https://www.voicerss.org/api/
npx supabase secrets set VOICERSS_API_KEY=your-api-key-here --project-ref zzgfoxyawssvnzzjvotl
```

**Pricing:** 
- Free tier: 350 daily requests
- [Voice RSS Pricing](https://www.voicerss.org/pricing.aspx)

---

### Deploy TTS Function

```bash
npx supabase functions deploy generate-narration --project-ref zzgfoxyawssvnzzjvotl
```

### TTS Usage

1. Generate your script and images first
2. Select a TTS provider (AIML or Voice RSS)
3. Choose a voice from the available options
4. Click "Generate Narration" to add audio to all scenes
5. Play audio for individual scenes using the play button
6. Download all audio files as a zip
7. Regenerate with a different voice or provider anytime

---

## Image Generation Configuration

This app supports multiple image generation providers with automatic fallback.

### Default Provider: ImageGen (Free)

**Service:** Custom Cloudflare Worker  
**Model:** Free image generation API  
**Features:**
- ✅ No API key required
- ✅ Fast generation
- ✅ Good quality for general use
- ✅ Default provider

**Endpoint:** `https://freeimagegen.arb-avikroy.workers.dev`

### Alternative Provider 1: Hugging Face

**Service:** Hugging Face nscale  
**Model:** `stabilityai/stable-diffusion-xl-base-1.0`  
**Features:**
- 🎨 High-quality SDXL images
- ⚡ Fast generation via nscale
- 🔑 Requires API key

**Setup:**
```bash
# Get API key from https://huggingface.co/settings/tokens
npx supabase secrets set HUGGINGFACE_API_KEY=your-key-here --project-ref zzgfoxyawssvnzzjvotl
```

### Alternative Provider 2: OpenRouter

**Service:** OpenRouter AI  
**Model:** `bytedance-seed/seedream-4.5`  
**Features:**
- 🚀 Latest AI models
- 🎯 High-quality outputs
- 🔑 Requires API key & credits

**Setup:**
```bash
# Get API key from https://openrouter.ai/keys
npx supabase secrets set OPENROUTER_API_KEY=your-key-here --project-ref zzgfoxyawssvnzzjvotl
```

### Provider Selection Priority

The app automatically tries providers in this order:
1. **ImageGen** (default) - Free, no setup required
2. **Hugging Face** - If API key is configured
3. **OpenRouter** - If explicitly selected or as fallback

### Deploy Image Function

```bash
npx supabase functions deploy generate-image --project-ref zzgfoxyawssvnzzjvotl
```

---

## Testing Locally

For local development, add to your `.env` file:
```env
# TTS Providers (choose one or both)
AIML_API_KEY=your-aiml-key-here
VOICERSS_API_KEY=your-voicerss-key-here

# Image Generation (optional, ImageGen works without keys)
HUGGINGFACE_API_KEY=your-key-here
OPENROUTER_API_KEY=your-key-here
IMAGEGEN_API_URL=https://freeimagegen.arb-avikroy.workers.dev
```

Then start Supabase locally:
```bash
npx supabase start
npx supabase functions serve --env-file .env
```

---

## Complete Workflow

1. **Script Generation** → AI writes the video script (OpenRouter AI models)
2. **Image Generation** → Creates visuals for each scene (ImageGen/SDXL/Seedream)
3. **Narration Generation** → Adds voice to each scene (OpenAI TTS via AIML)
4. **Download Assets** → Export images and audio as zip files
