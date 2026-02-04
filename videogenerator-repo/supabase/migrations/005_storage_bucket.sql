-- Create storage bucket for generated content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-content',
  'generated-content',
  true,
  52428800, -- 50MB limit
  ARRAY['video/mp4', 'video/webm', 'image/png', 'image/jpeg', 'image/jpg', 'audio/mpeg', 'audio/mp3']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to generated-content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'generated-content'
);

-- Policy: Allow public read access (since bucket is public)
CREATE POLICY "Public read access to generated-content"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'generated-content');

-- Policy: Allow users to update their own files
CREATE POLICY "Users can update own files in generated-content"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'generated-content' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow users to delete their own files
CREATE POLICY "Users can delete own files in generated-content"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'generated-content' AND auth.uid()::text = (storage.foldername(name))[1]);
