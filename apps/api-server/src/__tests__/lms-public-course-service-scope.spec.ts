/**
 * LMS Public Course List — Service Scope Regression Test
 *
 * WO-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1
 * 선행 census: IR-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-V1
 *
 * 닫으려는 결함:
 *   공개 강의 목록 `GET /api/v1/lms/courses` 가 service boundary 없이 전 서비스 강의를
 *   반환했다. `CourseService.listCourses` 에 service 조건이 없어 KPA-Society 강의가
 *   K-Cosmetics / GlycoPharm 화면에 그대로 노출됐다 (production 실측: lms_courses 7건 전량
 *   service_key='kpa-society', public+published+lecture 3건이 타 서비스에 노출).
 *
 * 본 스펙은 GlycoPharm Forum boundary 스펙(glycopharm-forum-service-boundary.spec.ts)과
 * 동일하게 2계층으로 검증한다.
 *   (A) 동작 검증 — resolveLmsServiceScope / isCourseInServiceScope / listCourses 가 만드는
 *       SQL 조건을 fake QueryBuilder 로 실측한다. DB 불필요.
 *   (B) 정적 회귀 가드 — 서비스 mount 계약(kpa 라우트 컨텍스트), 프런트의 canonical
 *       serviceKey 주입, generic 직접 URL 목록 호출 부재를 소스 텍스트로 고정한다.
 *
 * 새 service-key 매핑은 만들지 않는다. 기존 canonical SSOT(resolveCanonicalServiceKey)를
 * 그대로 재사용하는지도 함께 고정한다.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * CourseService 는 모듈 로드 시점에 TypeORM entity 그래프와 DataSource 를 끌어온다.
 * 여기서 검증하는 것은 QueryBuilder 조건 생성뿐이라 저장소·커넥션은 필요 없다.
 */
jest.mock(
  '@o4o/lms-core',
  () => ({
    Course: class {},
    CourseStatus: { DRAFT: 'draft', PUBLISHED: 'published', ARCHIVED: 'archived' },
    ContentKind: { LECTURE: 'lecture', COURSE_MATERIAL: 'course_material' },
    CourseVisibility: { PUBLIC: 'public', MEMBERS: 'members' },
    CourseReusablePolicy: { RESTRICTED: 'restricted', PLATFORM: 'platform' },
  }),
  { virtual: true },
);
jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    getRepository: () => ({}),
    query: jest.fn(async () => []),
  },
}));

import {
  resolveLmsServiceScope,
  isCourseInServiceScope,
  lmsContextMiddleware,
  InvalidLmsServiceKeyError,
  INVALID_SERVICE_KEY_CODE,
} from '../modules/lms/utils/lms-service-scope.js';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');

// ─────────────────────────────────────────────────────────────────────────────
// (A-1) scope 해석 — route context 우선, 그 다음 명시 serviceKey
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveLmsServiceScope — 우선순위 계약', () => {
  it('service prefix 라우트 컨텍스트가 최우선이며 canonical 로 변환된다', () => {
    const req: any = { lmsContext: { serviceCode: 'kpa' }, query: { serviceKey: 'glycopharm' } };
    // 라우트 컨텍스트가 있으면 client 가 보낸 serviceKey 는 무시된다 (스푸핑 차단)
    expect(resolveLmsServiceScope(req)).toBe('kpa-society');
  });

  it('컨텍스트가 없으면 명시 serviceKey 를 canonical 로 해석한다', () => {
    expect(resolveLmsServiceScope({ query: { serviceKey: 'glycopharm' } } as any)).toBe('glycopharm');
    expect(resolveLmsServiceScope({ query: { serviceKey: 'k-cosmetics' } } as any)).toBe('k-cosmetics');
    // role prefix 별칭도 canonical SSOT 를 통해 동일 결과가 된다
    expect(resolveLmsServiceScope({ query: { serviceKey: 'cosmetics' } } as any)).toBe('k-cosmetics');
    expect(resolveLmsServiceScope({ query: { serviceKey: 'kpa' } } as any)).toBe('kpa-society');
  });

  it('컨텍스트도 serviceKey 도 없으면 무경계(undefined) — legacy/admin 호환', () => {
    expect(resolveLmsServiceScope({ query: {} } as any)).toBeUndefined();
    expect(resolveLmsServiceScope({} as any)).toBeUndefined();
    expect(resolveLmsServiceScope({ query: { serviceKey: '   ' } } as any)).toBeUndefined();
  });

  it('알 수 없는 serviceKey 는 무경계 통과가 아니라 오류다', () => {
    expect(() => resolveLmsServiceScope({ query: { serviceKey: 'no-such-service' } } as any))
      .toThrow(InvalidLmsServiceKeyError);
    expect(INVALID_SERVICE_KEY_CODE).toBe('INVALID_SERVICE_KEY');
  });

  it('lmsContextMiddleware 는 req.lmsContext 를 주입하고 next 를 호출한다', () => {
    const req: any = {};
    const next = jest.fn();
    lmsContextMiddleware({ serviceCode: 'kpa' })(req, {} as any, next);
    expect(req.lmsContext).toEqual({ serviceCode: 'kpa' });
    expect(next).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (A-2) 단건(detail / lessons) 경계 판정
// ─────────────────────────────────────────────────────────────────────────────

describe('isCourseInServiceScope — 단건 경계', () => {
  it('scope 가 없으면 항상 통과(현행 무경계 유지)', () => {
    expect(isCourseInServiceScope('kpa-society', undefined)).toBe(true);
    expect(isCourseInServiceScope(null, undefined)).toBe(true);
  });

  it('타 서비스 강의는 차단된다', () => {
    expect(isCourseInServiceScope('kpa-society', 'glycopharm')).toBe(false);
    expect(isCourseInServiceScope('kpa-society', 'k-cosmetics')).toBe(false);
    expect(isCourseInServiceScope('glycopharm', 'kpa-society')).toBe(false);
  });

  it('같은 서비스 강의는 통과한다', () => {
    expect(isCourseInServiceScope('glycopharm', 'glycopharm')).toBe(true);
  });

  it('legacy null serviceKey 는 KPA-Society 로 간주된다 (기존 fallback 과 동일)', () => {
    expect(isCourseInServiceScope(null, 'kpa-society')).toBe(true);
    expect(isCourseInServiceScope(undefined, 'kpa-society')).toBe(true);
    expect(isCourseInServiceScope(null, 'glycopharm')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (A-3) listCourses 가 실제로 SQL 경계를 건다 (client-side filtering 금지 확인)
// ─────────────────────────────────────────────────────────────────────────────

interface CapturedWhere {
  condition: string;
  params?: Record<string, unknown>;
}

function createFakeQueryBuilder(captured: CapturedWhere[]) {
  const qb: any = {
    andWhere: (condition: string, params?: Record<string, unknown>) => {
      captured.push({ condition, params });
      return qb;
    },
    orderBy: () => qb,
    skip: () => qb,
    take: () => qb,
    leftJoinAndSelect: () => qb,
    getManyAndCount: async () => [[], 0],
  };
  return qb;
}

async function runListCourses(filters: Record<string, unknown>): Promise<CapturedWhere[]> {
  const { CourseService } = await import('../modules/lms/services/CourseService.js');
  const captured: CapturedWhere[] = [];
  const service: any = CourseService.getInstance();
  service.courseRepository = { createQueryBuilder: () => createFakeQueryBuilder(captured) };
  await service.listCourses(filters);
  return captured;
}

const serviceConds = (captured: CapturedWhere[]) =>
  captured.filter((c) => c.condition.includes('course.serviceKey'));

describe('CourseService.listCourses — service boundary SQL', () => {
  it('serviceKey 미전달 시 service 조건을 걸지 않는다 (generic/admin 현행 유지)', async () => {
    expect(serviceConds(await runListCourses({}))).toHaveLength(0);
  });

  it('타 서비스 scope 는 정확 일치 조건 1개를 건다', async () => {
    const conds = serviceConds(await runListCourses({ serviceKey: 'glycopharm' }));
    expect(conds).toHaveLength(1);
    expect(conds[0].condition).toBe('course.serviceKey = :svcKey');
    expect(conds[0].params).toEqual({ svcKey: 'glycopharm' });
    // parameter binding 필수 — string interpolation 금지 (Boundary Policy Guard Rule 2)
    expect(conds[0].condition).not.toContain('glycopharm');
  });

  it('KPA scope 는 legacy null 을 함께 포함한다', async () => {
    const conds = serviceConds(await runListCourses({ serviceKey: 'kpa-society' }));
    expect(conds).toHaveLength(1);
    expect(conds[0].condition).toBe('(course.serviceKey = :svcKey OR course.serviceKey IS NULL)');
    expect(conds[0].params).toEqual({ svcKey: 'kpa-society' });
  });

  it('기존 status / search 필터는 scope 와 함께 보존된다', async () => {
    const captured = await runListCourses({
      serviceKey: 'k-cosmetics',
      status: 'published',
      search: '건강',
    });
    expect(serviceConds(captured)).toHaveLength(1);
    expect(captured.some((c) => c.condition.includes('course.status'))).toBe(true);
    expect(captured.some((c) => c.condition.includes('ILIKE :search'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (B) 정적 회귀 가드
// ─────────────────────────────────────────────────────────────────────────────

describe('정적 회귀 가드 — mount 계약 / 프런트 소비', () => {
  it('KPA LMS remount 는 라우트 컨텍스트를 유지한다', () => {
    const src = read('apps/api-server/src/routes/kpa/kpa.routes.ts');
    expect(src).toMatch(/lmsRouter\.use\(\s*lmsContextMiddleware\(\{\s*serviceCode:\s*'kpa'\s*\}\)\s*\)/);
  });

  it('controller 는 client 가 보낸 raw serviceKey 를 그대로 신뢰하지 않는다', () => {
    const src = read('apps/api-server/src/modules/lms/controllers/CourseController.ts');
    // filters.serviceKey 는 반드시 resolveLmsServiceScope 결과로 덮어써진다
    expect(src).toContain('filters.serviceKey = resolveLmsServiceScope(req)');
    expect(src).toContain('isCourseInServiceScope');
  });

  it('lessons 목록도 동일 경계를 적용한다', () => {
    const src = read('apps/api-server/src/modules/lms/controllers/LessonController.ts');
    expect(src).toContain('isCourseInServiceScope');
  });

  it('service-key 매핑은 canonical SSOT 를 재사용한다 (LMS 전용 매핑 신설 금지)', () => {
    const src = read('apps/api-server/src/modules/lms/utils/lms-service-scope.ts');
    expect(src).toContain("from '@o4o/security-core'");
    expect(src).toContain('resolveCanonicalServiceKey');
    // 자체 매핑 테이블을 만들지 않았는지 고정
    expect(src).not.toMatch(/kpa'\s*:\s*'kpa-society'/);
  });

  it('generic route 를 쓰는 서비스 프런트는 canonical serviceKey 를 주입한다', () => {
    expect(read('services/web-glycopharm/src/api/lms.ts'))
      .toMatch(/createLmsLearnerClient\(lmsHttp,\s*\{\s*serviceKey:\s*'glycopharm'\s*\}\)/);
    expect(read('services/web-k-cosmetics/src/api/lms.ts'))
      .toMatch(/createLmsLearnerClient\(lmsHttp,\s*\{\s*serviceKey:\s*'k-cosmetics'\s*\}\)/);
  });

  it('KPA 프런트는 서비스 prefix 라우트로 경계를 얻는다 (serviceKey 주입 불필요)', () => {
    const src = read('services/web-kpa-society/src/api/lms.ts');
    expect(src).toContain('createLmsLearnerClient(lmsHttp)');
    expect(src).toContain('/api/v1/kpa');
  });

  it('서비스 화면이 generic 목록 URL 을 직접 호출하지 않는다', () => {
    // WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
    //   기존 대상 `LmsCoursesPage.tsx` 는 route 에서 이미 분리된 dead code(import 0)라 삭제했다.
    //   `/operator/lms` 가 실제로 렌더하는 화면은 공통 `OperatorLmsCoursesManager` 를 쓰는
    //   `OperatorLmsCoursesPage.tsx` 이므로 가드 대상을 실렌더 경로로 옮긴다 (가드 의미 동일).
    const pages = [
      'services/web-glycopharm/src/pages/operator/OperatorLmsCoursesPage.tsx',
    ];
    for (const rel of pages) {
      const src = read(rel);
      expect(src).not.toMatch(/api\.get[^\n]*`\/lms\/courses\?/);
    }
  });
});
