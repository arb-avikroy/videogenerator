import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get guest session ID from request
    const { guestSessionId } = await req.json();

    if (!guestSessionId) {
      return new Response(
        JSON.stringify({ error: 'Guest session ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Migrating guest data for session ${guestSessionId} to user ${user.id}`);

    // Update all generations with the guest session ID to associate with the authenticated user
    const { data, error } = await supabaseClient
      .from('generations')
      .update({ 
        user_id: user.id,
        guest_session_id: null 
      })
      .eq('guest_session_id', guestSessionId)
      .select();

    if (error) {
      console.error('Error migrating guest data:', error);
      throw error;
    }

    const count = data?.length || 0;
    console.log(`Successfully migrated ${count} generation(s)`);

    return new Response(
      JSON.stringify({ 
        success: true,
        count,
        message: `${count} generation(s) migrated successfully` 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
