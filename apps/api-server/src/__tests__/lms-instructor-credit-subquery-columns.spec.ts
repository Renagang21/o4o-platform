/**
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1 §15
 *
 * production smoke 결함: 강사 `수강자 관리` 화면에서
 * `GET /lms/instructor/participants/:courseId/summary` 가 500
 * (`column ct2.source_type does not exist`).
 *
 * 이 DataSource 는 SnakeNamingStrategy 를 사용하지 않으므로
 * `credit_transactions` / `lms_enrollments` 의 물리 컬럼은 camelCase 다.
 * raw 서브쿼리가 snake_case 식별자로 회귀하지 않도록 소스에 고정한다.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const CONTROLLER = join(
  __dirname,
  '../modules/lms/controllers/InstructorController.ts',
);

describe('LMS instructor credit subquery — physical column identifiers', () => {
  const source = readFileSync(CONTROLLER, 'utf8');

  it('공용 서브쿼리 상수를 정의한다', () => {
    expect(source).toContain('const CREDITED_COURSE_COMPLETE_EXISTS');
  });

  it('credit_transactions 컬럼을 camelCase 로 인용한다', () => {
    expect(source).toContain('ct2."sourceType"');
    expect(source).toContain('ct2."sourceId"');
    expect(source).toContain('ct2."userId"');
  });

  it('lms_enrollments 의 userId 도 camelCase 로 인용한다', () => {
    expect(source).toContain('e."userId"');
  });

  it('snake_case 식별자가 남아 있지 않다', () => {
    expect(source).not.toContain('ct2.source_type');
    expect(source).not.toContain('ct2.source_id');
    expect(source).not.toContain('ct2.user_id');
    expect(source).not.toContain('e.user_id');
  });

  it('5개 호출부가 모두 공용 상수를 쓴다', () => {
    const uses = source.match(/\$\{CREDITED_COURSE_COMPLETE_EXISTS\}/g) ?? [];
    expect(uses.length).toBe(5);
  });
});
