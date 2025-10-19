#!/usr/bin/env node

const https = require('https');

async function apiRequest(method, apiPath, data = null, token = null) {
  const url = new URL(apiPath, 'https://api.neture.co.kr');

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
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${responseData}`);
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
      email: 'admin@neture.co.kr',
      password: 'Test@1234'
    });

    const token = loginResult.token;
    console.log('✅ 로그인 성공\n');

    // 가장 단순한 데이터로 테스트
    console.log('📝 테스트 포스트 생성 중...\n');
    const postData = {
      title: 'Test Document',
      slug: `test-doc-${Date.now()}`,
      status: 'draft'
    };

    console.log('Sending data:', JSON.stringify(postData, null, 2));

    const createResult = await apiRequest('POST', '/api/v1/cpt/docs/posts', postData, token);

    console.log('\n✅ 성공!');
    console.log(JSON.stringify(createResult, null, 2));

  } catch (error) {
    console.error('\n❌ 오류:', error.message);
    process.exit(1);
  }
}

main();
