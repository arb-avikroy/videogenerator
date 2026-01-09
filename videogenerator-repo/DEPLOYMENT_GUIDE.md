# Google Authentication & User Data Persistence - Deployment Guide

## Prerequisites

- Supabase project: `zzgfoxyawssvnzzjvotl`
- Google Cloud Console account
- Supabase CLI installed

## Step 1: Apply Database Migrations

```powershell
cd "C:\Users\avik.roy.barman\OneDrive - Accenture\VisualCode\videogenerator\videogenerator-repo"

# Link to the Supabase project (first time only)
npx supabase link --project-ref zzgfoxyawssvnzzjvotl

# Apply migrations to create database schema
npx supabase db push
```

**Note:** If you see a warning about database version mismatch, update `supabase/config.toml`:
```toml
[db]
major_version = 17
```

## Step 2: Configure Google OAuth

### A. Google Cloud Console

1. Go to https://console.cloud.google.com/
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Select **Web application**
6. Configure:
   - **Authorized JavaScript origins:**
     - `http://127.0.0.1:3000`
     - `https://zzgfoxyawssvnzzjvotl.supabase.co`
   - **Authorized redirect URIs:**
     - `https://zzgfoxyawssvnzzjvotl.supabase.co/auth/v1/callback`
     - `http://127.0.0.1:3000`
7. Copy **Client ID** and **Client Secret**

### B. Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/zzgfoxyawssvnzzjvotl
2. Navigate to **Authentication** > **Providers**
3. Find **Google** provider
4. Toggle **Enabled**
5. Paste **Client ID** and **Client Secret** from Google Cloud Console
6. Save changes

## Step 3: Deploy Edge Functions

```powershell
# Deploy all functions
npx supabase functions deploy generate-script --project-ref zzgfoxyawssvnzzjvotl --no-verify-jwt
npx supabase functions deploy generate-image --project-ref zzgfoxyawssvnzzjvotl --no-verify-jwt
npx supabase functions deploy generate-video --project-ref zzgfoxyawssvnzzjvotl --no-verify-jwt
npx supabase functions deploy migrate-guest-data --project-ref zzgfoxyawssvnzzjvotl
npx supabase functions deploy cleanup-guest-data --project-ref zzgfoxyawssvnzzjvotl
```

## Step 4: Set Supabase Secrets

```powershell
# Set cron secret for cleanup function
npx supabase secrets set CRON_SECRET=your-random-secret-here --project-ref zzgfoxyawssvnzzjvotl

# Verify existing secrets are still set
npx supabase secrets list --project-ref zzgfoxyawssvnzzjvotl
```

Required secrets:
- `OPENROUTER_API_KEY` (already set)
- `HUGGINGFACE_API_KEY` (already set)
- `IMAGEGEN_API_URL` (already set)
- `IMAGEGEN_API_KEY` (already set)
- `CRON_SECRET` (new - generate a random string)

## Step 5: Install New Dependencies

```powershell
cd "C:\Users\avik.roy.barman\OneDrive - Accenture\VisualCode\videogenerator\videogenerator-repo"

# Install JSZip for history ZIP downloads
npm install jszip @types/jszip
```

## Step 6: Test the Implementation

### A. Run Local Tests

```powershell
# Run authentication and RLS tests (requires .env file with Supabase credentials)
npx tsx scripts/test-auth.ts
```

**Note:** Ensure your `.env` file contains:
```env
VITE_SUPABASE_URL=https://zzgfoxyawssvnzzjvotl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

### B. Manual Testing Checklist

1. **Guest Mode:**
   - [ ] Visit http://127.0.0.1:3000
   - [ ] Should redirect to /login
   - [ ] Click "Continue as Guest"
   - [ ] Should see "Guest Mode" badge in header
   - [ ] Generate a script/image/video
   - [ ] Verify no database entry (guest data is ephemeral unless saved)

2. **Google Login:**
   - [ ] Click "Sign In with Google"
   - [ ] Should redirect to Google OAuth consent
   - [ ] After consent, redirect back to app
   - [ ] Should see user email in header dropdown

3. **Guest Migration:**
   - [ ] Start in guest mode
   - [ ] Generate content
   - [ ] Click "Log In" and sign in with Google
   - [ ] Should see toast: "X generation(s) migrated successfully"
   - [ ] Go to History page - should see migrated content

4. **History Page:**
   - [ ] As authenticated user, click "History" in header
   - [ ] Should see table of all generations
   - [ ] Test download individual generation
   - [ ] Test "Download All as ZIP"
   - [ ] Verify ZIP structure (scripts/, images/, videos/, metadata.json)
   - [ ] Test delete individual generation
   - [ ] Test "Delete All" with confirmation dialog

5. **Session Management:**
   - [ ] Sign in and use the app
   - [ ] Wait for idle timeout warning (5 minutes before 6 hours)
   - [ ] Should see toast with "Stay Logged In" button
   - [ ] Click "Stay Logged In" - should reset timer
   - [ ] After 6 hours idle, should auto-logout

6. **RLS Verification:**
   - [ ] Create 2 test accounts
   - [ ] Generate content with User A
   - [ ] Sign out, sign in as User B
   - [ ] Go to History - should NOT see User A's content
   - [ ] Only see User B's own content

## Step 7: Configure Production URLs

Update `supabase/config.toml`:

```toml
[auth]
site_url = "https://your-production-domain.com"
additional_redirect_urls = [
  "https://your-production-domain.com",
  "http://127.0.0.1:3000"
]

[auth.external.google]
enabled = true
# Client ID and Secret are set in Supabase Dashboard
```

Then update Google Cloud Console OAuth redirect URIs:
- Add: `https://your-production-domain.com`

## Step 8: Monitor Cron Jobs

**Note:** Cron scheduling for Edge Functions is configured in the Supabase Dashboard, not in config.toml.

1. Go to Supabase Dashboard > **Edge Functions**
2. Find `cleanup-guest-data` function
3. Click on **Settings** or **Configure**
4. Set **Cron Schedule**: `0 2 * * *` (runs daily at 2 AM UTC)
5. Check logs to verify execution
6. Should see: "Cleaned up X guest generation(s) older than 10 days"

## Troubleshooting

### Migration Fails

```powershell
# Check migration status
npx supabase db diff --project-ref zzgfoxyawssvnzzjvotl

# Reset and reapply
npx supabase db reset --project-ref zzgfoxyawssvnzzjvotl
```

### Google OAuth Not Working

1. Verify redirect URIs exactly match (including http/https)
2. Check Google Cloud Console > OAuth Consent Screen is published
3. Verify Client ID/Secret in Supabase Dashboard are correct
4. Check browser console for errors

### RLS Policy Issues

```sql
-- Connect to Supabase SQL Editor and run:
SELECT * FROM pg_policies WHERE tablename IN ('generations', 'projects');

-- Verify policies exist and are enabled
```

### Guest Cleanup Not Running

```powershell
# Manually invoke to test
npx supabase functions invoke cleanup-guest-data --project-ref zzgfoxyawssvnzzjvotl
```

## Environment Variables

Ensure `.env` file has:

```env
VITE_SUPABASE_URL=https://zzgfoxyawssvnzzjvotl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

## Rollback Plan

If issues occur:

1. **Disable Google OAuth:**
   - Supabase Dashboard > Authentication > Providers > Google > Disable

2. **Revert Edge Functions:**
   ```powershell
   git checkout HEAD~1 supabase/functions/
   npx supabase functions deploy generate-script --project-ref zzgfoxyawssvnzzjvotl
   # Repeat for other functions
   ```

3. **Drop New Tables:**
   ```sql
   DROP TABLE IF EXISTS generations CASCADE;
   DROP TABLE IF EXISTS projects CASCADE;
   DROP TYPE IF EXISTS generation_type;
   ```

## Success Criteria

- ✅ Users can log in with Google
- ✅ Guest mode works without database persistence
- ✅ Guest data migrates on login
- ✅ RLS prevents cross-user data access
- ✅ History page shows paginated generations
- ✅ ZIP download includes all generations with folder structure
- ✅ Idle timeout warning shows at 5:55 hours
- ✅ Auto-logout occurs at 6 hours idle
- ✅ Cron job cleans up 10+ day old guest data
- ✅ All tests in test-auth.ts pass

## Next Steps

1. Set up monitoring for Edge Functions
2. Implement rate limiting (future enhancement)
3. Add Supabase Storage for large video files (future enhancement)
4. Create admin dashboard for user management (future enhancement)
