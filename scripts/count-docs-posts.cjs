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

    // 1. 모든 Post 조회해서 type='docs'인 것 필터링
    console.log('📊 전체 Post 조회 중...');

    let allPosts = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const result = await apiRequest('GET', `/api/posts?page=${page}&limit=${limit}`, null, token);
      const posts = result.data?.posts || result.posts || [];

      if (posts.length === 0) break;

      allPosts = allPosts.concat(posts);
      console.log(`  페이지 ${page}: ${posts.length}개 로드됨`);

      page++;

      // 최대 1000개까지만
      if (allPosts.length >= 1000) break;
    }

    console.log(`\n전체 Post 수: ${allPosts.length}개`);

    // type별로 분류
    const byType = {};
    allPosts.forEach(post => {
      const type = post.type || 'undefined';
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(post);
    });

    console.log('\n📋 Type별 분류:');
    Object.keys(byType).sort().forEach(type => {
      console.log(`  ${type}: ${byType[type].length}개`);
    });

    // docs Post 샘플 출력
    const docsPosts = byType['docs'] || [];
    if (docsPosts.length > 0) {
      console.log(`\n📝 docs Post 샘플 (최근 5개):`);
      docsPosts.slice(0, 5).forEach((post, idx) => {
        console.log(`  ${idx + 1}. ${post.title} (slug: ${post.slug})`);
      });
    } else {
      console.log('\n⚠️  type="docs"인 Post가 하나도 없습니다!');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

main();
