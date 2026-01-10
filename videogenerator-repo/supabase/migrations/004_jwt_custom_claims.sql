-- Add custom claims to JWT for GCP Workload Identity Federation
-- This adds the 'aud' claim needed for WIF

-- Create function to add custom claims to JWT
CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Add GCP WIF audience to JWT claims
  event := jsonb_set(
    event,
    '{claims,aud}',
    '"https://iam.googleapis.com/projects/792771316096/locations/global/workloadIdentityPools/supabase-pool/providers/mysupabase-oidc"'::jsonb
  );
  
  RETURN event;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook TO postgres;
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook TO anon;
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook TO authenticated;
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook TO service_role;

-- Set the hook in auth configuration
-- Note: You'll also need to add this to your Supabase config.toml:
-- [auth.hook.custom_access_token]
-- enabled = true
-- uri = "pg-functions://postgres/auth/custom_access_token_hook"
