# Chatterbox TTS Service Deployment Script (Windows PowerShell)
# This script helps deploy the Python TTS service

Write-Host "🎙️ Chatterbox TTS Service Deployment" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
try {
    $pythonVersion = python --version
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Check Docker
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Docker not found. Docker deployment will not be available." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Select deployment method:" -ForegroundColor Yellow
Write-Host "1) Local development server"
Write-Host "2) Docker container"
Write-Host "3) Railway deployment"
Write-Host "4) Render deployment"
Write-Host "5) Test the service"
Write-Host ""

$choice = Read-Host "Enter choice [1-5]"

switch ($choice) {
    "1" {
        Write-Host "🚀 Starting local development server..." -ForegroundColor Green
        Set-Location python-tts-service
        
        # Create virtual environment if it doesn't exist
        if (-not (Test-Path "venv")) {
            Write-Host "Creating virtual environment..." -ForegroundColor Yellow
            python -m venv venv
        }
        
        # Activate virtual environment
        Write-Host "Activating virtual environment..." -ForegroundColor Yellow
        .\venv\Scripts\Activate.ps1
        
        # Install dependencies
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        pip install -r requirements.txt
        
        # Run the server
        Write-Host "Starting server on http://localhost:8000" -ForegroundColor Green
        python app.py
    }
    
    "2" {
        Write-Host "🐳 Building Docker container..." -ForegroundColor Green
        Set-Location python-tts-service
        docker build -t chatterbox-tts-service .
        
        Write-Host "Starting container..." -ForegroundColor Yellow
        docker run -p 8000:8000 chatterbox-tts-service
    }
    
    "3" {
        Write-Host "🚂 Railway Deployment Instructions:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Install Railway CLI:" -ForegroundColor Yellow
        Write-Host "   npm install -g @railway/cli"
        Write-Host ""
        Write-Host "2. Login to Railway:" -ForegroundColor Yellow
        Write-Host "   railway login"
        Write-Host ""
        Write-Host "3. Initialize project:" -ForegroundColor Yellow
        Write-Host "   cd python-tts-service"
        Write-Host "   railway init"
        Write-Host ""
        Write-Host "4. Deploy:" -ForegroundColor Yellow
        Write-Host "   railway up"
        Write-Host ""
        Write-Host "5. Get the service URL:" -ForegroundColor Yellow
        Write-Host "   railway domain"
        Write-Host ""
        Write-Host "6. Set in Supabase:" -ForegroundColor Yellow
        Write-Host "   npx supabase secrets set CHATTERBOX_TTS_URL=https://your-service.railway.app"
    }
    
    "4" {
        Write-Host "🎨 Render Deployment Instructions:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Go to https://render.com" -ForegroundColor Yellow
        Write-Host "2. Click 'New +' -> 'Web Service'" -ForegroundColor Yellow
        Write-Host "3. Connect your GitHub repository" -ForegroundColor Yellow
        Write-Host "4. Configure:" -ForegroundColor Yellow
        Write-Host "   - Name: chatterbox-tts-service"
        Write-Host "   - Environment: Docker"
        Write-Host "   - Region: Choose closest to your users"
        Write-Host "   - Instance Type: Standard (or higher for GPU)"
        Write-Host ""
        Write-Host "5. Add environment variables:" -ForegroundColor Yellow
        Write-Host "   DEVICE=cpu  (or 'cuda' if using GPU instance)"
        Write-Host ""
        Write-Host "6. Deploy and copy the service URL" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "7. Set in Supabase:" -ForegroundColor Yellow
        Write-Host "   npx supabase secrets set CHATTERBOX_TTS_URL=https://your-service.onrender.com"
    }
    
    "5" {
        Write-Host "🧪 Testing Chatterbox TTS Service..." -ForegroundColor Cyan
        Write-Host ""
        $serviceUrl = Read-Host "Enter service URL (default: http://localhost:8000)"
        if ([string]::IsNullOrWhiteSpace($serviceUrl)) {
            $serviceUrl = "http://localhost:8000"
        }
        
        Write-Host "Testing health endpoint..." -ForegroundColor Yellow
        try {
            $health = Invoke-RestMethod -Uri "$serviceUrl/health" -Method Get
            Write-Host ($health | ConvertTo-Json -Depth 10) -ForegroundColor Green
        } catch {
            Write-Host "❌ Health check failed: $_" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "Testing TTS generation..." -ForegroundColor Yellow
        try {
            $body = @{
                text = "Hello, this is a test of the Chatterbox TTS service."
                language = "en"
                scene_number = 1
            } | ConvertTo-Json
            
            $result = Invoke-RestMethod -Uri "$serviceUrl/generate" -Method Post -Body $body -ContentType "application/json"
            Write-Host ($result | ConvertTo-Json -Depth 10) -ForegroundColor Green
            
            if ($result.success) {
                Write-Host ""
                Write-Host "✅ TTS generation successful!" -ForegroundColor Green
                Write-Host "Audio URL: $($result.audio_url)" -ForegroundColor Cyan
                Write-Host "Duration: $($result.duration_seconds)s" -ForegroundColor Cyan
            }
        } catch {
            Write-Host "❌ TTS generation failed: $_" -ForegroundColor Red
        }
    }
    
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
