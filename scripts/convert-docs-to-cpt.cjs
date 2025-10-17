#!/usr/bin/env node

/**
 * docs 폴더의 마크다운 파일들을 'docs' CPT로 변환하는 스크립트
 * - 폴더 이름 → 카테고리
 * - 마크다운 첫 # 제목 → Post 제목
 * - 마크다운 내용 → o4o/markdown 블록
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

// 카테고리 생성 또는 가져오기
async function getOrCreateCategory(categoryName, token) {
  try {
    // 먼저 존재하는지 확인
    const existingResult = await apiRequest('GET', `/api/categories?search=${encodeURIComponent(categoryName)}`, null, token);

    const existing = existingResult.data?.categories?.find(c => c.name === categoryName);
    if (existing) {
      return existing.id;
    }

    // 없으면 생성
    const slug = categoryName
      .toLowerCase()
      .replace(/\//g, '-')
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const createResult = await apiRequest('POST', '/api/categories', {
      name: categoryName,
      slug,
      description: `${categoryName} 관련 문서`
    }, token);

    return createResult.data?.category?.id || createResult.data?.id;
  } catch (error) {
    console.error(`  ⚠️  카테고리 생성 실패: ${categoryName}`, error.message);
    return null;
  }
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
    const docsFiles = JSON.parse(fs.readFileSync(docsFilesPath, 'utf-8'));

    console.log(`📄 총 ${docsFiles.length}개의 문서 파일 발견\n`);

    // 카테고리별로 그룹화
    const byCategory = {};
    docsFiles.forEach(file => {
      if (!byCategory[file.category]) {
        byCategory[file.category] = [];
      }
      byCategory[file.category].push(file);
    });

    // 카테고리 먼저 생성
    console.log('📁 카테고리 생성 중...');
    const categoryMap = {};
    for (const categoryName of Object.keys(byCategory)) {
      const displayName = categoryName === 'root' ? '기본 문서' : categoryName;
      const categoryId = await getOrCreateCategory(displayName, token);
      if (categoryId) {
        categoryMap[categoryName] = categoryId;
        console.log(`  ✅ ${displayName} (ID: ${categoryId})`);
      }
    }

    console.log(`\n📝 ${docsFiles.length}개의 문서를 Post로 변환 중...\n`);

    const createdPosts = [];
    const failedPosts = [];

    for (const file of docsFiles) {
      try {
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

        // 카테고리 ID 가져오기
        const categoryIds = categoryMap[file.category] ? [categoryMap[file.category]] : [];

        // Post 생성
        const postData = {
          title: file.title,
          slug,
          content: JSON.stringify(blocks),
          status: 'publish', // 문서는 바로 공개
          type: 'docs', // CPT type
          excerpt: `${file.category} 카테고리의 기술 문서`,
          categoryIds,
          featuredImageId: null
        };

        const createResult = await apiRequest('POST', '/api/posts', postData, token);

        const post = createResult.data?.post || createResult.post || createResult.data;

        createdPosts.push({
          title: file.title,
          slug: post.slug,
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
      console.log('실패한 문서:');
      failedPosts.forEach(f => {
        console.log(`  - [${f.category}] ${f.title}: ${f.error}`);
      });
    }

    // 카테고리별 통계
    console.log('\n📊 카테고리별 생성 통계:');
    const statsByCategory = {};
    createdPosts.forEach(post => {
      statsByCategory[post.category] = (statsByCategory[post.category] || 0) + 1;
    });
    Object.keys(statsByCategory).sort().forEach(cat => {
      console.log(`  ${cat}: ${statsByCategory[cat]}개`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

main();
