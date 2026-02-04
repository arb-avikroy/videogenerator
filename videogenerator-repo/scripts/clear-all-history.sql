-- Clear all generation history for all users
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zzgfoxyawssvnzzjvotl/sql

-- First, disable RLS temporarily to delete all records
ALTER TABLE generations DISABLE ROW LEVEL SECURITY;

-- Delete all records
DELETE FROM generations;

-- Re-enable RLS
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- Verify deletion
SELECT COUNT(*) as remaining_records FROM generations;
