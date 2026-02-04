# AI Video Content Creator

🎬 A powerful web application that generates complete videos from text using AI - from script writing to final video assembly, all in your browser.

🌐 **Live Demo:** [https://aicontentcreator.adventurousinvestorhub.com](https://aicontentcreator.adventurousinvestorhub.com)

## ✨ Features

### 🎯 End-to-End Video Generation Pipeline

1. **Script Generation** - AI-powered script writing using multiple LLM models via OpenRouter
2. **Image Generation** - Scene-by-scene visuals using Cloudflare Workers
3. **Voice Narration** - Text-to-speech audio generation with Voice RSS and AIML APIs
4. **Video Assembly** - Browser-based video processing using FFmpeg.wasm

### 🔐 Authentication & User Management

- Google Authentication via Supabase
- Guest Mode for quick testing
- User history and generation tracking
- Secure session management

### 💾 Cloud Storage

- Generated videos stored in Supabase Storage
- Permanent URLs for downloads
- Automatic cleanup for guest users

### 🎨 Modern UI/UX

- Responsive design with Tailwind CSS
- Accessible components via shadcn/ui
- Real-time progress tracking
- Smooth animations with Framer Motion

## 🤖 AI Technologies Used

### Script Generation (OpenRouter LLMs)

Choose from 20+ language models including:
- **Google Gemini** (gemini-2.0-flash-exp, gemini-1.5-pro)
- **Anthropic Claude** (claude-3.5-sonnet, claude-3-opus)
- **OpenAI GPT** (gpt-4o, gpt-4-turbo, gpt-3.5-turbo)
- **Meta Llama** (llama-3.3-70b, llama-3.1-405b)
- **Mistral AI** (mistral-large, mistral-medium)
- **DeepSeek** (deepseek-chat, deepseek-r1)
- And many more specialized models

### Image Generation

- **Cloudflare Workers** - Fast, scalable image generation

### Text-to-Speech (TTS)

- **Voice RSS** - High-quality voices, multiple languages
- **AIML API** - Natural-sounding narration
- **Browser TTS** - Offline fallback option

### Video Processing

- **FFmpeg.wasm** - Client-side video assembly from images and audio
- No server-side rendering required
- Works entirely in the browser

## 🚀 Getting Started

### Prerequisites

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Supabase account and project
- API keys for:
  - OpenRouter (for LLM models)
  - Cloudflare Workers (for image generation)
  - Voice RSS or AIML (for TTS)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd videogenerator-repo

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Configuration

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

Configure Supabase Edge Functions secrets:

```bash
# OpenRouter for LLM models
npx supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...

# Cloudflare Worker for images
npx supabase secrets set CLOUDFLARE_WORKER_URL=https://your-worker.workers.dev

# Voice RSS for TTS
npx supabase secrets set VOICERSS_API_KEY=your-voicerss-key

# AIML for TTS
npx supabase secrets set AIML_API_KEY=your-aiml-key
```

## 📦 Project Structure

```
videogenerator-repo/
├── src/
│   ├── components/          # React components
│   │   ├── VideoGenerator.tsx   # Video assembly logic
│   │   ├── ScriptPanel.tsx      # Script generation UI
│   │   ├── ModelSelector.tsx    # LLM model selection
│   │   ├── VoiceSelector.tsx    # TTS voice selection
│   │   ├── auth/               # Authentication components
│   │   └── ui/                 # shadcn/ui components
│   ├── contexts/           # React contexts (Auth)
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # External integrations (Supabase)
│   ├── lib/
│   │   └── videoAssembly.ts    # FFmpeg video processing
│   └── pages/
│       ├── Index.tsx           # Main generation page
│       └── History.tsx         # User generation history
├── supabase/
│   ├── functions/          # Edge Functions
│   │   ├── generate-script/    # LLM script generation
│   │   ├── generate-image/     # Image generation
│   │   ├── generate-narration/ # TTS audio generation
│   │   └── generate-video/     # Video metadata
│   └── migrations/         # Database schema
└── public/                 # Static assets
```

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Routing**: React Router 6
- **State Management**: TanStack Query (React Query)
- **Animations**: Framer Motion
- **Video Processing**: FFmpeg.wasm
- **AI Integration**: OpenRouter, Cloudflare Workers, Voice RSS, AIML

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run deploy` - Deploy to GitHub Pages

## 🎥 How It Works

1. **User Input**: Enter a topic or prompt
2. **Script Generation**: Selected LLM model generates a structured script
3. **Image Generation**: Cloudflare Worker creates visuals for each scene
4. **Audio Narration**: Voice RSS or AIML converts script to speech
5. **Video Assembly**: FFmpeg.wasm merges images and audio into MP4
6. **Cloud Storage**: Video uploaded to Supabase Storage
7. **Download**: Permanent URL provided for sharing

## 🔒 Security

- Row Level Security (RLS) policies on all database tables
- API keys stored as Supabase secrets (never exposed to client)
- Google OAuth for secure authentication
- Guest data automatically cleaned up after 7 days

## 📄 License

MIT
