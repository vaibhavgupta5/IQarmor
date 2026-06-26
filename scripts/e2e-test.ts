import 'dotenv/config';
// This script tests the core flow programmatically

async function testFlow() {
  const BACKEND = 'http://localhost:3001';
  
  console.log('1. Health check...');
  const health = await fetch(`${BACKEND}/api/health/live`);
  console.assert(health.status === 200, 'Health check failed');

  // 2. Auth: get a test token
  // (User must exist in Supabase — create via dashboard or signup)
  // If you have TEST_USER_EMAIL and TEST_USER_PASSWORD in .env:
  console.log('2. Skipping auth test — create user in Supabase dashboard first');

  console.log('✅ Basic connectivity confirmed');
}

testFlow().catch(console.error);
