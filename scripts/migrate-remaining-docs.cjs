#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'https://api.neture.co.kr';

async function apiRequest(method, apiPath, data = null, token = null) {
  const url = new URL(apiPath, API_BASE_URL);

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

function convertMarkdownToBlocks(markdown) {
  return [{
    type: 'o4o/markdown',
    attributes: {
      content: markdown,
      showToc: true
    }
  }];
}

// 실패한 6개 문서만
const remainingFiles = [
  {
    title: 'Admin Dashboard - 메뉴/템플릿 관리 UI 구현 완료',
    category: 'v',
    fullPath: '/home/sohae21/o4o-platform/docs/v/ADMIN_UI_IMPLEMENTATION.md'
  },
  {
    title: 'AI-Page-Builder_Node-Research_2025-10-11',
    category: 'v',
    fullPath: '/home/sohae21/o4o-platform/docs/v/AI-Page-Builder_Node-Research_2025-10-11.md'
  },
  {
    title: 'Authentication Middleware Migration Report',
    category: 'v',
    fullPath: '/home/sohae21/o4o-platform/docs/v/AUTH_MIDDLEWARE_MIGRATION_REPORT.md'
  },
  {
    title: 'Frontend 서브도메인/경로별 메뉴/테마 시스템 구현 완료',
    category: 'v',
    fullPath: '/home/sohae21/o4o-platform/docs/v/FRONTEND_IMPLEMENTATION.md'
  },
  {
    title: '🧪 통합 테스트 및 검증 리포트',
    category: 'v',
    fullPath: '/home/sohae21/o4o-platform/docs/v/INTEGRATION_TEST_REPORT.md'
  },
  {
    title: 'Menu CRUD API 연동 완료',
    category: 'v',
    fullPath: '/home/sohae21/o4o-platform/docs/v/MENU_API_INTEGRATION.md'
  }
];

async function main() {
  try {
    console.log('🔐 로그인 중...');

    const loginEmail = process.env.ADMIN_EMAIL || 'admin@neture.co.kr';
    const loginPassword = process.env.ADMIN_PASSWORD || 'Test@1234';

    const loginResult = await apiRequest('POST', '/api/v1/auth/login', {
      email: loginEmail,
      password: loginPassword
    });

    const token = loginResult.token;
    console.log('✅ 로그인 성공\n');

    console.log(`📝 나머지 ${remainingFiles.length}개의 문서를 CPT Post로 변환 중...\n`);

    const createdPosts = [];
    const failedPosts = [];

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (const file of remainingFiles) {
      try {
        // Rate limit 방지를 위한 delay (500ms)
        await delay(500);

        const content = fs.readFileSync(file.fullPath, 'utf-8');

        const basename = path.basename(file.fullPath, '.md');
        const timestamp = Date.now();
        const slug = `docs-${basename}-${timestamp}`
          .toLowerCase()
          .replace(/[^a-z0-9가-힣]+/g, '-')
          .replace(/^-+|-+$/g, '');

        const blocks = convertMarkdownToBlocks(content);

        const postData = {
          title: file.title,
          slug,
          content: JSON.stringify(blocks),
          status: 'publish',
          meta: {
            original_path: file.fullPath,
            category_name: file.category,
            excerpt: `${file.category} 카테고리의 기술 문서`
          }
        };

        const createResult = await apiRequest('POST', '/api/v1/cpt/docs/posts', postData, token);

        const post = createResult.data?.post || createResult.data;

        createdPosts.push({
          title: file.title,
          slug: post.slug || slug,
          category: file.category,
          id: post.id
        });

        console.log(`  ✅ [${file.category}] ${file.title}`);
      } catch (error) {
        failedPosts.push({
          title: file.title,
          category: file.category,
          error: error.message
        });
        console.error(`  ❌ [${file.category}] ${file.title}: ${error.message}`);
      }
    }

    console.log('\n🎉 작업 완료!\n');
    console.log(`✅ 성공: ${createdPosts.length}개`);
    console.log(`❌ 실패: ${failedPosts.length}개\n`);

    if (failedPosts.length > 0) {
      console.log('\n실패한 문서:');
      failedPosts.forEach(f => {
        console.log(`  - [${f.category}] ${f.title}: ${f.error}`);
      });
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

main();
