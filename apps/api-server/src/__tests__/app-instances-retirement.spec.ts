/**
 * app_instances / AppInstance Retirement Contract
 *
 * WO-O4O-APP-INSTANCES-LIFECYCLE-CENSUS-AND-CANONICAL-DISPOSITION-V1
 *
 * 판정: RETIRE_CONFIRMED
 *   - production row 0 (n_tup_ins 0 · stats_reset 2025-12-25 이후 삽입/삭제 0)
 *   - 물리 제약: PK_app_instances 뿐. inbound FK 0 / outbound FK 0 / trigger 0 / view 0
 *   - runtime read consumer 0 · write consumer 0 (도달 가능한 route 없음)
 *   - `app_instances` 를 노출하던 `routes/apps.ts`(8d58243bf) 와
 *     `controllers/apps.controller.ts`(32273509a) 는 이미 제거된 상태였다
 *   - `businessId` 컬럼은 DB 전체에서 app_instances / app_usage_logs 2곳에만 존재 →
 *     실제 소유권 모델(organizations · service_memberships · stores)과 연결된 적이 없다
 *
 * 본 테스트는 retire 상태의 **재도입 방지**를 고정한다.
 * `app_registry`(정본) 및 `/api/v1/admin/apps` 계약은 본 WO 대상이 아니며 그대로 유지된다.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '..', '..', '..');

describe('app_instances retirement contract', () => {
  it('AppInstance entity 파일이 존재하지 않는다', () => {
    expect(existsSync(join(SRC, 'entities', 'AppInstance.ts'))).toBe(false);
  });

  it('database/entities.ts 에 AppInstance 등록이 없다', () => {
    const entities = readFileSync(join(SRC, 'database', 'entities.ts'), 'utf-8');
    expect(entities).not.toMatch(/from\s+'\.\.\/entities\/AppInstance\.js'/);
    expect(entities).not.toMatch(/^\s*AppInstance,\s*$/m);
  });

  it('app-registry.service 가 app_instances 계약을 노출하지 않는다', () => {
    const svc = readFileSync(join(SRC, 'services', 'app-registry.service.ts'), 'utf-8');
    // 주석의 retire 설명은 허용하고, 실제 코드 심볼만 금지한다.
    const code = svc
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/AppInstance/);
    expect(code).not.toMatch(/instanceRepository/);
    for (const method of ['install(', 'updateConfig(', 'executeAppLogic(']) {
      expect(code).not.toContain(method);
    }
    // `static getInstance()` 는 싱글턴 접근자이므로 명칭 충돌이다 — 금지 대상이 아니다.
    // app_instances 조회용 `getInstance(appSlug, ...)` 시그니처만 금지한다.
    expect(code).not.toMatch(/getInstance\s*\(\s*appSlug/);
    expect(code).toMatch(/static getInstance\(\): AppRegistryService/);
  });

  it('app_registry 정본은 그대로 유지된다 (회귀 가드)', () => {
    expect(existsSync(join(SRC, 'entities', 'AppRegistry.ts'))).toBe(true);
    expect(existsSync(join(SRC, 'routes', 'admin', 'apps.routes.ts'))).toBe(true);
    // WO-O4O-PUBLIC-APPSTORE-READ-CONTRACT-CENSUS-AND-DISPOSITION-V1:
    //   공개 카탈로그 API 2종이 은퇴하며 appstore.routes.ts 도 제거됐다.
    //   app_registry 정본은 admin/apps · app-availability 로 유지된다.
    expect(existsSync(join(SRC, 'routes', 'appstore.routes.ts'))).toBe(false);
    expect(existsSync(join(SRC, 'routes', 'app-availability.routes.ts'))).toBe(true);

    const entities = readFileSync(join(SRC, 'database', 'entities.ts'), 'utf-8');
    expect(entities).toMatch(/AppRegistry/);
  });

  it('부트스트랩 스크립트가 app_instances 테이블을 다시 만들지 않는다', () => {
    const script = readFileSync(
      join(REPO, 'apps', 'api-server', 'scripts', 'run-migration-standalone.mjs'),
      'utf-8'
    );
    expect(script).not.toMatch(/CREATE TABLE IF NOT EXISTS "app_instances"/);
    expect(script).not.toMatch(/CREATE INDEX IF NOT EXISTS "IDX_app_instances_app_business"/);
  });
});
