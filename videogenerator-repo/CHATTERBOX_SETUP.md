# Chatterbox TTS Integration Setup Guide

## 🎯 Quick Start

You now have **5 TTS options** (in order of priority):

1. **Google Cloud TTS** (Best quality, easy setup, production-ready) ⭐ **RECOMMENDED**
2. **Chatterbox TTS** (Best quality, requires setup)
3. **OpenAI TTS** (Good quality, easy setup)
4. **ElevenLabs** (Premium quality)
5. **Browser TTS** (Free fallback, no setup)

---

## 📦 Option 1: Google Cloud TTS (Recommended)

### Setup (5 minutes)

1. **Enable Text-to-Speech API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable [Text-to-Speech API](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com)

2. **Create API Key:**
   - Go to [Credentials](https://console.cloud.google.com/apis/credentials)
   - Create Credentials → API Key
   - Copy the key

3. **Set in Supabase:**
   ```bash
   npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY=AIzaSy...your-key
   npx supabase functions deploy generate-narration
   ```

**Cost:** $16/1M characters (Neural2 voices), **1M free per month**

📖 **Full guide:** See `GOOGLE_CLOUD_TTS_SETUP.md`

---

## 📦 Option 2: Chatterbox TTS

### Step 1: Local Testing

```bash
# Navigate to the Python service directory
cd python-tts-service

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the service
python app.py
```

Service will be available at `http://localhost:8000`

**Test it:**
```bash
curl http://localhost:8000/health
```

### Step 2: Deploy to Production

#### Option A: Railway (Easiest)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Deploy:**
   ```bash
   cd python-tts-service
   railway login
   railway init
   railway up
   ```

3. **Get URL:**
   ```bash
   railway domain
   ```

4. **Configure Supabase:**
   ```bash
   npx supabase secrets set CHATTERBOX_TTS_URL=https://your-service.railway.app
   ```

5. **Redeploy Edge Function:**
   ```bash
   npx supabase functions deploy generate-narration
   ```

#### Option B: Render

1. Go to https://render.com
2. New Web Service → Connect GitHub
3. Select your repository
4. Configure:
   - **Name:** chatterbox-tts-service
   - **Environment:** Docker
   - **Instance Type:** Standard (or GPU for faster generation)
5. Deploy and copy URL
6. Set in Supabase:
   ```bash
   npx supabase secrets set CHATTERBOX_TTS_URL=https://your-service.onrender.com
   npx supabase functions deploy generate-narration
   ```

#### Option C: Docker (Any platform)

```bash
cd python-tts-service
docker build -t chatterbox-tts .
docker run -p 8000:8000 chatterbox-tts
```

### Step 3: Test Integration

1. Start your video generator
2. Generate a script
3. Watch logs for: `"Using Chatterbox TTS service..."`
4. Audio will be generated with Chatterbox

---

## 📦 Option 3: OpenAI TTS (Easiest)

```bash
# Get API key from https://platform.openai.com/api-keys
npx supabase secrets set OPENAI_API_KEY=sk-proj-your-key

# Deploy
npx supabase functions deploy generate-narration
```

**Cost:** ~$0.015 per 1000 characters

---

## 📦 Option 4: ElevenLabs

```bash
# Get API key from https://elevenlabs.io
npx supabase secrets set ELEVENLABS_API_KEY=your-key

# Deploy
npx supabase functions deploy generate-narration
```

**Free tier:** 10,000 characters/month

---

## 📦 Option 5: Browser TTS (No Setup)

If no API keys are set, browser TTS is used automatically. No setup needed!

---

## 🎛️ TTS Priority System

The Edge Function tries services in this order:

1. ✅ **Google Cloud TTS** (if `GOOGLE_CLOUD_TTS_API_KEY` is set) ⭐
2. ✅ Chatterbox (if `CHATTERBOX_TTS_URL` is set)
3. ✅ OpenAI (if `OPENAI_API_KEY` is set)
4. ✅ ElevenLabs (if `ELEVENLABS_API_KEY` is set)
5. ✅ Browser TTS (always available)

---

## 🔧 Configuration

### Chatterbox Voices

Edit `python-tts-service/app.py` to add custom voice prompts:

```python
CUSTOM_VOICE_PATH = "path/to/voice.wav"
wav = model.generate(text, audio_prompt_path=CUSTOM_VOICE_PATH)
```

### Language Support

**English only:**
```json
{"language": "en"}
```

**Multilingual:**
```json
{"language": "fr"}  // French
{"language": "es"}  // Spanish
{"language": "zh"}  // Chinese
{"language": "de"}  // German
// ... 19 more languages
```

---

## 🚀 Performance Tips

### GPU Acceleration
- Use CUDA-enabled instance on Railway/Render
- 10x faster generation
- Recommended for production

### Batch Processing
Use `/batch-generate` endpoint for multiple scenes:

```bash
curl -X POST http://localhost:8000/batch-generate \
  -H "Content-Type: application/json" \
  -d '[
    {"text": "Scene 1 narration", "scene_number": 1},
    {"text": "Scene 2 narration", "scene_number": 2}
  ]'
```

---

## 🐛 Troubleshooting

### "Connection refused" error
- Ensure Python service is running
- Check firewall settings
- Verify URL in Supabase secrets

### "Model loading failed"
- First run takes time (downloads models)
- Check internet connection
- Ensure sufficient RAM (4GB+ recommended)

### Slow generation
- Use GPU instance
- Consider OpenAI TTS for faster results
- Enable batch processing

### Out of memory
- Reduce concurrent requests
- Use smaller instance with CPU
- Restart service to clear cache

---

## 📊 Comparison Table
 Voices | Languages |
|---------|---------|-------|------|-------|--------|-----------|
| **Google Cloud** | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | $16/1M* | Easy | 380+ | 40+ |
| Chatterbox | ⭐⭐⭐⭐⭐ | Fast** | Free | Medium | Many | 23+ |
| OpenAI | ⭐⭐⭐⭐ | ⚡⚡⚡ | $15/1M | Easy | 6 | 1 |
| ElevenLabs | ⭐⭐⭐⭐⭐ | ⚡⚡ | Free tier | Easy | 1000+ | 29 |
| Browser TTS | ⭐⭐⭐ | ⚡⚡⚡ | Free | None | Varies | Many |

*1M characters free per month  
*
*With GPU

---
**Choose your preferred TTS service** (Google Cloud recommended)
2. Follow setup instructions above
3. Test with a video generation
4. Check audio quality in History page
5. Download and review generated audio

**Current Status:**
- ✅ Google Cloud TTS integration ready
- ✅ Chatterbox Python service created
- ✅ Edge Function updated with priority system
- ⏳ Choose and configure your TTS service
- ⏳ Test integration

**Quick Start Recommendations:**
- **For Production:** Use Google Cloud TTS (best quality + reliability)
- **For Free Tier:** Use Chatterbox or Browser TTS
- **For Easiest Setup:** Use OpenAI TTS

Need help? Check the respective setup guides:
- `GOOGLE_CLOUD_TTS_SETUP.md` - Google Cloud TTS
- `python-tts-service/README.md` - Chatterbox TTS
- Supabase Edge Functions logs for debugging
- ⏳ Test integration

Need help? Check the logs in Supabase Edge Functions dashboard!
