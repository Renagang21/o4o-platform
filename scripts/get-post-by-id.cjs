#!/usr/bin/env node

const https = require('https');

const API_BASE_URL = 'https://api.neture.co.kr';
const POST_ID = '2e39c912-9f32-4724-b518-af0faa33d92d'; // 테스트로 생성한 Post ID

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
        console.log(`응답 상태: ${res.statusCode}`);
        console.log('응답 본문:', responseData);

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

    console.log(`📝 Post 조회 중... (ID: ${POST_ID})\n`);

    const post = await apiRequest('GET', `/api/posts/${POST_ID}`, null, token);

    console.log('\n✅ Post 조회 성공!');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
  }
}

main();
