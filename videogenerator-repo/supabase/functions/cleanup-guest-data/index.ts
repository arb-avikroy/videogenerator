/// <reference types="https://deno.land/x/deno@v1.30.0/cli/dts/lib.deno.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret to ensure this is called by Supabase scheduler
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cleanup attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Starting cleanup of old generations...');

    // Calculate the cutoff dates
    const guestCutoffDate = new Date();
    guestCutoffDate.setDate(guestCutoffDate.getDate() - 10); // Guest data: 10 days
    const guestCutoffISO = guestCutoffDate.toISOString();

    const allCutoffDate = new Date();
    allCutoffDate.setDate(allCutoffDate.getDate() - 30); // All data: 30 days
    const allCutoffISO = allCutoffDate.toISOString();

    console.log(`Guest cutoff date: ${guestCutoffISO}`);
    console.log(`All generations cutoff date: ${allCutoffISO}`);

    // First, get generations that will be deleted to clean up storage
    const { data: generationsToDelete, error: fetchError } = await supabaseClient
      .from('generations')
      .select('id, merged_video')
      .or(`and(guest_session_id.not.is.null,created_at.lt.${guestCutoffISO}),created_at.lt.${allCutoffISO}`)

    if (fetchError) {
      console.error('Error fetching generations:', fetchError);
    }

    let storageDeletedCount = 0;
    
    // Delete video files from storage
    if (generationsToDelete && generationsToDelete.length > 0) {
      console.log(`Found ${generationsToDelete.length} generation(s) to delete`);
      
      for (const gen of generationsToDelete) {
        if (gen.merged_video && gen.merged_video.includes('supabase.co/storage')) {
          try {
            const urlPath = gen.merged_video.split('/storage/v1/object/public/')[1];
            if (urlPath) {
              const [bucket, ...pathParts] = urlPath.split('/');
              const filePath = pathParts.join('/');
              
              const { error: storageError } = await supabaseClient.storage
                .from(bucket)
                .remove([filePath]);
              
              if (storageError) {
                console.error(`Failed to delete storage file ${filePath}:`, storageError);
              } else {
                storageDeletedCount++;
                console.log(`Deleted storage file: ${filePath}`);
              }
            }
          } catch (err) {
            console.error('Error parsing storage URL:', err);
          }
        }
      }
    }

    // Delete guest generations older than 10 days
    const { data: guestDeleted, error: guestError } = await supabaseClient
      .from('generations')
      .delete()
      .not('guest_session_id', 'is', null)
      .lt('created_at', guestCutoffISO)
      .select('id');

    const guestDeletedCount = guestDeleted?.length || 0;
    
    if (guestError) {
      console.error('Error deleting guest data:', guestError);
    } else {
      console.log(`Deleted ${guestDeletedCount} guest generation(s)`);
    }

    // Delete all generations older than 30 days
    const { data: allDeleted, error: allError } = await supabaseClient
      .from('generations')
      .delete()
      .lt('created_at', allCutoffISO)
      .select('id');

    const allDeletedCount = allDeleted?.length || 0;
    
    if (allError) {
      console.error('Error deleting old generations:', allError);
    } else {
      console.log(`Deleted ${allDeletedCount} generation(s) older than 30 days`);
    }

    const totalDeleted = guestDeletedCount + allDeletedCount;

    return new Response(
      JSON.stringify({ 
        success: true,
        deleted_total: totalDeleted,
        deleted_guest: guestDeletedCount,
        deleted_old: allDeletedCount,
        storage_files_deleted: storageDeletedCount,
        guest_cutoff_date: guestCutoffISO,
        all_cutoff_date: allCutoffISO,
        message: `Cleaned up ${totalDeleted} generation(s): ${guestDeletedCount} guest (>10 days), ${allDeletedCount} all users (>30 days), ${storageDeletedCount} storage files`
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
