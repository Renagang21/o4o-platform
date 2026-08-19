/**
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §5·§12·§14
 *
 * PharmacyHub Community baseline 의 서비스 경계 계약을 고정한다.
 *  - Latest Activity 는 forum·course 두 축만 집계한다(미구현 Content·Resources 를 가짜로 넣지 않는다).
 *  - 두 축 모두 canonical serviceKey('pharmacy-hub') 로 격리한다.
 *  - 조회 실패를 빈 목록으로 위장하지 않는다.
 */

import fs from 'fs';
import path from 'path';

const PH_ROUTES = fs.readFileSync(
  path.resolve(__dirname, '../routes/pharmacy-hub/pharmacy-hub.routes.ts'),
  'utf8',
);

const LATEST = PH_ROUTES.slice(
  PH_ROUTES.indexOf("homeRouter.get("),
  PH_ROUTES.indexOf("router.use('/home', homeRouter)"),
);

describe('PharmacyHub Community baseline — /home/latest 서비스 경계', () => {
  it('forum 집계는 forum_category_requests.service_code 로 격리한다', () => {
    expect(LATEST).toContain('f.service_code = $1');
  });

  it('course 집계는 lms_courses.service_key 로 격리한다', () => {
    expect(LATEST).toContain('c.service_key = $1');
  });

  it('closed forum 글은 공개 최신 활동에 넣지 않는다', () => {
    expect(LATEST).toContain("f.forum_type != 'closed'");
  });

  it('미구현 Content·Resources 축을 가짜로 포함하지 않는다', () => {
    expect(LATEST).not.toContain("'resource'");
    expect(LATEST).not.toContain('custom_posts');
  });

  it('lms_courses 는 quoted camelCase 컬럼으로 조회한다(snake_case 오조회 재발 방지)', () => {
    expect(LATEST).toContain('c."instructorId"');
    expect(LATEST).toContain('c."createdAt"');
    expect(LATEST).not.toContain('c.instructor_id');
    expect(LATEST).not.toContain('c.created_at');
  });

  it('조회 실패를 빈 목록으로 위장하지 않는다(allSettled 로 삼키지 않는다)', () => {
    expect(LATEST).toContain('await Promise.all(tasks)');
    expect(LATEST).not.toContain('Promise.allSettled');
  });
});
