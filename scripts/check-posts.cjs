#!/usr/bin/env node

const https = require('https');
const { URL } = require('url');

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
          resolve(parsed);
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
    // 로그인
    const loginResult = await apiRequest('POST', '/api/v1/auth/login', {
      email: process.env.ADMIN_EMAIL || 'admin@neture.co.kr',
      password: process.env.ADMIN_PASSWORD || 'Test@1234'
    });

    const token = loginResult.token;

    // Post 조회
    const postsResult = await apiRequest('GET', '/api/posts?limit=100', null, token);

    console.log('생성된 Post 목록:');
    console.log('총', postsResult.data.length, '개\n');

    for (const post of postsResult.data) {
      console.log('='.repeat(80));
      console.log('제목:', post.title);
      console.log('Slug:', post.slug);
      console.log('상태:', post.status);
      console.log('콘텐츠 타입:', typeof post.content);
      console.log('콘텐츠:', JSON.stringify(post.content, null, 2).substring(0, 500));
      console.log();
    }

  } catch (error) {
    console.error('오류:', error.message);
  }
}

main();
