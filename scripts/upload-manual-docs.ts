#!/usr/bin/env tsx

/**
 * docs/manual 디렉토리의 모든 매뉴얼 문서를 미디어 라이브러리에 업로드하는 스크립트
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = process.env.VITE_API_URL || 'https://api.neture.co.kr/api';
const MANUAL_DIR = path.join(__dirname, '../docs/manual');

// 업로드할 문서 파일 목록
const DOCS_TO_UPLOAD = [
  'README.md',
  'admin-manual.md',
  'ai-page-generation.md',
  'ai-technical-guide.md',
  'ai-user-guide.md',
  'appearance-customize.md',
  'appearance-menus.md',
  'appearance-template-parts.md',
  'blocks-reference-detailed.md',
  'blocks-reference.md',
  'editor-usage-manual.md'
];

interface UploadResponse {
  success: boolean;
  data: {
    id: string;
    filename: string;
    originalName: string;
    url: string;
    size: number;
    mimeType: string;
  };
  message?: string;
}

async function getAuthToken(): Promise<string> {
  // 관리자 계정으로 로그인하여 토큰 획득
  try {
    const response = await axios.post(`${API_BASE_URL}/v1/auth/login`, {
      email: 'admin@neture.co.kr',
      password: 'admin12341234'
    });

    if (response.data.success && response.data.data.accessToken) {
      return response.data.data.accessToken;
    }
    throw new Error('Failed to get access token');
  } catch (error: any) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }
}

async function uploadFile(filePath: string, token: string): Promise<void> {
  const fileName = path.basename(filePath);
  const fullPath = path.join(MANUAL_DIR, fileName);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${fileName}`);
    return;
  }

  try {
    const formData = new FormData();
    const fileStream = fs.createReadStream(fullPath);
    formData.append('file', fileStream, fileName);

    const response = await axios.post<UploadResponse>(
      `${API_BASE_URL}/content/media/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    if (response.data.success) {
      console.log(`✅ Uploaded: ${fileName}`);
      console.log(`   - File ID: ${response.data.data.id}`);
      console.log(`   - URL: ${response.data.data.url}`);
      console.log(`   - Size: ${(response.data.data.size / 1024).toFixed(2)} KB`);
    } else {
      console.log(`❌ Failed to upload: ${fileName}`);
      console.log(`   - Error: ${response.data.message}`);
    }
  } catch (error: any) {
    console.error(`❌ Error uploading ${fileName}:`, error.message);
    if (error.response) {
      console.error(`   - Status: ${error.response.status}`);
      console.error(`   - Data:`, error.response.data);
    }
  }
}

async function main() {
  console.log('📤 Starting manual documents upload...\n');

  try {
    // 1. 로그인하여 토큰 획득
    console.log('🔐 Logging in...');
    const token = await getAuthToken();
    console.log('✅ Login successful\n');

    // 2. 각 문서 파일 업로드
    console.log(`📁 Uploading ${DOCS_TO_UPLOAD.length} documents...\n`);

    for (const doc of DOCS_TO_UPLOAD) {
      await uploadFile(doc, token);
      // API 레이트 리밋 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n✅ Upload completed!');
  } catch (error: any) {
    console.error('\n❌ Upload process failed:', error.message);
    process.exit(1);
  }
}

main();
