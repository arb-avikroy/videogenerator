#!/bin/bash

# Chatterbox TTS Service Deployment Script
# This script helps deploy the Python TTS service to various platforms

echo "🎙️ Chatterbox TTS Service Deployment"
echo "====================================="
echo ""

# Check if requirements are met
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.11+"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not found. Docker deployment will not be available."
fi

echo "Select deployment method:"
echo "1) Local development server"
echo "2) Docker container"
echo "3) Railway deployment"
echo "4) Render deployment"
echo "5) Test the service"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo "🚀 Starting local development server..."
        cd python-tts-service
        
        # Create virtual environment if it doesn't exist
        if [ ! -d "venv" ]; then
            echo "Creating virtual environment..."
            python3 -m venv venv
        fi
        
        # Activate virtual environment
        source venv/bin/activate
        
        # Install dependencies
        echo "Installing dependencies..."
        pip install -r requirements.txt
        
        # Run the server
        echo "Starting server on http://localhost:8000"
        python app.py
        ;;
        
    2)
        echo "🐳 Building Docker container..."
        cd python-tts-service
        docker build -t chatterbox-tts-service .
        
        echo "Starting container..."
        docker run -p 8000:8000 chatterbox-tts-service
        ;;
        
    3)
        echo "🚂 Railway Deployment Instructions:"
        echo ""
        echo "1. Install Railway CLI:"
        echo "   npm install -g @railway/cli"
        echo ""
        echo "2. Login to Railway:"
        echo "   railway login"
        echo ""
        echo "3. Initialize project:"
        echo "   cd python-tts-service"
        echo "   railway init"
        echo ""
        echo "4. Deploy:"
        echo "   railway up"
        echo ""
        echo "5. Get the service URL:"
        echo "   railway domain"
        echo ""
        echo "6. Set in Supabase:"
        echo "   npx supabase secrets set CHATTERBOX_TTS_URL=https://your-service.railway.app"
        ;;
        
    4)
        echo "🎨 Render Deployment Instructions:"
        echo ""
        echo "1. Go to https://render.com"
        echo "2. Click 'New +' -> 'Web Service'"
        echo "3. Connect your GitHub repository"
        echo "4. Configure:"
        echo "   - Name: chatterbox-tts-service"
        echo "   - Environment: Docker"
        echo "   - Region: Choose closest to your users"
        echo "   - Instance Type: Standard (or higher for GPU)"
        echo ""
        echo "5. Add environment variables:"
        echo "   DEVICE=cpu  (or 'cuda' if using GPU instance)"
        echo ""
        echo "6. Deploy and copy the service URL"
        echo ""
        echo "7. Set in Supabase:"
        echo "   npx supabase secrets set CHATTERBOX_TTS_URL=https://your-service.onrender.com"
        ;;
        
    5)
        echo "🧪 Testing Chatterbox TTS Service..."
        echo ""
        read -p "Enter service URL (default: http://localhost:8000): " service_url
        service_url=${service_url:-http://localhost:8000}
        
        echo "Testing health endpoint..."
        curl -X GET "$service_url/health"
        echo ""
        
        echo "Testing TTS generation..."
        curl -X POST "$service_url/generate" \
          -H "Content-Type: application/json" \
          -d '{
            "text": "Hello, this is a test of the Chatterbox TTS service.",
            "language": "en",
            "scene_number": 1
          }'
        echo ""
        ;;
        
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
