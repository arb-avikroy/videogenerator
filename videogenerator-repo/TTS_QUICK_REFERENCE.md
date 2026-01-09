# 🎙️ TTS Setup - Quick Reference

## Fastest Setup (30 seconds)

### Google Cloud TTS (Recommended)

```bash
# 1. Get API key from Google Cloud Console
#    https://console.cloud.google.com/apis/credentials

# 2. Set in Supabase
npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY=AIzaSy...your-key

# 3. Deploy
npx supabase functions deploy generate-narration

# Done! ✅
```

---

## All TTS Options

### 🥇 Google Cloud TTS
**Best for:** Production, high quality, reliability  
**Cost:** $16/1M chars (1M free/month)  
**Setup:** 5 minutes  
**Guide:** `GOOGLE_CLOUD_TTS_SETUP.md`

```bash
npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY=AIza...
npx supabase functions deploy generate-narration
```

---

### 🥈 Chatterbox TTS
**Best for:** Free, customizable, multi-language  
**Cost:** Free  
**Setup:** 15 minutes  
**Guide:** `python-tts-service/QUICKSTART.md`

```bash
cd python-tts-service
.\deploy.ps1  # Windows
./deploy.sh   # Mac/Linux
# Then deploy to Railway/Render and set URL
npx supabase secrets set CHATTERBOX_TTS_URL=https://your-service.railway.app
```

---

### 🥉 OpenAI TTS
**Best for:** Quick setup, good quality  
**Cost:** $15/1M chars  
**Setup:** 1 minute

```bash
npx supabase secrets set OPENAI_API_KEY=sk-proj-...
npx supabase functions deploy generate-narration
```

---

### 🏅 ElevenLabs
**Best for:** Premium voices, cloning  
**Cost:** Free tier (10k chars/month)  
**Setup:** 1 minute

```bash
npx supabase secrets set ELEVENLABS_API_KEY=...
npx supabase functions deploy generate-narration
```

---

### 🆓 Browser TTS
**Best for:** Testing, no cost  
**Cost:** Free  
**Setup:** None (automatic fallback)

No setup needed - works automatically if no API keys are set.

---

## Current Priority

TTS services are tried in this order:

1. **Google Cloud TTS** ← Primary (if key set)
2. Chatterbox TTS
3. OpenAI TTS
4. ElevenLabs
5. Browser TTS (fallback)

---

## Test Your Setup

After setting API key:

```bash
# Deploy function
npx supabase functions deploy generate-narration

# Generate a video and check logs
# You should see: "Using Google Cloud Text-to-Speech..."
```

---

## Voice Configuration

### Google Cloud Voices

Edit `supabase/functions/generate-narration/index.ts`:

```typescript
voice: {
  languageCode: "en-US",
  name: "en-US-Neural2-J",  // Change voice here
  ssmlGender: "MALE"        // MALE, FEMALE, NEUTRAL
}
```

**Popular voices:**
- `en-US-Neural2-J` - Male (default)
- `en-US-Neural2-F` - Female
- `en-GB-Neural2-D` - British Male
- `en-AU-Neural2-B` - Australian Male

Full list: [Google Cloud TTS Voices](https://cloud.google.com/text-to-speech/docs/voices)

---

## Troubleshooting

### "API key not valid"
```bash
# Verify key is set correctly
npx supabase secrets list

# Update key
npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY=new-key

# Redeploy
npx supabase functions deploy generate-narration
```

### "No audio generated"
- Check Supabase Edge Functions logs
- Verify API is enabled in Google Cloud
- Check billing is enabled

### "Browser TTS is being used"
- Means no API keys are configured
- Set at least one API key (Google Cloud recommended)

---

## Cost Estimation

**Average video (6 scenes):**
- ~2,000 characters total
- Google Cloud: $0.032 per video
- OpenAI: $0.030 per video
- Chatterbox: Free
- Browser TTS: Free

**Monthly (100 videos):**
- Google Cloud: $3.20
- OpenAI: $3.00
- Chatterbox: Free
- Browser TTS: Free

---

## Need Help?

- **Google Cloud:** `GOOGLE_CLOUD_TTS_SETUP.md`
- **Chatterbox:** `python-tts-service/QUICKSTART.md`
- **General:** `CHATTERBOX_SETUP.md`
- **Logs:** Supabase Dashboard → Edge Functions → generate-narration

---

## ✅ Recommended Setup

For most users:

1. Use **Google Cloud TTS** (best balance of quality/ease/cost)
2. Get free 1M characters per month
3. 5-minute setup
4. Production-ready

```bash
npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY=AIza...
npx supabase functions deploy generate-narration
```

Done! Generate a video to test 🎉
