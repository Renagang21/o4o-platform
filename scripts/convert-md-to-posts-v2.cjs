#!/usr/bin/env node

/**
 * 페이지에서 사용 중인 마크다운 파일들을 post로 변환하는 스크립트
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const API_BASE_URL = 'https://api.neture.co.kr';

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

  // 마크다운 블록으로 전체 마크다운 포함
  blocks.push({
    type: 'o4o/markdown',
    attributes: {
      content: markdown,
      showToc: true
    }
  });

  return blocks;
}

// 페이지 콘텐츠에서 마크다운 파일 URL 추출
function extractMarkdownUrls(pages) {
  const markdownFiles = [];

  for (const page of pages) {
    try {
      const content = JSON.parse(page.content);

      for (const block of content) {
        // o4o/markdown-reader 블록 찾기
        if (block.type === 'o4o/markdown-reader' && block.attributes) {
          const url = block.attributes.url || block.content?.url;
          const fileName = block.attributes.fileName || 'untitled.md';

          if (url) {
            markdownFiles.push({
              url: url.startsWith('http') ? url : `${API_BASE_URL}${url}`,
              fileName: fileName,
              pageTitle: page.title
            });
          }
        }
      }
    } catch (e) {
      // JSON 파싱 실패 시 무시
    }
  }

  return markdownFiles;
}

async function main() {
  try {
    console.log('🔐 로그인 중...');

    // 로그인
    const loginEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const loginPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const loginResult = await apiRequest('POST', '/api/v1/auth/login', {
      email: loginEmail,
      password: loginPassword
    });

    const token = loginResult.token || loginResult.data?.accessToken || loginResult.accessToken;
    if (!token) {
      console.error('로그인 응답:', JSON.stringify(loginResult, null, 2));
      throw new Error('accessToken을 찾을 수 없습니다');
    }
    console.log('✅ 로그인 성공');

    console.log('\n📄 페이지에서 마크다운 파일 찾는 중...');

    // 모든 페이지 가져오기
    const pagesResult = await apiRequest('GET', '/api/pages?limit=1000', null, token);
    const pages = pagesResult.data || [];

    console.log(`전체 페이지: ${pages.length}개`);

    // 페이지에서 마크다운 파일 URL 추출
    const markdownFiles = extractMarkdownUrls(pages);

    console.log(`📄 ${markdownFiles.length}개의 마크다운 파일 발견`);

    if (markdownFiles.length === 0) {
      console.log('⚠️  마크다운 파일이 없습니다.');
      return;
    }

    // 발견된 파일 목록 출력
    console.log('\n발견된 마크다운 파일:');
    markdownFiles.forEach((file, idx) => {
      console.log(`  ${idx + 1}. ${file.fileName} (페이지: ${file.pageTitle})`);
    });

    console.log('\n📝 Post 생성 중...\n');

    const createdPosts = [];

    for (const file of markdownFiles) {
      try {
        console.log(`처리 중: ${file.fileName}`);

        // 파일 내용 다운로드
        const content = await downloadFile(file.url);

        // 파일명에서 제목과 slug 생성
        const basename = file.fileName.replace(/\.md$/, '');
        const title = basename.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const timestamp = Date.now();
        const slug = `md-${basename.toLowerCase()}-${timestamp}`
          .replace(/[^a-z0-9가-힣]+/g, '-')
          .replace(/^-+|-+$/g, '');

        // Gutenberg 블록으로 변환
        const blocks = convertMarkdownToBlocks(content);

        // Post 생성 (content는 JSON 문자열로 변환)
        const postData = {
          title,
          slug,
          content: JSON.stringify(blocks),
          status: 'draft',
          type: 'post',
          excerpt: `${basename}에서 가져온 내용`,
          featuredImageId: null
        };

        const createResult = await apiRequest('POST', '/api/posts', postData, token);

        console.log('  API 응답:', JSON.stringify(createResult, null, 2));

        const post = createResult.data?.post || createResult.post || createResult.data;
        if (!post) {
          throw new Error('응답에서 post를 찾을 수 없습니다');
        }

        console.log(`  ✅ Post 생성 완료: ${post.slug}`);
        createdPosts.push({
          title: post.title || title,
          slug: post.slug,
          id: post.id
        });
      } catch (error) {
        console.error(`  ❌ 실패: ${file.fileName}`, error.message);
      }
    }

    console.log('\n🎉 작업 완료!');
    console.log(`\n✅ 생성된 Post (${createdPosts.length}개):`);
    createdPosts.forEach((post, idx) => {
      console.log(`  ${idx + 1}. ${post.title} (${post.slug})`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

main();
