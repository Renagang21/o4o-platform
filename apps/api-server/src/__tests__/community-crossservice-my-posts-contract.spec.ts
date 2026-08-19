/**
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §10·§12·§14
 *
 * "내가 쓴 글"(My Posts) 은 5서비스(KPA-Society / K-Cosmetics / GlycoPharm /
 * PharmacyHub / Neture) 공통 query contract 로 수렴한다.
 *
 *   인증(uid) + route 의 canonical service scope + `author=me` → 본인 글만
 *
 * 서비스별로 다른 endpoint·query 이름을 만들지 않는다. 서비스 경계는 기존
 * forumContextMiddleware → applyServiceScope 계약이 그대로 담당한다.
 */

import fs from 'fs';
import path from 'path';

const POST_CONTROLLER = fs.readFileSync(
  path.resolve(__dirname, '../controllers/forum/ForumPostController.ts'),
  'utf8',
);

const SERVICE_FORUM_MOUNTS = [
  { service: 'kpa-society', file: '../routes/kpa/kpa.routes.ts' },
  { service: 'k-cosmetics', file: '../routes/cosmetics/cosmetics.routes.ts' },
  { service: 'glycopharm', file: '../routes/glycopharm/glycopharm.routes.ts' },
  { service: 'neture', file: '../routes/neture/neture.routes.ts' },
  { service: 'pharmacy-hub', file: '../routes/pharmacy-hub/pharmacy-hub.routes.ts' },
];

describe('cross-service My Posts — 공통 query contract', () => {
  it('author=me 단일 query 로 본인 글 목록을 판정한다', () => {
    expect(POST_CONTROLLER).toContain("req.query.author as string) === 'me'");
  });

  it('미인증 author=me 요청은 401 AUTH_REQUIRED 로 막는다(빈 목록 위장 금지)', () => {
    const guard = POST_CONTROLLER.slice(
      POST_CONTROLLER.indexOf('if (myPostsOnly && !uid)'),
      POST_CONTROLLER.indexOf('const queryBuilder'),
    );
    expect(guard).toContain('res.status(401)');
    expect(guard).toContain('AUTH_REQUIRED');
    expect(guard).toContain('return;');
  });

  it('author=me 는 status 조건과 무관하게 항상 authorId 필터를 건다', () => {
    expect(POST_CONTROLLER).toContain(
      "queryBuilder.andWhere('post.authorId = :myAuthorId', { myAuthorId: uid })",
    );
  });

  it('본인 목록에서는 draft/pending 등 비공개 상태도 본인에게 보인다', () => {
    const branch = POST_CONTROLLER.slice(
      POST_CONTROLLER.indexOf('} else if (myPostsOnly) {'),
      POST_CONTROLLER.indexOf('// Forum filter'),
    );
    expect(branch).toContain("post.authorId = :myAuthorId");
    // 기본(비 My Posts) 경로는 여전히 PUBLISHED 만 노출한다
    expect(branch).toContain('PostStatus.PUBLISHED');
  });

  it('서비스별 전용 my-posts endpoint 를 새로 만들지 않는다', () => {
    expect(POST_CONTROLLER).not.toMatch(/myPosts\s*\(/);
    for (const mount of SERVICE_FORUM_MOUNTS) {
      const src = fs.readFileSync(path.resolve(__dirname, mount.file), 'utf8');
      expect(src).not.toContain('my-posts');
    }
  });

  it('5서비스 forum mount 는 모두 서비스 컨텍스트를 거쳐 동일 controller 를 소비한다', () => {
    for (const mount of SERVICE_FORUM_MOUNTS) {
      const src = fs.readFileSync(path.resolve(__dirname, mount.file), 'utf8');
      // 직접 forumContextMiddleware 를 쓰거나 공통 createServiceForumRouter 를 경유한다.
      expect(
        src.includes('forumContextMiddleware') || src.includes('createServiceForumRouter'),
      ).toBe(true);
    }
  });
});
