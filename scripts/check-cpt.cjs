#!/usr/bin/env node

const https = require('https');

const API_BASE_URL = 'https://api.neture.co.kr';

async function apiRequest(method, path, data = null, token = null) {
  const url = new URL(path, API_BASE_URL);

  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = https.request(url, options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function main() {
  try {
    console.log('🔐 로그인 중...');

    const loginResult = await apiRequest('POST', '/api/v1/auth/login', {
      email: process.env.ADMIN_EMAIL || 'admin@neture.co.kr',
      password: process.env.ADMIN_PASSWORD || 'Test@1234'
    });

    const token = loginResult.token;
    console.log('✅ 로그인 성공\n');

    // 1. CPT 목록 확인
    console.log('📋 등록된 CPT 목록 확인...');
    try {
      const cptResult = await apiRequest('GET', '/api/custom-post-types', null, token);
      console.log('CPT 목록:', JSON.stringify(cptResult, null, 2));
    } catch (error) {
      console.log('⚠️  CPT API 에러:', error.message);
    }

    // 2. type='docs'인 Post 조회
    console.log('\n📝 type="docs"인 Post 조회...');
    try {
      const postsResult = await apiRequest('GET', '/api/posts?type=docs&limit=5', null, token);
      console.log('docs Post 수:', postsResult.data?.total || postsResult.total || 0);
      console.log('샘플 Post:', JSON.stringify(postsResult.data?.posts?.slice(0, 2) || postsResult.posts?.slice(0, 2) || [], null, 2));
    } catch (error) {
      console.log('⚠️  Post 조회 에러:', error.message);
    }

    // 3. 전체 Post에서 type 확인
    console.log('\n📊 최근 생성된 Post의 type 확인...');
    try {
      const recentPosts = await apiRequest('GET', '/api/posts?limit=10&sort=createdAt:desc', null, token);
      const posts = recentPosts.data?.posts || recentPosts.posts || [];

      console.log('\n최근 10개 Post의 type:');
      posts.forEach((post, idx) => {
        console.log(`  ${idx + 1}. ${post.title} - type: "${post.type}"`);
      });
    } catch (error) {
      console.log('⚠️  에러:', error.message);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

main();
