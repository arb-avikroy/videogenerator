# Narration Generation Features

## 🎙️ New Narration Features (January 2026)

### Overview
The video generator now includes comprehensive narration generation features with voice selection, editable narration text, audio controls, and a flexible workflow that supports both automatic and manual generation modes.

---

## ✨ Key Features

### 1. **Separate Narration Step in Workflow**
   - New "Generate Narration" step in the progress tracker
   - Workflow now follows: Script → Images → **Narration** → Merge → Review → Download
   - In **manual mode**, the workflow stops after images to allow narration review
   - In **automatic mode**, narration generation happens automatically after images

### 2. **Editable Narration Text**
   - Edit narration text for any scene before audio generation
   - Click the **"Edit"** button on any scene in the Scenes Panel
   - Edit the text in the textarea that appears
   - Click **"Save"** to update or **"Cancel"** to discard changes
   - Changes are applied immediately to the scene

### 3. **Voice Selection with Provider Info**
   - Click the **"Select Voice"** button to open the voice selector dialog
   - Choose from 5 TTS providers:
     - **Google Cloud TTS** (380+ voices, 1M chars/month free) ⭐ Recommended
     - **OpenAI TTS** (6 voices, no free tier)
     - **ElevenLabs** (1000+ voices, 10k chars/month free)
     - **Chatterbox TTS** (Unlimited, self-hosted)
     - **Browser TTS** (Unlimited, always free)
   - See free credit information and setup instructions for each provider
   - Voice selection affects the language/voice code sent to TTS services

### 4. **Audio Player Controls**
   Each scene now has audio controls:
   - **Play/Pause** button - Play or pause the narration audio
   - **Download** button - Download the MP3 audio file (real audio only, not browser TTS)
   - Audio playback works for both server-generated audio and browser TTS
   - Only one audio plays at a time (automatic stop of other scenes)

### 5. **Manual Narration Generation Trigger**
   After images are generated (in manual mode):
   - A **"Narration Ready"** banner appears at the top
   - Review and edit scene narration text in the Scenes Panel
   - Select your preferred voice from the voice selector
   - Click **"Generate Narration"** when ready
   - Audio generation begins for all scenes

---

## 🎮 How to Use

### Automatic Mode Workflow
1. Enter topic and click **"Run Automatic"**
2. Wait for script generation
3. Wait for image generation
4. Narration automatically generates with selected voice
5. Video automatically merges
6. Review and download

### Manual Mode (Step-by-Step) Workflow
1. Select model and enter topic
2. Click **"Generate Script"**
3. Review script (edit if needed in ScriptPanel)
4. Click **"Proceed to Images"** (or wait for prompt)
5. Images generate for all scenes
6. **WORKFLOW STOPS HERE** ⏸️
7. **Review and edit narration text** in Scenes Panel (click Edit button)
8. **Select preferred voice** (click voice selector button)
9. Click **"Generate Narration"** button
10. Audio generates for all scenes
11. Continue to video generation (if automatic mode)
12. Review and download

---

## 🎨 UI Components

### Narration Ready Banner
Appears after images are complete in manual mode:
```
┌─────────────────────────────────────────────────────────┐
│ 🎙️ Narration Ready                                     │
│ Review and edit scene narration text below,             │
│ select your preferred voice, then generate audio.       │
│                                                          │
│ [🎙️ Select Voice]  [Generate Narration]                 │
└─────────────────────────────────────────────────────────┘
```

### Scenes Panel Audio Controls
Each scene card now includes:
```
┌────────────────────────────────────────────┐
│ [Image]  Scene 1                     5s     │
│          Narration text here...            │
│                                             │
│ [Edit] [▶ Play] [⬇ Download]              │
└────────────────────────────────────────────┘
```

When editing:
```
┌────────────────────────────────────────────┐
│ [Image]  Scene 1                     5s     │
│ ┌─────────────────────────────────────────┐│
│ │ Edit narration text here...             ││
│ │                                          ││
│ └─────────────────────────────────────────┘│
│ [✓ Save] [✗ Cancel]                        │
└────────────────────────────────────────────┘
```

### Voice Selector Dialog
Comprehensive voice selection with provider information:
- Provider name with icon (🎙️, 🤖, 🎵, 💬, 🌐)
- Free credit information (e.g., "1M chars/month")
- Quality rating (⭐⭐⭐⭐⭐)
- Setup instructions
- Voice dropdown for each provider
- Voices show gender badges and language codes
- Priority system explanation at the bottom

---

## 🔊 Voice Options

### Google Cloud TTS (Recommended)
- **US Male**: en-US-Neural2-J (default), en-US-Neural2-D (warm)
- **US Female**: en-US-Neural2-F, en-US-Neural2-C (professional)
- **UK**: en-GB-Neural2-D (male), en-GB-Neural2-F (female)
- **Australian**: en-AU-Neural2-B (male), en-AU-Neural2-C (female)

### OpenAI TTS
- Alloy (Neutral), Echo (Male), Fable (British Male)
- Onyx (Deep Male), Nova (Female), Shimmer (Soft Female)

### ElevenLabs
- Rachel (Female), Antoni (Male), Domi (Female)
- Bella (Female), Elli (Female), Josh (Male)

### Chatterbox TTS
- English, Spanish, French, German (defaults)

### Browser TTS
- Uses system default voice

---

## 💡 Tips

1. **Edit Before Generating**: Always review and edit narration text before clicking "Generate Narration"
2. **Voice Selection**: Google Cloud TTS offers the best quality and 1M free characters/month
3. **Test Audio**: Use the Play button to preview audio before downloading
4. **Download Audio**: Download individual scene audio files for reuse or editing
5. **Automatic Mode**: Use automatic mode for fastest generation (no stops)
6. **Manual Mode**: Use manual mode for maximum control (review each step)

---

## 🔧 Technical Details

### State Management
- `selectedVoice`: Stores currently selected voice (default: "en-US-Neural2-J")
- `narrationReady`: Boolean flag indicating images are complete and narration can be generated
- `isGeneratingAudio`: Boolean flag for audio generation in progress

### Audio Playback
- Real audio files: Uses HTML5 Audio API
- Browser TTS: Uses Web Speech API (speechSynthesis)
- Automatic cleanup on component unmount
- Single audio playback (stops others when starting)

### Editable Narration
- Local state in ScenesPanel for editing mode
- Parent callback to update scene data
- Toast notifications for save confirmation

### Workflow Control
- Workflow stops after images in manual mode
- "Narration Ready" banner triggers manual narration
- Automatic mode continues seamlessly
- Narration step added to ProgressTracker (6 steps total)

---

## 🚀 Future Enhancements

Potential future improvements:
- [ ] Batch audio download (all scenes at once)
- [ ] Voice preview samples before selection
- [ ] Custom SSML editor for advanced narration control
- [ ] Audio waveform visualization
- [ ] Narration timing adjustment
- [ ] Multiple voice selection (different voices per scene)
- [ ] Audio effects and filters
- [ ] Background music mixer

---

## 📝 Related Files

- **VoiceSelector.tsx**: Voice selection dialog component
- **ScenesPanel.tsx**: Updated with audio controls and editable narration
- **ProgressTracker.tsx**: Added "narration" step
- **Index.tsx**: Updated workflow logic and state management
- **generate-narration/index.ts**: Edge Function for TTS generation

---

## ✅ Checklist for Using New Features

- [ ] Generate script and images
- [ ] Review narration text in Scenes Panel
- [ ] Edit narration if needed (click Edit button)
- [ ] Open voice selector (click Select Voice)
- [ ] Choose preferred TTS provider and voice
- [ ] Click "Generate Narration" button
- [ ] Wait for audio generation (progress in logs)
- [ ] Test audio playback (click Play on each scene)
- [ ] Download individual audio files if needed (click Download)
- [ ] Continue to video generation
- [ ] Download final video

---

**Enjoy your enhanced narration generation experience!** 🎙️🎬
