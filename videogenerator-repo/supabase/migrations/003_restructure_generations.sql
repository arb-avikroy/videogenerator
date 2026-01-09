-- Drop the old generations table and create new structure
-- This will consolidate script, images, videos, and audio into one row per generation session

DROP TABLE IF EXISTS generations CASCADE;

CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_session_id TEXT,
  
  -- Project info
  title TEXT NOT NULL,
  topic TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- All artifacts in one row
  script JSONB, -- {title, scenes: [{sceneNumber, visualDescription, narration, duration}]}
  images JSONB DEFAULT '[]'::jsonb, -- [{sceneNumber, url, prompt, provider}]
  videos JSONB DEFAULT '[]'::jsonb, -- [{sceneNumber, videoUrl, audioUrl}]
  merged_video TEXT, -- data URL or URL to final merged video
  narration_audio JSONB DEFAULT '[]'::jsonb, -- [{sceneNumber, audioUrl}]
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- {model, provider, sceneCount, sceneDuration, etc}
  
  -- Constraints
  CONSTRAINT user_or_guest CHECK (
    (user_id IS NOT NULL AND guest_session_id IS NULL) OR
    (user_id IS NULL AND guest_session_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_guest_session_id ON generations(guest_session_id);
CREATE INDEX idx_generations_created_at ON generations(created_at DESC);

-- Row Level Security
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own generations
CREATE POLICY "Users can view own generations"
  ON generations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own generations
CREATE POLICY "Users can insert own generations"
  ON generations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own generations
CREATE POLICY "Users can update own generations"
  ON generations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own generations
CREATE POLICY "Users can delete own generations"
  ON generations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_generations_updated_at
  BEFORE UPDATE ON generations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
