#!/usr/bin/env node

/**
 * 서버의 모든 마크다운 파일을 post로 변환하는 스크립트
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const API_BASE_URL = 'https://api.neture.co.kr';

// 서버의 마크다운 파일 목록
const MARKDOWN_FILES = [
  { filename: '1759968968859-bcya20v3b.md', title: 'AI 페이지 자동 생성 기능 매뉴얼' },
  { filename: '1759968997147-irjijhd33.md', title: 'O4O Platform 관리자 매뉴얼' },
  { filename: '1759968997180-01q8tkyac.md', title: 'AI 페이지 자동 생성 기능 매뉴얼 (2)' },
  { filename: '1759968997211-79q3vkw46.md', title: '외모 - 사용자 정의하기 매뉴얼' },
  { filename: '1759968997243-n6cs0jnj1.md', title: '외모 - 메뉴 매뉴얼' },
  { filename: '1759968997274-uvehjtc0b.md', title: '외모 - 템플릿 파트 매뉴얼' },
];

// API 요청 헬퍼
async function apiRequest(method, path, data = null, token = null) {
  const url = new URL(path, API_BASE_URL);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

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

    const req = client.request(url, options, (res) => {
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

// 파일 다운로드
async function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    client.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    }).on('error', reject);
  });
}

// 마크다운을 Gutenberg 블록으로 변환
function convertMarkdownToBlocks(markdown) {
  const blocks = [];

  blocks.push({
    type: 'o4o/markdown',
    attributes: {
      content: markdown,
      showToc: true
    }
  });

  return blocks;
}

async function main() {
  try {
    console.log('🔐 로그인 중...');

    // 로그인
    const loginEmail = process.env.ADMIN_EMAIL || 'admin@neture.co.kr';
    const loginPassword = process.env.ADMIN_PASSWORD || 'Test@1234';

    const loginResult = await apiRequest('POST', '/api/v1/auth/login', {
      email: loginEmail,
      password: loginPassword
    });

    const token = loginResult.token;
    console.log('✅ 로그인 성공');

    console.log(`\n📝 ${MARKDOWN_FILES.length}개의 마크다운 파일 처리 중...\n`);

    const createdPosts = [];

    for (const file of MARKDOWN_FILES) {
      try {
        console.log(`처리 중: ${file.title}`);

        const url = `${API_BASE_URL}/uploads/documents/${file.filename}`;
        const content = await downloadFile(url);

        // slug 생성
        const basename = file.filename.replace(/\.md$/, '').replace(/\d+-/g, '');
        const timestamp = Date.now();
        const slug = `md-${basename}-${timestamp}`
          .replace(/[^a-z0-9가-힣]+/g, '-')
          .replace(/^-+|-+$/g, '');

        // Gutenberg 블록으로 변환
        const blocks = convertMarkdownToBlocks(content);

        // Post 생성
        const postData = {
          title: file.title,
          slug,
          content: JSON.stringify(blocks),
          status: 'draft',
          type: 'post',
          excerpt: `${file.title} 문서`,
          featuredImageId: null
        };

        const createResult = await apiRequest('POST', '/api/posts', postData, token);

        const post = createResult.data?.post || createResult.post || createResult.data;
        console.log(`  ✅ Post 생성 완료: ${post.slug}`);

        createdPosts.push({
          title: post.title || file.title,
          slug: post.slug,
          id: post.id
        });
      } catch (error) {
        console.error(`  ❌ 실패: ${file.title}`, error.message);
      }
    }

    console.log('\n🎉 작업 완료!');
    console.log(`\n✅ 생성된 Post (${createdPosts.length}개):`);
    createdPosts.forEach((post, idx) => {
      console.log(`  ${idx + 1}. ${post.title}`);
      console.log(`     slug: ${post.slug}`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

main();
