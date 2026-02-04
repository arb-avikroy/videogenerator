import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zzgfoxyawssvnzzjvotl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6Z2ZveHlhd3Nzdm56empqdm90bCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MzQ4NTg0MzMsImV4cCI6MjA1MDQzNDQzM30.PjVWkNjrLe4kFY4OQy3kJR-rOXxGEr9LKTq1LXu7N28';

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearAllHistory() {
  try {
    console.log('Deleting all generation history...');
    
    const { error, count } = await supabase
      .from('generations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows (using a condition that matches everything)
    
    if (error) {
      console.error('Error deleting generations:', error);
      process.exit(1);
    }
    
    console.log(`✅ Successfully deleted all generation history!`);
    console.log(`Total records deleted: ${count ?? 'unknown'}`);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

clearAllHistory();
