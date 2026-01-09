# Google Cloud Text-to-Speech Setup Guide

## 🎯 Quick Setup (5 minutes)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your **Project ID**

### Step 2: Enable Text-to-Speech API

1. Go to [Text-to-Speech API](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com)
2. Click **"Enable"**
3. Wait for API to be enabled (~30 seconds)

### Step 3: Create API Key

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **"Create Credentials"** → **"API Key"**
3. Copy the API key (starts with `AIza...`)
4. *(Optional but recommended)* Click **"Restrict Key"**:
   - **API restrictions** → Select "Text-to-Speech API"
   - **Application restrictions** → Choose based on your needs
   - Click **"Save"**

### Step 4: Set API Key in Supabase

```bash
# Set the API key in Supabase secrets
npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY=AIzaSy...your-key-here
```

### Step 5: Deploy Edge Function

```bash
npx supabase functions deploy generate-narration
```

### Step 6: Test It!

Generate a video and check the logs. You should see:
```
"Using Google Cloud Text-to-Speech..."
"Google Cloud TTS narration generated: https://..."
```

---

## 💰 Pricing

Google Cloud TTS pricing (as of 2026):

| Voice Type | Price per 1M characters |
|------------|------------------------|
| Standard | $4.00 |
| WaveNet | $16.00 |
| Neural2 | $16.00 |

**Free Tier:** First 1M characters per month with WaveNet/Neural2 voices

**Example calculation:**
- 6 scenes × 50 words average = 300 words
- ~2,000 characters per video
- 500 videos = $0.032 (Neural2 voices)

---

## 🎙️ Voice Options

### Popular English Voices

```typescript
// Male voices
"en-US-Neural2-J"  // Neutral male (default)
"en-US-Neural2-D"  // Warm male
"en-US-Neural2-I"  // Young male

// Female voices
"en-US-Neural2-F"  // Neutral female
"en-US-Neural2-C"  // Professional female
"en-US-Neural2-E"  // Warm female

// UK English
"en-GB-Neural2-D"  // British male
"en-GB-Neural2-F"  // British female

// Australian
"en-AU-Neural2-B"  // Australian male
"en-AU-Neural2-C"  // Australian female
```

### Other Languages

```typescript
"es-ES-Neural2-F"  // Spanish (Spain) female
"fr-FR-Neural2-E"  // French female
"de-DE-Neural2-F"  // German female
"ja-JP-Neural2-C"  // Japanese female
"zh-CN-Neural2-D"  // Chinese (Mandarin) male
"hi-IN-Neural2-C"  // Hindi female
```

See full list: [Google Cloud TTS Voices](https://cloud.google.com/text-to-speech/docs/voices)

---

## ⚙️ Customization

### Change Default Voice

Edit `supabase/functions/generate-narration/index.ts`:

```typescript
voice: {
  languageCode: "en-US",
  name: "en-US-Neural2-F", // Change this to your preferred voice
  ssmlGender: "FEMALE"      // MALE, FEMALE, or NEUTRAL
}
```

### Adjust Speech Parameters

```typescript
audioConfig: {
  audioEncoding: "MP3",
  speakingRate: 0.95,     // 0.25 to 4.0 (1.0 = normal)
  pitch: 0.0,             // -20.0 to 20.0 (0 = normal)
  volumeGainDb: 2.0,      // -96.0 to 16.0 (0 = normal)
  effectsProfileId: [
    "small-bluetooth-speaker-class-device",
    "handset-class-device",
    "headphone-class-device"
  ]
}
```

### Add SSML Support

For advanced control (pauses, emphasis, prosody):

```typescript
input: { 
  ssml: `<speak>
    Welcome to this video. 
    <break time="500ms"/>
    <emphasis level="strong">This is important!</emphasis>
  </speak>` 
}
```

---

## 🔧 Troubleshooting

### Error: "API key not valid"

**Solution:**
1. Check API key is correct in Supabase secrets
2. Verify Text-to-Speech API is enabled
3. Check API key restrictions (should allow Text-to-Speech API)

```bash
# Update the key
npx supabase secrets set GOOGLE_CLOUD_TTS_API_KEY=AIza...new-key
npx supabase functions deploy generate-narration
```

### Error: "Quota exceeded"

**Solution:**
1. Check [Google Cloud Quotas](https://console.cloud.google.com/iam-admin/quotas)
2. Verify billing is enabled
3. Request quota increase if needed

### Error: "Permission denied"

**Solution:**
1. Ensure billing is enabled on your Google Cloud project
2. Text-to-Speech API must be enabled
3. API key must have correct permissions

### Slow generation

**Solutions:**
- Google Cloud TTS is very fast (~1-2 seconds per scene)
- If slow, check your network connection
- Consider using batch generation (coming soon)

---

## 🚀 Advanced Features

### Voice Cloning (Custom Voices)

Google Cloud supports custom voice creation:
1. Go to [Cloud Console](https://console.cloud.google.com/)
2. Navigate to Text-to-Speech → Custom Voice
3. Upload voice samples
4. Train custom voice model

### Multi-language Support

Automatically detect language and use appropriate voice:

```typescript
// Frontend can send language code
const languageMap = {
  'en': 'en-US-Neural2-J',
  'es': 'es-ES-Neural2-B',
  'fr': 'fr-FR-Neural2-B',
  'de': 'de-DE-Neural2-B'
};
```

### SSML Templates

Create reusable SSML templates for consistent narration:

```typescript
const ssmlTemplate = (text: string) => `
  <speak>
    <prosody rate="95%" pitch="-2st">
      ${text}
    </prosody>
  </speak>
`;
```

---

## 📊 Comparison with Other TTS Services

| Feature | Google Cloud TTS | OpenAI TTS | ElevenLabs | Browser TTS |
|---------|-----------------|------------|------------|-------------|
| Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Speed | ⚡⚡⚡ | ⚡⚡⚡ | ⚡⚡ | ⚡⚡⚡ |
| Voices | 380+ | 6 | 1000+ | Varies |
| Languages | 40+ | 1 | 29 | Many |
| Cost | $16/1M chars | $15/1M chars | Free tier | Free |
| Setup | Easy | Easy | Easy | None |
| Customization | High | Low | Very High | Low |

---

## ✅ Best Practices

1. **Use Neural2 voices** for best quality
2. **Cache audio files** to avoid regenerating same text
3. **Set speaking rate to 0.9-0.95** for better comprehension
4. **Add effect profiles** for target playback device
5. **Monitor usage** in Google Cloud Console
6. **Use SSML** for complex narration needs

---

## 📞 Support

- **Google Cloud Support:** [support.google.com/cloud](https://support.google.com/cloud)
- **Documentation:** [cloud.google.com/text-to-speech/docs](https://cloud.google.com/text-to-speech/docs)
- **Pricing Calculator:** [cloud.google.com/products/calculator](https://cloud.google.com/products/calculator)

---

## 🎉 You're All Set!

Your video generator now uses **Google Cloud Text-to-Speech** for high-quality narration!

**Current TTS Priority:**
1. ✅ **Google Cloud TTS** (if `GOOGLE_CLOUD_TTS_API_KEY` is set)
2. ⏭️ Chatterbox TTS (if `CHATTERBOX_TTS_URL` is set)
3. ⏭️ OpenAI TTS (if `OPENAI_API_KEY` is set)
4. ⏭️ ElevenLabs (if `ELEVENLABS_API_KEY` is set)
5. ⏭️ Browser TTS (always available)

Generate a video to test it out! 🚀
