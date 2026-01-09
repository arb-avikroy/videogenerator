/**
 * Test script for Row Level Security (RLS) policies and guest data migration
 * 
 * Prerequisites:
 * 1. Supabase project must be running locally or deployed
 * 2. Database migrations must be applied
 * 3. Environment variables must be set in .env file
 * 
 * Run with: bun run scripts/test-auth.ts
 */

import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Test user credentials (you'll need to create these manually first)
const TEST_USER_A = {
  email: 'test-user-a@example.com',
  password: 'TestPassword123!'
};

const TEST_USER_B = {
  email: 'test-user-b@example.com',
  password: 'TestPassword123!'
};

let userAClient: SupabaseClient;
let userBClient: SupabaseClient;
let userAId: string;
let userBId: string;
let guestSessionId: string;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testGuestGeneration() {
  console.log('\n📝 TEST 1: Guest Generation');
  console.log('═══════════════════════════════════════════════════════════');
  
  const guestClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  guestSessionId = crypto.randomUUID();
  
  console.log(`Creating guest session: ${guestSessionId}`);
  
  // Create a guest generation
  const { data, error } = await guestClient
    .from('generations')
    .insert({
      guest_session_id: guestSessionId,
      type: 'script',
      title: 'Guest Test Script',
      content: { title: 'Test', scenes: [] },
      metadata: { test: true }
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Failed to create guest generation:', error.message);
    return false;
  }
  
  console.log('✅ Guest generation created:', data.id);
  
  // Verify we can read it back (without auth, should work for guest data)
  const { data: retrieved, error: retrieveError } = await guestClient
    .from('generations')
    .select('*')
    .eq('guest_session_id', guestSessionId);
  
  if (retrieveError) {
    console.error('❌ Failed to retrieve guest generation:', retrieveError.message);
    return false;
  }
  
  console.log(`✅ Retrieved ${retrieved?.length || 0} guest generation(s)`);
  return true;
}

async function testUserSignUp() {
  console.log('\n📝 TEST 2: User Sign Up');
  console.log('═══════════════════════════════════════════════════════════');
  
  userAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  userBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Try to sign in first (in case users already exist)
  let signInA = await userAClient.auth.signInWithPassword(TEST_USER_A);
  
  if (signInA.error) {
    console.log('User A doesn\'t exist, creating...');
    const signUpA = await userAClient.auth.signUp(TEST_USER_A);
    if (signUpA.error) {
      console.error('❌ Failed to create User A:', signUpA.error.message);
      return false;
    }
    await sleep(1000);
    signInA = await userAClient.auth.signInWithPassword(TEST_USER_A);
  }
  
  if (signInA.error || !signInA.data.user) {
    console.error('❌ Failed to sign in User A:', signInA.error?.message);
    return false;
  }
  
  userAId = signInA.data.user.id;
  console.log(`✅ User A signed in: ${userAId}`);
  
  // User B
  let signInB = await userBClient.auth.signInWithPassword(TEST_USER_B);
  
  if (signInB.error) {
    console.log('User B doesn\'t exist, creating...');
    const signUpB = await userBClient.auth.signUp(TEST_USER_B);
    if (signUpB.error) {
      console.error('❌ Failed to create User B:', signUpB.error.message);
      return false;
    }
    await sleep(1000);
    signInB = await userBClient.auth.signInWithPassword(TEST_USER_B);
  }
  
  if (signInB.error || !signInB.data.user) {
    console.error('❌ Failed to sign in User B:', signInB.error?.message);
    return false;
  }
  
  userBId = signInB.data.user.id;
  console.log(`✅ User B signed in: ${userBId}`);
  
  return true;
}

async function testUserACreatesGeneration() {
  console.log('\n📝 TEST 3: User A Creates Generation');
  console.log('═══════════════════════════════════════════════════════════');
  
  const { data, error } = await userAClient
    .from('generations')
    .insert({
      user_id: userAId,
      type: 'image',
      title: 'User A Test Image',
      content: { url: 'data:image/png;base64,...' },
      metadata: { test: true }
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Failed to create generation for User A:', error.message);
    return false;
  }
  
  console.log('✅ User A generation created:', data.id);
  return true;
}

async function testRLSPolicies() {
  console.log('\n📝 TEST 4: RLS Policy Enforcement');
  console.log('═══════════════════════════════════════════════════════════');
  
  // User A should see their own data
  const { data: userAData, error: userAError } = await userAClient
    .from('generations')
    .select('*')
    .eq('user_id', userAId);
  
  if (userAError) {
    console.error('❌ User A failed to read own data:', userAError.message);
    return false;
  }
  
  console.log(`✅ User A can read own data: ${userAData?.length || 0} generation(s)`);
  
  // User B should NOT see User A's data
  const { data: userBSeesA, error: userBError } = await userBClient
    .from('generations')
    .select('*')
    .eq('user_id', userAId);
  
  if (userBError) {
    console.log(`✅ User B cannot query User A's data (expected): ${userBError.message}`);
  } else if (userBSeesA && userBSeesA.length === 0) {
    console.log('✅ User B gets empty result for User A\'s data (RLS working)');
  } else {
    console.error('❌ RLS VIOLATION: User B can see User A\'s data!', userBSeesA);
    return false;
  }
  
  // User B should only see their own data
  const { data: userBData, error: userBOwnError } = await userBClient
    .from('generations')
    .select('*')
    .eq('user_id', userBId);
  
  if (userBOwnError) {
    console.error('❌ User B failed to read own data:', userBOwnError.message);
    return false;
  }
  
  console.log(`✅ User B can read own data: ${userBData?.length || 0} generation(s)`);
  
  return true;
}

async function testGuestMigration() {
  console.log('\n📝 TEST 5: Guest Data Migration');
  console.log('═══════════════════════════════════════════════════════════');
  
  if (!guestSessionId) {
    console.error('❌ No guest session ID available (Test 1 may have failed)');
    return false;
  }
  
  // Call migration Edge Function
  const { data: session } = await userAClient.auth.getSession();
  
  if (!session.session) {
    console.error('❌ No active session for User A');
    return false;
  }
  
  const { data, error } = await userAClient.functions.invoke('migrate-guest-data', {
    body: { guestSessionId },
    headers: {
      Authorization: `Bearer ${session.session.access_token}`
    }
  });
  
  if (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  }
  
  console.log(`✅ Migration successful: ${data.count} generation(s) migrated`);
  
  // Verify the guest generation now belongs to User A
  const { data: migrated, error: migratedError } = await userAClient
    .from('generations')
    .select('*')
    .eq('user_id', userAId)
    .eq('type', 'script');
  
  if (migratedError) {
    console.error('❌ Failed to verify migrated data:', migratedError.message);
    return false;
  }
  
  const hasMigrated = migrated?.some(g => g.title === 'Guest Test Script');
  
  if (hasMigrated) {
    console.log('✅ Guest generation now belongs to User A');
  } else {
    console.error('❌ Guest generation was not migrated properly');
    return false;
  }
  
  return true;
}

async function cleanup() {
  console.log('\n🧹 Cleanup');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Delete all test data (optional - comment out to keep for inspection)
  if (userAClient && userAId) {
    await userAClient
      .from('generations')
      .delete()
      .eq('user_id', userAId);
    console.log('✅ Deleted User A test data');
  }
  
  if (userBClient && userBId) {
    await userBClient
      .from('generations')
      .delete()
      .eq('user_id', userBId);
    console.log('✅ Deleted User B test data');
  }
  
  // Note: User accounts remain for future tests
  console.log('ℹ️  Test user accounts preserved for future runs');
}

async function runTests() {
  console.log('🚀 Starting Authentication & RLS Tests');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const results: { [key: string]: boolean } = {};
  
  results['Guest Generation'] = await testGuestGeneration();
  results['User Sign Up'] = await testUserSignUp();
  results['User A Creates Generation'] = await testUserACreatesGeneration();
  results['RLS Policy Enforcement'] = await testRLSPolicies();
  results['Guest Data Migration'] = await testGuestMigration();
  
  await cleanup();
  
  console.log('\n📊 Test Results Summary');
  console.log('═══════════════════════════════════════════════════════════');
  
  let passed = 0;
  let failed = 0;
  
  for (const [test, result] of Object.entries(results)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test}`);
    if (result) passed++;
    else failed++;
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`Total: ${passed + failed} tests | Passed: ${passed} | Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
