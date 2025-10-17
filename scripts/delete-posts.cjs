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

    // 마크다운에서 생성된 post 찾기
    const postsResult = await apiRequest('GET', '/api/posts?limit=100', null, token);

    const markdownPosts = postsResult.data.filter(p =>
      p.slug.includes('from-md-') || p.slug.includes('appearance-')
    );

    console.log(`삭제할 post: ${markdownPosts.length}개\n`);

    for (const post of markdownPosts) {
      try {
        console.log(`삭제 중: ${post.title} (${post.slug})`);
        await apiRequest('DELETE', `/api/posts/${post.id}`, null, token);
        console.log(`  ✅ 삭제 완료`);
      } catch (error) {
        console.error(`  ❌ 실패:`, error.message);
      }
    }

    console.log('\n🎉 삭제 완료!');
  } catch (error) {
    console.error('오류:', error.message);
  }
}

main();
