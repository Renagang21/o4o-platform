/**
 * WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C
 *
 * 서비스 컨텍스트(forumContextMiddleware) 에서 forum 이 확정되지 않은 글 작성은
 * forum_id = NULL 로 저장되어 그 서비스에서 다시 조회·수정·삭제할 수 없다.
 * (applyServiceScope / isForumInServiceScope 가 NULL forum_id 를 scope 밖으로 판정)
 *
 * 조용한 유실을 fail-closed(400 FORUM_REQUIRED) 로 막는 계약을 고정한다.
 */

import fs from 'fs';
import path from 'path';

const POST_CONTROLLER = fs.readFileSync(
  path.resolve(__dirname, '../controllers/forum/ForumPostController.ts'),
  'utf8',
);

const CONTROLLER_BASE = fs.readFileSync(
  path.resolve(__dirname, '../controllers/forum/ForumControllerBase.ts'),
  'utf8',
);

describe('community forum write — orphan(forum_id NULL) 방지 계약', () => {
  it('서비스 컨텍스트에서 forum 미확정 create 는 400 FORUM_REQUIRED 로 막는다', () => {
    expect(POST_CONTROLLER).toContain('FORUM_REQUIRED');
    const guard = POST_CONTROLLER.slice(
      POST_CONTROLLER.indexOf('if (canonicalServiceKey && !resolvedForumId)'),
      POST_CONTROLLER.indexOf('FORUM_SERVICE_SCOPE_DENIED'),
    );
    expect(guard).toContain('res.status(400)');
    expect(guard).toContain('return;');
  });

  it('guard 는 forum scope 검사(403)보다 먼저 실행된다', () => {
    expect(POST_CONTROLLER.indexOf('FORUM_REQUIRED')).toBeLessThan(
      POST_CONTROLLER.indexOf('FORUM_SERVICE_SCOPE_DENIED'),
    );
  });

  it('Neture 의 categorySlug 도 forumSlug 와 같은 축으로 해석한다', () => {
    expect(POST_CONTROLLER).toContain('categorySlug');
    expect(POST_CONTROLLER).toContain('requestedForumSlug');
  });

  it('scope 판정이 forum_id NULL 을 서비스 밖으로 본다는 전제를 고정한다', () => {
    expect(CONTROLLER_BASE).toContain('if (!forumId) return false;');
  });
});
