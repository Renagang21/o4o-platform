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
        console.log(`\n응답 상태: ${res.statusCode}`);
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
    console.log('✅ 로그인 성공');

    // 테스트 Post 생성
    console.log('\n📝 테스트 Post 생성 중...');

    const testBlocks = [{
      type: 'o4o/markdown',
      attributes: {
        content: '# 테스트 문서\n\n이것은 테스트 문서입니다.',
        showToc: true
      }
    }];

    const postData = {
      title: 'CPT 테스트 문서',
      slug: `test-cpt-docs-${Date.now()}`,
      content: JSON.stringify(testBlocks),
      status: 'publish',
      type: 'docs',
      excerpt: '테스트용 문서',
      categoryIds: [],
      featuredImageId: null
    };

    console.log('\n요청 데이터:', JSON.stringify(postData, null, 2));

    const result = await apiRequest('POST', '/api/posts', postData, token);

    console.log('\n✅ 생성 성공!');
    console.log('결과:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

main();
