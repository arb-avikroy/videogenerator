# Chatterbox TTS Service

Python FastAPI service wrapping Chatterbox TTS for use with the video generator.

## Local Development

### Prerequisites
- Python 3.11+
- CUDA (optional, for GPU acceleration)
- Git

### Setup

1. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Run the service:**
```bash
python app.py
```

The service will be available at `http://localhost:8000`

### API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Docker Deployment

### Build the image:
```bash
docker build -t chatterbox-tts-service .
```

### Run the container:
```bash
docker run -p 8000:8000 chatterbox-tts-service
```

### With GPU support:
```bash
docker run --gpus all -p 8000:8000 chatterbox-tts-service
```

## API Endpoints

### POST /generate
Generate TTS audio from text

**Request body:**
```json
{
  "text": "Your text to convert to speech",
  "language": "en",
  "voice_prompt_url": null,
  "scene_number": 1
}
```

**Response:**
```json
{
  "success": true,
  "audio_url": "/audio/tts_20260109_120000_abc123.wav",
  "file_path": "generated_audio/tts_20260109_120000_abc123.wav",
  "duration_seconds": 3.45,
  "message": "Generated 3.45s audio for scene 1"
}
```

### GET /audio/{filename}
Download generated audio file

### POST /batch-generate
Generate multiple TTS files in one request

## Supported Languages

**English model:** `language: "en"`
- Uses ChatterboxTTS

**Multilingual model:** Any of these language codes:
- `fr` - French
- `es` - Spanish
- `zh` - Chinese (Mandarin)
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `ru` - Russian
- `ja` - Japanese
- `ko` - Korean
- And 14 more languages...

## Integration with Supabase

The Supabase Edge Function (`generate-narration`) can call this service:

1. Deploy this Python service to a server (Railway, Render, AWS, etc.)
2. Set the service URL in Supabase secrets:
   ```bash
   npx supabase secrets set CHATTERBOX_TTS_URL=https://your-service.railway.app
   ```
3. The Edge Function will automatically use Chatterbox if available

## Performance Tips

1. **GPU Acceleration:** Use CUDA for faster generation
2. **Model Caching:** Models are loaded once and cached in memory
3. **Batch Processing:** Use `/batch-generate` for multiple scenes
4. **Cleanup:** Old audio files are auto-deleted after 1 hour

## Environment Variables

- `DEVICE`: Set to "cuda" or "cpu" (auto-detected by default)
- `OUTPUT_DIR`: Directory for generated audio files (default: "generated_audio")

## Troubleshooting

### Out of Memory
- Reduce batch size
- Use CPU instead of GPU for small workloads
- Restart service to clear model cache

### Slow Generation
- Use GPU if available
- Consider using OpenAI TTS for faster results
- Pre-load models on startup

### Model Download Issues
- Ensure internet connection for first run
- Models are cached after first download
- Check Hugging Face access if models are gated
