-- Media & Post Management Script
-- Step 1: Delete duplicate media files
-- Step 2: Create posts from markdown files

\echo '=== Step 1: Deleting duplicate media files ==='
\echo ''

-- Delete duplicate ai-page-generation files (keeping the latest one)
DELETE FROM media WHERE filename IN (
  '1759968997180-01q8tkyac.md',
  '1759968968859-bcya20v3b.md'
);

\echo '✓ Duplicate files deleted'
\echo ''
\echo '=== Step 2: Creating posts from markdown files ==='
\echo ''

-- Get the admin user ID
DO $$
DECLARE
  v_admin_id UUID;
  v_media_id UUID;
  v_media_url TEXT;
  v_post_id UUID;
  v_block_content TEXT;
BEGIN
  -- Get admin user
  SELECT id INTO v_admin_id FROM users WHERE email = 'admin@neture.co.kr' LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;

  -- Create posts for each media file
  -- 1. intro-overview.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1761104916-hk5xxpirs.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'o4o-platform-intro-overview') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), 'O4O 플랫폼 소개 (드랍쉬핑 실체 중심)', 'o4o-platform-intro-overview', v_block_content, 'O4O 플랫폼 소개 (드랍쉬핑 실체 중심) 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: O4O 플랫폼 소개';
  END IF;

  -- 2. partner-overview.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1761108522-9adf0e29.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'o4o-platform-partner-overview') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), 'O4O 파트너 협력 개요', 'o4o-platform-partner-overview', v_block_content, 'O4O 파트너 협력 개요 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: O4O 파트너 협력 개요';
  END IF;

  -- 3. dropshipping-user-manual.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1761132706029-anp0dhfly.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'manual-dropshipping-user') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), '드랍쉬핑 플랫폼 사용자 매뉴얼', 'manual-dropshipping-user', v_block_content, '드랍쉬핑 플랫폼 사용자 매뉴얼 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: 드랍쉬핑 플랫폼 사용자 매뉴얼';
  END IF;

  -- 4. admin-manual.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1761131811781-8ocibdxy0.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'manual-admin-dashboard') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), '관리자 대시보드 매뉴얼', 'manual-admin-dashboard', v_block_content, '관리자 대시보드 매뉴얼 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: 관리자 대시보드 매뉴얼';
  END IF;

  -- 5. editor-usage-manual.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1761132123499-tqd4v3ih2.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'manual-editor-usage') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), 'O4O 편집기 사용 매뉴얼', 'manual-editor-usage', v_block_content, 'O4O 편집기 사용 매뉴얼 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: O4O 편집기 사용 매뉴얼';
  END IF;

  -- 6. appearance-template-parts.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1759968997274-uvehjtc0b.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'manual-appearance-template-parts') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), '외모 → 템플릿 파트 매뉴얼', 'manual-appearance-template-parts', v_block_content, '외모 → 템플릿 파트 매뉴얼 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: 외모 → 템플릿 파트 매뉴얼';
  END IF;

  -- 7. appearance-menus.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1759968997243-n6cs0jnj1.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'manual-appearance-menus') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), '외모 → 메뉴 매뉴얼', 'manual-appearance-menus', v_block_content, '외모 → 메뉴 매뉴얼 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: 외모 → 메뉴 매뉴얼';
  END IF;

  -- 8. appearance-customize.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1759968997211-79q3vkw46.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'manual-appearance-customize') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), '외모 → 커스터마이즈 매뉴얼', 'manual-appearance-customize', v_block_content, '외모 → 커스터마이즈 매뉴얼 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: 외모 → 커스터마이즈 매뉴얼';
  END IF;

  -- 9. blocks-reference.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1761132105615-yzx3myzk8.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'editor-blocks-reference') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), '블록 레퍼런스 (요약판)', 'editor-blocks-reference', v_block_content, '블록 레퍼런스 (요약판) 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: 블록 레퍼런스 (요약판)';
  END IF;

  -- 10. blocks-reference-detailed.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1761132087680-oaqi79v8t.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'editor-blocks-reference-detailed') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), '블록 상세 레퍼런스', 'editor-blocks-reference-detailed', v_block_content, '블록 상세 레퍼런스 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: 블록 상세 레퍼런스';
  END IF;

  -- 11. shortcodes-reference.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1761132646610-5yjsunhwi.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'editor-shortcodes-reference') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), 'Shortcode 레퍼런스', 'editor-shortcodes-reference', v_block_content, 'Shortcode 레퍼런스 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: Shortcode 레퍼런스';
  END IF;

  -- 12. ai-user-guide.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1761132065588-ikhg4eopm.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'ai-user-guide') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), 'AI 사용자 가이드', 'ai-user-guide', v_block_content, 'AI 사용자 가이드 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: AI 사용자 가이드';
  END IF;

  -- 13. ai-technical-guide.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1761131979611-30zyxloen.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'ai-technical-guide') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), 'AI 기술 가이드', 'ai-technical-guide', v_block_content, 'AI 기술 가이드 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: AI 기술 가이드';
  END IF;

  -- 14. ai-page-generation.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1761131926978-ucg4alq8e.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'ai-page-generation') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), 'AI 페이지 생성 가이드', 'ai-page-generation', v_block_content, 'AI 페이지 생성 가이드 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: AI 페이지 생성 가이드';
  END IF;

  -- 15. README.md
  SELECT id, url INTO v_media_id, v_media_url FROM media WHERE filename = '1761131744055-g5422jtpt.md';
  IF v_media_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'system-readme') THEN
    v_block_content := '[{"type":"o4o/markdown-reader","attributes":{"url":"' || v_media_url || '","theme":"github"}}]';
    INSERT INTO posts (id, title, slug, content, excerpt, status, type, author_id, comment_status, ping_status, sticky, published_at, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), '매뉴얼 문서 목차', 'system-readme', v_block_content, '매뉴얼 문서 목차 문서를 확인하세요.', 'publish', 'post', v_admin_id, 'closed', 'closed', false, NOW(), NOW(), NOW());
    RAISE NOTICE '✓ Created: 매뉴얼 문서 목차';
  END IF;

END $$;

\echo ''
\echo '=== Summary ==='

-- Count created posts
SELECT COUNT(*) AS total_posts_created FROM posts
WHERE slug IN (
  'o4o-platform-intro-overview',
  'o4o-platform-partner-overview',
  'manual-dropshipping-user',
  'manual-admin-dashboard',
  'manual-editor-usage',
  'manual-appearance-template-parts',
  'manual-appearance-menus',
  'manual-appearance-customize',
  'editor-blocks-reference',
  'editor-blocks-reference-detailed',
  'editor-shortcodes-reference',
  'ai-user-guide',
  'ai-technical-guide',
  'ai-page-generation',
  'system-readme'
);

\echo '✓ Script completed successfully'
