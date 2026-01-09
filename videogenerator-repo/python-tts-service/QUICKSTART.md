# 🚀 Quick Start: Chatterbox TTS

Get Chatterbox TTS running in 5 minutes!

## Windows (PowerShell)

```powershell
# 1. Navigate to service directory
cd python-tts-service

# 2. Run deployment script
.\deploy.ps1

# 3. Choose option 1 (Local development server)
# The script will automatically:
# - Create virtual environment
# - Install dependencies
# - Start the service
```

## Mac/Linux (Bash)

```bash
# 1. Navigate to service directory
cd python-tts-service

# 2. Make script executable
chmod +x deploy.sh

# 3. Run deployment script
./deploy.sh

# 4. Choose option 1 (Local development server)
```

## Manual Setup

```bash
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

## Test It

Open another terminal:

```bash
# Health check
curl http://localhost:8000/health

# Generate TTS
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "language": "en"}'
```

## Connect to Supabase

Once your service is deployed (locally or on Railway/Render):

```bash
# Set the service URL
npx supabase secrets set CHATTERBOX_TTS_URL=http://localhost:8000

# Redeploy Edge Function
npx supabase functions deploy generate-narration
```

## Production Deployment

### Railway (Recommended)

```bash
npm install -g @railway/cli
cd python-tts-service
railway login
railway init
railway up
railway domain  # Get your URL
npx supabase secrets set CHATTERBOX_TTS_URL=https://your-service.railway.app
```

### Render

1. Go to https://render.com
2. New Web Service → Connect GitHub
3. Deploy
4. Copy URL
5. `npx supabase secrets set CHATTERBOX_TTS_URL=https://your-service.onrender.com`

## Troubleshooting

**"ModuleNotFoundError: No module named 'chatterbox'"**
- Solution: `pip install chatterbox-tts`

**"CUDA out of memory"**
- Solution: Use CPU mode by setting `DEVICE=cpu` environment variable

**"Connection refused"**
- Check if service is running: `curl http://localhost:8000/health`
- Check firewall settings
- Verify port 8000 is available

## What's Next?

1. ✅ Service is running
2. Test TTS generation
3. Deploy to production (Railway/Render)
4. Set CHATTERBOX_TTS_URL in Supabase
5. Generate videos with high-quality narration!

For detailed instructions, see `CHATTERBOX_SETUP.md`
