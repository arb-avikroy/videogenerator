# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## 🎙️ Text-to-Speech Integration

The video generator now supports **5 TTS options** for high-quality narration audio:

### Quick Setup (Recommended: Google Cloud TTS)

1. **Enable Google Cloud Text-to-Speech API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable [Text-to-Speech API](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com)

2. **Create API Key**
   - Go to [Credentials](https://console.cloud.google.com/apis/credentials)
   - Create Credentials → API Key
   - Copy the key (starts with `AIza...`)

3. **Configure Supabase**
   ```bash
   npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY=AIzaSy...your-key
   npx supabase functions deploy generate-narration
   ```

### TTS Priority System

The system tries services in this order:

1. **Google Cloud TTS** (if `GOOGLE_CLOUD_TTS_API_KEY` is set) ⭐ **Recommended**
   - Cost: $16/1M characters (1M free/month)
   - Quality: ⭐⭐⭐⭐⭐
   - 380+ voices, 40+ languages

2. **Chatterbox TTS** (if `CHATTERBOX_TTS_URL` is set)
   - Cost: Free (self-hosted)
   - Quality: ⭐⭐⭐⭐⭐
   - Custom voices, 23+ languages

3. **OpenAI TTS** (if `OPENAI_API_KEY` is set)
   - Cost: $15/1M characters
   - Quality: ⭐⭐⭐⭐
   - 6 voices, fast generation

4. **ElevenLabs** (if `ELEVENLABS_API_KEY` is set)
   - Cost: Free tier (10k chars/month)
   - Quality: ⭐⭐⭐⭐⭐
   - 1000+ voices, voice cloning

5. **Browser TTS** (always available)
   - Cost: Free
   - Quality: ⭐⭐⭐
   - No setup needed

### Detailed Setup Guides

- 📖 **Google Cloud TTS:** See `GOOGLE_CLOUD_TTS_SETUP.md`
- 📖 **Chatterbox TTS:** See `CHATTERBOX_SETUP.md` or `python-tts-service/QUICKSTART.md`
- 📖 **Quick Reference:** See `TTS_QUICK_REFERENCE.md`
- 📖 **Architecture:** See `TTS_ARCHITECTURE.md`

### TTS Environment Variables

Set in Supabase secrets:

```bash
# Google Cloud TTS (Recommended)
npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY=AIza...

# Chatterbox TTS (Python service URL)
npx supabase secrets set CHATTERBOX_TTS_URL=https://your-service.railway.app

# OpenAI TTS
npx supabase secrets set OPENAI_API_KEY=sk-proj-...

# ElevenLabs
npx supabase secrets set ELEVENLABS_API_KEY=...
```

---

## Hugging Face image generation integration 🔧

You can use Hugging Face for image generation by configuring an environment variable for the Supabase Edge Function:

- `HUGGINGFACE_API_KEY` — your Hugging Face API key (set this as a Supabase project secret for production)

How it works:
- If `HUGGINGFACE_API_KEY` is present (and/or you choose **Image Provider → Hugging Face** in the UI), the `generate-image` function will call the Hugging Face Inference API and return the produced image (as a data URL).
- If Hugging Face returns a billing error (402 / "insufficient credits") or fails to produce an image, the function will fall back to OpenRouter (if `OPENROUTER_API_KEY` is configured).
- You can also select **Image Provider → OpenRouter** in the UI to force OpenRouter.

If you prefer OpenRouter only, leave `HUGGINGFACE_API_KEY` empty and the function will continue using OpenRouter by default.
