"""
Chatterbox TTS API Service
Wraps Chatterbox TTS models in a FastAPI service for use with Supabase Edge Functions
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import torchaudio as ta
import torch
import os
import uuid
from datetime import datetime
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Chatterbox TTS Service", version="1.0.0")

# Enable CORS for Supabase Edge Functions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your Supabase domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for models (lazy loading)
english_model = None
multilingual_model = None
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
OUTPUT_DIR = "generated_audio"

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

logger.info(f"Using device: {DEVICE}")


class TTSRequest(BaseModel):
    text: str
    language: str = "en"  # en, fr, es, zh, etc.
    voice_prompt_url: Optional[str] = None
    scene_number: Optional[int] = None


class TTSResponse(BaseModel):
    success: bool
    audio_url: str
    file_path: str
    duration_seconds: float
    message: Optional[str] = None


def load_english_model():
    """Lazy load English Chatterbox model"""
    global english_model
    if english_model is None:
        logger.info("Loading English Chatterbox TTS model...")
        try:
            from chatterbox.tts import ChatterboxTTS
            english_model = ChatterboxTTS.from_pretrained(device=DEVICE)
            logger.info("English model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load English model: {e}")
            raise HTTPException(status_code=500, detail=f"Model loading failed: {str(e)}")
    return english_model


def load_multilingual_model():
    """Lazy load Multilingual Chatterbox model"""
    global multilingual_model
    if multilingual_model is None:
        logger.info("Loading Multilingual Chatterbox TTS model...")
        try:
            from chatterbox.mtl_tts import ChatterboxMultilingualTTS
            multilingual_model = ChatterboxMultilingualTTS.from_pretrained(device=DEVICE)
            logger.info("Multilingual model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Multilingual model: {e}")
            raise HTTPException(status_code=500, detail=f"Model loading failed: {str(e)}")
    return multilingual_model


def cleanup_old_files():
    """Remove audio files older than 1 hour"""
    try:
        current_time = datetime.now().timestamp()
        for filename in os.listdir(OUTPUT_DIR):
            file_path = os.path.join(OUTPUT_DIR, filename)
            if os.path.isfile(file_path):
                file_age = current_time - os.path.getmtime(file_path)
                if file_age > 3600:  # 1 hour
                    os.remove(file_path)
                    logger.info(f"Cleaned up old file: {filename}")
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")


@app.get("/")
def read_root():
    return {
        "service": "Chatterbox TTS API",
        "version": "1.0.0",
        "device": DEVICE,
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "device": DEVICE,
        "english_model_loaded": english_model is not None,
        "multilingual_model_loaded": multilingual_model is not None
    }


@app.post("/generate", response_model=TTSResponse)
async def generate_tts(
    request: TTSRequest,
    background_tasks: BackgroundTasks
):
    """
    Generate TTS audio from text
    
    Args:
        request: TTSRequest containing text, language, and optional voice prompt
        
    Returns:
        TTSResponse with audio file path and metadata
    """
    try:
        logger.info(f"Generating TTS for text: {request.text[:50]}... (language: {request.language})")
        
        # Generate unique filename
        file_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"tts_{timestamp}_{file_id}.wav"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        # Select model based on language
        if request.language == "en":
            model = load_english_model()
            logger.info("Using English model")
            
            # Generate audio
            if request.voice_prompt_url:
                wav = model.generate(request.text, audio_prompt_path=request.voice_prompt_url)
            else:
                wav = model.generate(request.text)
        else:
            model = load_multilingual_model()
            logger.info(f"Using Multilingual model for language: {request.language}")
            
            # Generate audio with language ID
            if request.voice_prompt_url:
                wav = model.generate(
                    request.text, 
                    language_id=request.language,
                    audio_prompt_path=request.voice_prompt_url
                )
            else:
                wav = model.generate(request.text, language_id=request.language)
        
        # Save audio file
        ta.save(output_path, wav, model.sr)
        logger.info(f"Audio saved to: {output_path}")
        
        # Calculate duration
        duration = wav.shape[-1] / model.sr
        
        # Schedule cleanup of old files
        background_tasks.add_task(cleanup_old_files)
        
        # Return response with file URL
        audio_url = f"/audio/{output_filename}"
        
        return TTSResponse(
            success=True,
            audio_url=audio_url,
            file_path=output_path,
            duration_seconds=round(duration, 2),
            message=f"Generated {duration:.2f}s audio for scene {request.scene_number}" if request.scene_number else None
        )
        
    except Exception as e:
        logger.error(f"TTS generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/audio/{filename}")
async def get_audio_file(filename: str):
    """
    Serve generated audio files
    """
    file_path = os.path.join(OUTPUT_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(
        file_path,
        media_type="audio/wav",
        headers={
            "Content-Disposition": f"inline; filename={filename}",
            "Cache-Control": "public, max-age=3600"
        }
    )


@app.delete("/audio/{filename}")
async def delete_audio_file(filename: str):
    """
    Delete a specific audio file
    """
    file_path = os.path.join(OUTPUT_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    try:
        os.remove(file_path)
        return {"success": True, "message": f"Deleted {filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-generate")
async def batch_generate_tts(requests: list[TTSRequest], background_tasks: BackgroundTasks):
    """
    Generate multiple TTS audio files in batch
    """
    results = []
    
    for req in requests:
        try:
            result = await generate_tts(req, background_tasks)
            results.append({
                "success": True,
                "scene_number": req.scene_number,
                "data": result
            })
        except Exception as e:
            logger.error(f"Batch generation error for scene {req.scene_number}: {e}")
            results.append({
                "success": False,
                "scene_number": req.scene_number,
                "error": str(e)
            })
    
    return {"results": results}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
