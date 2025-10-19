#!/usr/bin/env node

/**
 * docs 폴더의 마크다운 파일들을 'docs' CPT로 마이그레이션하는 스크립트
 * - docs CPT Type이 이미 생성되어 있어야 함
 * - 폴더 이름 → 카테고리
 * - 마크다운 내용 → o4o/markdown 블록
 * - CPT Post로 저장: POST /api/v1/cpt/docs/posts
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'https://api.neture.co.kr';

// API 요청 헬퍼
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

// 마크다운을 Gutenberg 블록으로 변환
function convertMarkdownToBlocks(markdown) {
  return [{
    type: 'o4o/markdown',
    attributes: {
      content: markdown,
      showToc: true
    }
  }];
}

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

    // docs-files.json 읽기
    const docsFilesPath = path.join(__dirname, 'docs-files.json');
    const allDocsFiles = JSON.parse(fs.readFileSync(docsFilesPath, 'utf-8'));

    // 테스트: 처음 2개만
    const docsFiles = process.env.TEST_MODE ? allDocsFiles.slice(0, 2) : allDocsFiles;

    console.log(`📄 총 ${docsFiles.length}개의 문서 파일 발견${process.env.TEST_MODE ? ' (테스트 모드)' : ''}\n`);
    console.log(`📝 ${docsFiles.length}개의 문서를 CPT Post로 변환 중...\n`);

    const createdPosts = [];
    const failedPosts = [];

    // 요청 간 delay 함수
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (const file of docsFiles) {
      try {
        // Rate limit 방지를 위한 delay (100ms)
        await delay(100);
        // 마크다운 내용 읽기
        const content = fs.readFileSync(file.fullPath, 'utf-8');

        // slug 생성
        const basename = path.basename(file.filename, '.md');
        const timestamp = Date.now();
        const slug = `docs-${basename}-${timestamp}`
          .toLowerCase()
          .replace(/[^a-z0-9가-힣]+/g, '-')
          .replace(/^-+|-+$/g, '');

        // Gutenberg 블록으로 변환
        const blocks = convertMarkdownToBlocks(content);

        // CPT Post 생성
        const postData = {
          title: file.title,
          slug,
          content: JSON.stringify(blocks),
          status: 'publish', // 문서는 바로 공개
          meta: {
            original_path: file.fullPath,
            category_name: file.category,
            excerpt: `${file.category} 카테고리의 기술 문서`
          }
        };

        // CPT API로 생성: POST /api/v1/cpt/docs/posts
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
      console.log('\n실패한 문서 (처음 10개):');
      failedPosts.slice(0, 10).forEach(f => {
        console.log(`  - [${f.category}] ${f.title}: ${f.error}`);
      });
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

main();
