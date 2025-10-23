const { AppDataSource } = require('../apps/api-server/dist/database/connection');
const { MediaFile } = require('../apps/api-server/dist/entities/MediaFile');
const { Post } = require('../apps/api-server/dist/entities/Post');
const { User } = require('../apps/api-server/dist/entities/User');
const { In } = require('typeorm');

const MEDIA_FILES = [
  { filename: 'intro-overview.md', title: 'O4O 플랫폼 소개 (드랍쉬핑 실체 중심)', slug: 'o4o-platform-intro-overview', mediaFileId: '1761104916-hk5xxpirs.md' },
  { filename: 'partner-overview.md', title: 'O4O 파트너 협력 개요', slug: 'o4o-platform-partner-overview', mediaFileId: '1761108522-9adf0e29.md' },
  { filename: 'dropshipping-user-manual.md', title: '드랍쉬핑 플랫폼 사용자 매뉴얼', slug: 'manual-dropshipping-user', mediaFileId: '1761132706029-anp0dhfly.md' },
  { filename: 'admin-manual.md', title: '관리자 대시보드 매뉴얼', slug: 'manual-admin-dashboard', mediaFileId: '1761131811781-8ocibdxy0.md' },
  { filename: 'editor-usage-manual.md', title: 'O4O 편집기 사용 매뉴얼', slug: 'manual-editor-usage', mediaFileId: '1761132123499-tqd4v3ih2.md' },
  { filename: 'appearance-template-parts.md', title: '외모 → 템플릿 파트 매뉴얼', slug: 'manual-appearance-template-parts', mediaFileId: '1759968997274-uvehjtc0b.md' },
  { filename: 'appearance-menus.md', title: '외모 → 메뉴 매뉴얼', slug: 'manual-appearance-menus', mediaFileId: '1759968997243-n6cs0jnj1.md' },
  { filename: 'appearance-customize.md', title: '외모 → 커스터마이즈 매뉴얼', slug: 'manual-appearance-customize', mediaFileId: '1759968997211-79q3vkw46.md' },
  { filename: 'blocks-reference.md', title: '블록 레퍼런스 (요약판)', slug: 'editor-blocks-reference', mediaFileId: '1761132105615-yzx3myzk8.md' },
  { filename: 'blocks-reference-detailed.md', title: '블록 상세 레퍼런스', slug: 'editor-blocks-reference-detailed', mediaFileId: '1761132087680-oaqi79v8t.md' },
  { filename: 'shortcodes-reference.md', title: 'Shortcode 레퍼런스', slug: 'editor-shortcodes-reference', mediaFileId: '1761132646610-5yjsunhwi.md' },
  { filename: 'ai-user-guide.md', title: 'AI 사용자 가이드', slug: 'ai-user-guide', mediaFileId: '1761132065588-ikhg4eopm.md' },
  { filename: 'ai-technical-guide.md', title: 'AI 기술 가이드', slug: 'ai-technical-guide', mediaFileId: '1761131979611-30zyxloen.md' },
  { filename: 'ai-page-generation.md', title: 'AI 페이지 생성 가이드', slug: 'ai-page-generation', mediaFileId: '1761131926978-ucg4alq8e.md' },
  { filename: 'README.md', title: '매뉴얼 문서 목차', slug: 'system-readme', mediaFileId: '1761131744055-g5422jtpt.md' },
];

const DUPLICATE_FILES_TO_DELETE = [
  '1759968997180-01q8tkyac.md',  // ai-page-generation.md (10월 9일)
  '1759968968859-bcya20v3b.md',  // ai-page-generation.md (10월 9일)
];

async function deleteDuplicateMedia() {
  console.log('\n=== Step 1: Deleting duplicate media files ===\n');

  const mediaRepo = AppDataSource.getRepository(MediaFile.MediaFile);

  for (const filename of DUPLICATE_FILES_TO_DELETE) {
    const media = await mediaRepo.findOne({
      where: { filename }
    });

    if (media) {
      await mediaRepo.remove(media);
      console.log(`✓ Deleted: ${filename} (ID: ${media.id})`);
    } else {
      console.log(`⚠ Not found: ${filename}`);
    }
  }
}

async function createMarkdownPosts() {
  console.log('\n=== Step 2: Creating posts from markdown files ===\n');

  const postRepo = AppDataSource.getRepository(Post.Post);
  const mediaRepo = AppDataSource.getRepository(MediaFile.MediaFile);
  const userRepo = AppDataSource.getRepository(User.User);

  // Get admin user (or first user)
  const adminUser = await userRepo.findOne({
    where: { email: 'sylee000125@gmail.com' }
  });

  if (!adminUser) {
    throw new Error('Admin user not found. Please create a user first.');
  }

  console.log(`Using author: ${adminUser.email} (${adminUser.id})\n`);

  const createdPosts = [];
  const errors = [];

  for (const fileData of MEDIA_FILES) {
    try {
      // Find the media file
      const mediaFile = await mediaRepo.findOne({
        where: { filename: fileData.mediaFileId }
      });

      if (!mediaFile) {
        errors.push({
          file: fileData.filename,
          error: `Media file not found: ${fileData.mediaFileId}`
        });
        continue;
      }

      // Check if post with this slug already exists
      const existingPost = await postRepo.findOne({
        where: { slug: fileData.slug }
      });

      if (existingPost) {
        console.log(`⚠ Post already exists with slug: ${fileData.slug}`);
        continue;
      }

      // Create block content
      const blockContent = JSON.stringify([
        {
          type: 'o4o/markdown-reader',
          attributes: {
            url: mediaFile.url,
            theme: 'github'
          }
        }
      ]);

      // Create post
      const post = postRepo.create({
        title: fileData.title,
        slug: fileData.slug,
        content: blockContent,
        excerpt: `${fileData.title} 문서를 확인하세요.`,
        status: 'publish',
        type: 'post',
        author_id: adminUser.id,
        comment_status: 'closed',
        ping_status: 'closed',
        sticky: false,
        published_at: new Date(),
        featured_media: mediaFile.id
      });

      const savedPost = await postRepo.save(post);
      createdPosts.push({
        title: fileData.title,
        slug: fileData.slug,
        id: savedPost.id
      });

      console.log(`✓ Created: ${fileData.title}`);
      console.log(`  - Slug: ${fileData.slug}`);
      console.log(`  - Media: ${mediaFile.url}`);
      console.log(`  - Post ID: ${savedPost.id}\n`);

    } catch (error) {
      errors.push({
        file: fileData.filename,
        error: error.message
      });
      console.error(`✗ Error creating post for ${fileData.filename}:`, error.message);
    }
  }

  return { createdPosts, errors };
}

async function main() {
  console.log('=== Media & Post Management Script ===');
  console.log('Starting at:', new Date().toISOString());

  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✓ Database connected\n');

    // Step 1: Delete duplicate media files
    await deleteDuplicateMedia();

    // Step 2: Create posts
    const { createdPosts, errors } = await createMarkdownPosts();

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Total posts created: ${createdPosts.length}`);
    console.log(`Total errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(err => {
        console.log(`  - ${err.file}: ${err.error}`);
      });
    }

    if (createdPosts.length > 0) {
      console.log('\nCreated posts:');
      createdPosts.forEach(post => {
        console.log(`  - ${post.title} (${post.slug})`);
      });
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log('\n✓ Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✓ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { main };
