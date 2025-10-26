/**
 * Upload documentation markdown files and create posts with markdown-reader blocks
 *
 * This script:
 * 1. Finds existing markdown files in media library
 * 2. Deletes old versions
 * 3. Uploads updated markdown files
 * 4. Creates posts with markdown-reader blocks referencing uploaded files
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5174/api/v1';
const DOCS_DIR = '/home/sohae21/o4o-platform/docs/manual';

// Login credentials (use environment variables)
const LOGIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const LOGIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error('⚠️  Warning: Using default credentials. Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
}

// Markdown files to upload (all files in docs/manual/)
const MARKDOWN_FILES = [
  'admin-manual.md',
  'ai-page-generation.md',
  'ai-technical-guide.md',
  'ai-user-guide.md',
  'appearance-customize.md',
  'appearance-menus.md',
  'appearance-template-parts.md',
  'blocks-reference.md',
  'blocks-reference-detailed.md',
  'dropshipping-user-manual.md',
  'editor-usage-manual.md',
  'platform-features.md',
  'seller-manual.md',
  'shortcodes-reference.md',
  'supplier-manual.md',
];

let authToken = null;

/**
 * Login and get auth token
 */
async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    });

    // Check multiple possible response structures
    if (response.data.success) {
      if (response.data.data?.accessToken) {
        authToken = response.data.data.accessToken;
      } else if (response.data.data?.access_token) {
        authToken = response.data.data.access_token;
      } else if (response.data.accessToken) {
        authToken = response.data.accessToken;
      } else if (response.data.token) {
        authToken = response.data.token;
      }

      if (authToken) {
        console.log('✅ Login successful');
        return true;
      }
    }

    console.error('❌ Login failed:', JSON.stringify(response.data, null, 2));
    return false;
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Get axios config with auth header
 */
function getAuthConfig() {
  return {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  };
}

/**
 * Find existing markdown file in media library
 */
async function findMediaFile(filename) {
  try {
    const response = await axios.get(`${API_URL}/media`, getAuthConfig());

    if (response.data.success && response.data.data) {
      const file = response.data.data.find(m => m.filename === filename);
      return file || null;
    }

    return null;
  } catch (error) {
    console.error(`❌ Error finding media file ${filename}:`, error.message);
    return null;
  }
}

/**
 * Delete media file
 */
async function deleteMediaFile(mediaId) {
  try {
    await axios.delete(`${API_URL}/media/${mediaId}`, getAuthConfig());
    console.log(`🗑️  Deleted media file: ${mediaId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting media file ${mediaId}:`, error.message);
    return false;
  }
}

/**
 * Upload markdown file to media library
 */
async function uploadMarkdownFile(filePath) {
  try {
    const filename = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);

    const formData = new FormData();
    formData.append('file', fileContent, {
      filename: filename,
      contentType: 'text/markdown',
    });

    const response = await axios.post(`${API_URL}/media/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (response.data.success && response.data.data) {
      console.log(`✅ Uploaded: ${filename} (ID: ${response.data.data.id})`);
      return response.data.data;
    }

    console.error(`❌ Upload failed for ${filename}:`, response.data);
    return null;
  } catch (error) {
    console.error(`❌ Error uploading ${filePath}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Create post with markdown-reader block
 */
async function createPost(title, markdownUrl, mediaId) {
  try {
    const blocks = [
      {
        id: `block-${Date.now()}-1`,
        type: 'o4o/heading',
        content: {},
        attributes: {
          content: title,
          level: 1,
        },
      },
      {
        id: `block-${Date.now()}-2`,
        type: 'o4o/markdown-reader',
        content: {},
        attributes: {
          url: markdownUrl,
          mediaId: mediaId,
          theme: 'github',
          fontSize: 16,
        },
      },
    ];

    const postData = {
      title: title,
      slug: mediaId.replace('media_', 'doc-'),
      content: JSON.stringify(blocks),
      status: 'publish',
      type: 'post',
    };

    const response = await axios.post(`${API_URL}/posts`, postData, getAuthConfig());

    if (response.data.success && response.data.data) {
      console.log(`✅ Created post: ${title} (ID: ${response.data.data.id})`);
      return response.data.data;
    }

    console.error(`❌ Post creation failed for ${title}:`, response.data);
    return null;
  } catch (error) {
    console.error(`❌ Error creating post for ${title}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Get post title from filename
 */
function getPostTitle(filename) {
  const titles = {
    'blocks-reference.md': '블록 레퍼런스 (AI용)',
    'blocks-reference-detailed.md': '블록 레퍼런스 상세 가이드',
    'supplier-manual.md': '공급자 매뉴얼',
    'seller-manual.md': '판매자 매뉴얼',
    'platform-features.md': 'O4O 플랫폼 기능 소개',
    'admin-manual.md': '관리자 매뉴얼',
    'ai-page-generation.md': 'AI 페이지 생성 가이드',
    'ai-technical-guide.md': 'AI 기술 가이드',
    'ai-user-guide.md': 'AI 사용자 가이드',
    'appearance-customize.md': '외형 커스터마이즈 가이드',
    'appearance-menus.md': '메뉴 관리 가이드',
    'appearance-template-parts.md': '템플릿 파트 가이드',
    'dropshipping-user-manual.md': '드롭쉬핑 사용자 매뉴얼',
    'editor-usage-manual.md': '편집기 사용 매뉴얼',
    'shortcodes-reference.md': '숏코드 레퍼런스',
  };

  return titles[filename] || filename.replace('.md', '').replace(/-/g, ' ');
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting documentation upload and post creation...\n');

  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Cannot proceed without authentication');
    process.exit(1);
  }

  console.log('');

  // Step 2: Process each markdown file
  for (const filename of MARKDOWN_FILES) {
    console.log(`📄 Processing: ${filename}`);

    const filePath = path.join(DOCS_DIR, filename);

    // Check if file exists locally
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      continue;
    }

    // Check if file already exists in media library
    const existingFile = await findMediaFile(filename);
    if (existingFile) {
      console.log(`🔍 Found existing file: ${existingFile.id}`);
      await deleteMediaFile(existingFile.id);
    }

    // Upload file
    const uploadedFile = await uploadMarkdownFile(filePath);
    if (!uploadedFile) {
      console.error(`❌ Skipping post creation for ${filename}`);
      continue;
    }

    // Create post
    const title = getPostTitle(filename);
    const markdownUrl = uploadedFile.url;
    await createPost(title, markdownUrl, uploadedFile.id);

    console.log('');
  }

  console.log('✅ All done!');
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
