# Supabase Storage Setup

## Generated Content Bucket

This migration creates a public storage bucket called `generated-content` for storing:
- Generated videos (MP4, WebM)
- Generated images (PNG, JPEG, JPG)
- Generated audio (MP3, MPEG)

### Bucket Configuration
- **Name**: `generated-content`
- **Public**: Yes (allows public read access)
- **File Size Limit**: 50MB
- **Allowed MIME Types**: 
  - `video/mp4`, `video/webm`
  - `image/png`, `image/jpeg`, `image/jpg`
  - `audio/mpeg`, `audio/mp3`

### Security Policies
1. **Upload**: Authenticated users can upload files
2. **Read**: Public read access for all files
3. **Update**: Users can update their own files
4. **Delete**: Users can delete their own files

### File Structure
Videos are stored with the following path pattern:
```
videos/{scriptTitle}_{timestamp}.mp4
```

## Running the Migration

If using Supabase CLI:
```bash
supabase db push
```

Or manually run the migration in your Supabase dashboard SQL editor.

## Manual Setup (Alternative)

If the migration doesn't run automatically:

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `generated-content`
3. Set it as **Public**
4. Configure the policies as described above
