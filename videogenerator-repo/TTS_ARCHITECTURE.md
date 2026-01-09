# TTS Architecture Overview

## Request Flow

```
┌─────────────────┐
│  Video Generator │
│   (Frontend)     │
└────────┬─────────┘
         │
         │ POST /generate-narration
         │ { text, sceneNumber, generationId }
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│         Supabase Edge Function                           │
│         (generate-narration)                             │
└────────┬────────────────────────────────────────────────┘
         │
         │ Priority Check
         ▼
    ┌────────┐
    │ Check  │
    │  Keys  │
    └───┬────┘
        │
        ├─── GOOGLE_CLOUD_TTS_API_KEY set? ─────┐
        │                                         │
        ├─── CHATTERBOX_TTS_URL set? ────────┐   │
        │                                     │   │
        ├─── OPENAI_API_KEY set? ─────────┐  │   │
        │                                  │  │   │
        ├─── ELEVENLABS_API_KEY set? ──┐  │  │   │
        │                               │  │  │   │
        └─── Use Browser TTS ──────┐   │  │  │   │
                                   │   │  │  │   │
        ┌──────────────────────────┘   │  │  │   │
        │                               │  │  │   │
        ▼                               ▼  ▼  ▼   ▼
┌──────────────┐  ┌─────────────┐  ┌──────┐  ┌────────────┐  ┌────────────────┐
│ Browser TTS  │  │ ElevenLabs  │  │ OpenAI│  │ Chatterbox │  │ Google Cloud   │
│ (Metadata)   │  │     API     │  │  TTS  │  │ Python Svc │  │      TTS       │
└──────┬───────┘  └──────┬──────┘  └───┬───┘  └─────┬──────┘  └────────┬───────┘
       │                 │              │            │                  │
       │                 │              │            │                  │
       │                 └──────────────┴────────────┴──────────────────┘
       │                                     │
       │                                     │ Audio File (MP3/WAV)
       │                                     ▼
       │                          ┌─────────────────────┐
       │                          │  Supabase Storage   │
       │                          │ (generated-content) │
       │                          └──────────┬──────────┘
       │                                     │
       │                                     │ Public URL
       │                                     ▼
       └─────────────────────────────────────┐
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │ Return Response │
                                    │ { audioUrl }    │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │    Frontend     │
                                    │  Update Scene   │
                                    │  Play Audio     │
                                    └─────────────────┘
```

## TTS Service Priority

```
Request Received
       │
       ▼
┌──────────────────────────────────────────────────────┐
│ 1. Google Cloud TTS (GOOGLE_CLOUD_TTS_API_KEY)      │ ◄── HIGHEST PRIORITY
│    ✓ 380+ voices                                     │
│    ✓ 40+ languages                                   │
│    ✓ Neural2 quality                                 │
│    ✓ $16/1M chars (1M free)                          │
└──────────────────┬───────────────────────────────────┘
                   │ If not available ▼
┌──────────────────────────────────────────────────────┐
│ 2. Chatterbox TTS (CHATTERBOX_TTS_URL)               │
│    ✓ High quality                                    │
│    ✓ 23+ languages                                   │
│    ✓ Custom voices                                   │
│    ✓ Free (self-hosted)                              │
└──────────────────┬───────────────────────────────────┘
                   │ If not available ▼
┌──────────────────────────────────────────────────────┐
│ 3. OpenAI TTS (OPENAI_API_KEY)                       │
│    ✓ 6 voices                                        │
│    ✓ English only                                    │
│    ✓ Fast generation                                 │
│    ✓ $15/1M chars                                    │
└──────────────────┬───────────────────────────────────┘
                   │ If not available ▼
┌──────────────────────────────────────────────────────┐
│ 4. ElevenLabs (ELEVENLABS_API_KEY)                   │
│    ✓ 1000+ voices                                    │
│    ✓ 29 languages                                    │
│    ✓ Voice cloning                                   │
│    ✓ Free tier: 10k chars/month                      │
└──────────────────┬───────────────────────────────────┘
                   │ If not available ▼
┌──────────────────────────────────────────────────────┐
│ 5. Browser TTS (Always Available)                    │ ◄── FALLBACK
│    ✓ No setup needed                                 │
│    ✓ Free                                            │
│    ✓ Variable quality                                │
│    ✓ Client-side only                                │
└──────────────────────────────────────────────────────┘
```

## Data Flow Example

### Successful Generation (Google Cloud TTS)

```
1. Frontend sends request:
   POST /generate-narration
   {
     "text": "Welcome to this amazing video about AI.",
     "sceneNumber": 1,
     "generationId": "abc-123"
   }

2. Edge Function checks GOOGLE_CLOUD_TTS_API_KEY
   ✓ Found

3. Call Google Cloud TTS API:
   POST https://texttospeech.googleapis.com/v1/text:synthesize
   {
     "input": { "text": "Welcome..." },
     "voice": { "languageCode": "en-US", "name": "en-US-Neural2-J" },
     "audioConfig": { "audioEncoding": "MP3", "speakingRate": 0.9 }
   }

4. Google returns:
   {
     "audioContent": "base64_encoded_mp3_data..."
   }

5. Upload to Supabase Storage:
   File: abc-123/narration/scene_1_1704844800000.mp3
   URL: https://xxx.supabase.co/storage/v1/object/public/generated-content/...

6. Return to Frontend:
   {
     "success": true,
     "audioUrl": "https://...",
     "sceneNumber": 1,
     "provider": "google-cloud-tts"
   }

7. Frontend plays audio in ScriptPanel
```

### Fallback Chain Example

```
Request → Google Cloud TTS
            │
            ├─ API Key not set
            │
            ▼
          Chatterbox TTS
            │
            ├─ Service URL not set
            │
            ▼
          OpenAI TTS
            │
            ├─ API Key not set
            │
            ▼
          ElevenLabs
            │
            ├─ API Key not set
            │
            ▼
          Browser TTS
            │
            └─ Always available ✓
```

## Setup Overview

### Option 1: Google Cloud TTS (5 minutes)
```
1. Enable Text-to-Speech API
2. Create API Key
3. npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY=...
4. npx supabase functions deploy generate-narration
```

### Option 2: Chatterbox (15 minutes)
```
1. cd python-tts-service
2. .\deploy.ps1 (choose Railway/Render)
3. Get service URL
4. npx supabase secrets set CHATTERBOX_TTS_URL=...
5. npx supabase functions deploy generate-narration
```

### Option 3: OpenAI (1 minute)
```
1. Get API key from OpenAI
2. npx supabase secrets set OPENAI_API_KEY=...
3. npx supabase functions deploy generate-narration
```

### Option 4: ElevenLabs (1 minute)
```
1. Get API key from ElevenLabs
2. npx supabase secrets set ELEVENLABS_API_KEY=...
3. npx supabase functions deploy generate-narration
```

### Option 5: Browser TTS (0 minutes)
```
No setup needed - automatic fallback
```

## Recommended Setup

For production use:

```
Primary: Google Cloud TTS
Fallback: Browser TTS

Why?
✓ Best quality-to-cost ratio
✓ Reliable and fast
✓ 1M free characters/month
✓ 380+ professional voices
✓ Production-ready
✓ 5-minute setup
```

## Files Reference

- Edge Function: `supabase/functions/generate-narration/index.ts`
- Python Service: `python-tts-service/app.py`
- Frontend Integration: `src/pages/Index.tsx`
- Audio Player: `src/components/ScriptPanel.tsx`
- Setup Guides:
  - `GOOGLE_CLOUD_TTS_SETUP.md`
  - `CHATTERBOX_SETUP.md`
  - `TTS_QUICK_REFERENCE.md`
