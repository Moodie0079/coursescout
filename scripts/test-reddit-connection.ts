#!/usr/bin/env node

// Load environment variables from .env file
import { config } from 'dotenv';
config();

/**
 * Test Reddit API connection and basic crawling functionality
 */

async function testRedditConnection() {
  console.log('🧪 Testing Reddit API connection...');
  
  try {
    // Check environment variables
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.log('❌ Reddit API credentials not found in environment');
      console.log('📝 Please add to your .env file:');
      console.log('   REDDIT_CLIENT_ID="your-actual-client-id"');
      console.log('   REDDIT_CLIENT_SECRET="your-actual-client-secret"');
      console.log('');
      console.log('🔗 Get credentials at: https://www.reddit.com/prefs/apps');
      return;
    }
    
    console.log('✅ Found Reddit API credentials');
    console.log(`   Client ID: ${clientId.substring(0, 6)}...`);
    
    // Test Reddit OAuth
    console.log('🔐 Testing Reddit OAuth...');
    
    const authResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'CourseScout/1.0.0 (by /u/coursescout)'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!authResponse.ok) {
      throw new Error(`OAuth failed: ${authResponse.status} ${authResponse.statusText}`);
    }
    
    const authData = await authResponse.json();
    console.log('✅ Reddit OAuth successful');
    console.log(`   Access token: ${authData.access_token.substring(0, 10)}...`);
    
    // Test Reddit API call
    console.log('📡 Testing Reddit API call...');
    
    const apiResponse = await fetch('https://oauth.reddit.com/r/CarletonU/search?q=COMP&limit=5&sort=relevance&t=all', {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'User-Agent': 'CourseScout/1.0.0 (by /u/coursescout)'
      }
    });
    
    if (!apiResponse.ok) {
      throw new Error(`API call failed: ${apiResponse.status} ${apiResponse.statusText}`);
    }
    
    const apiData = await apiResponse.json();
    const posts = apiData.data.children;
    
    console.log('✅ Reddit API call successful');
    console.log(`📊 Found ${posts.length} posts about "COMP" in r/CarletonU`);
    
    // Show sample results
    console.log('\n📋 Sample posts:');
    posts.slice(0, 3).forEach((post: any, i: number) => {
      console.log(`   ${i + 1}. "${post.data.title}"`);
      console.log(`      Score: ${post.data.score} | Comments: ${post.data.num_comments}`);
    });
    
    console.log('\n🎉 Reddit API connection test successful!');
    console.log('✅ Ready to start crawling real course data');
    
  } catch (error) {
    console.error('❌ Reddit API test failed:', error);
    console.log('\n💡 Common issues:');
    console.log('   - Wrong client ID or secret');
    console.log('   - App not configured as "script" type');
    console.log('   - Rate limiting (wait a minute and try again)');
  }
}

// Run if called directly
if (require.main === module) {
  testRedditConnection()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export default testRedditConnection;
