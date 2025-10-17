#!/usr/bin/env node

/**
 * 미디어 라이브러리의 마크다운 파일들을 post로 변환하는 스크립트
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
function convertMarkdownToBlocks(markdown, filename) {
  const blocks = [];

  // 마크다운 리더 블록으로 전체 마크다운 포함
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

    // 로그인 (환경변수에서 credentials 읽기 또는 하드코딩)
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

    console.log('\n📁 미디어 라이브러리에서 마크다운 파일 검색 중...');

    // 전체 미디어 가져오기
    const mediaResult = await apiRequest('GET', '/api/media?limit=1000', null, token);

    const mediaList = mediaResult.data?.items || mediaResult.data?.media || mediaResult.media || [];
    console.log(`전체 미디어: ${mediaList.length}개`);

    const markdownFiles = mediaList.filter(m =>
      m.filename?.endsWith('.md') || m.mimeType === 'text/markdown' || m.mimeType === 'text/plain'
    );

    console.log('마크다운 후보:', markdownFiles.map(f => ({ filename: f.filename, mimeType: f.mimeType })));

    console.log(`📄 ${markdownFiles.length}개의 마크다운 파일 발견`);

    if (markdownFiles.length === 0) {
      console.log('⚠️  마크다운 파일이 없습니다.');
      return;
    }

    console.log('\n📝 Post 생성 중...\n');

    for (const file of markdownFiles) {
      try {
        console.log(`처리 중: ${file.originalFilename}`);

        // 파일 내용 다운로드
        const content = await downloadFile(file.url);

        // 파일명에서 제목과 slug 생성
        const basename = file.originalFilename.replace(/\.md$/, '');
        const title = basename;
        const slug = basename.toLowerCase()
          .replace(/[^a-z0-9가-힣]+/g, '-')
          .replace(/^-+|-+$/g, '');

        // Gutenberg 블록으로 변환
        const blocks = convertMarkdownToBlocks(content, file.originalFilename);

        // Post 생성
        const postData = {
          title,
          slug,
          content: blocks,
          status: 'draft',
          type: 'post',
          excerpt: `${basename}에서 가져온 내용`,
          featuredImageId: null
        };

        const createResult = await apiRequest('POST', '/api/posts', postData, token);

        console.log(`  ✅ Post 생성 완료: ${createResult.data.post.slug}`);
      } catch (error) {
        console.error(`  ❌ 실패: ${file.originalFilename}`, error.message);
      }
    }

    console.log('\n🎉 모든 작업 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

main();
