/**
 * WO-O4O-CROSS-SERVICE-STORE-ORPHAN-SLUG-INTEGRITY-CLEANUP-V1 §6
 *
 * `platform_store_slugs.store_id` 의 canonical 축은 **organizations.id** 다.
 *
 * 근거:
 *   - 공개 조회 `resolvePublicStore()` (routes/platform/store-public/store-public-utils.ts)
 *     가 slug → `record.storeId` → `organizations` 로 해석한다.
 *   - 조직 삭제 시 slug 잔재 정리(OrganizationService.deleteOrganization)가
 *     `store_id = <organization id>` 로 매칭한다.
 *
 * 축이 다른 id(서비스 전용 매장 테이블 PK 등)를 넣으면
 * 공개 조회는 영구 404 이고, 조직이 삭제돼도 slug 가 남아 orphan 이 된다.
 * (cosmetics 가 `cosmetics.cosmetics_stores.id` 를 넣고 있었고, 프로덕션에
 *  orphan slug `k-1` 이 남아 있었다.)
 *
 * DB·네트워크가 없는 정적 census 다. 호출부가 조용히 늘거나 축이 어긋나면 깨진다.
 */

import fs from 'fs';
import path from 'path';

const API_SERVER_SRC = path.resolve(__dirname, '..');

/**
 * reserveSlug 호출부(파일 상대경로) → 허용되는 storeId 인자 표현식
 *
 * WO-O4O-KCOS-GP-MISSING-STORE-SLUG-CANONICALIZATION-V1 §5
 *   승인 경로에서 slug 예약이 아예 빠져 있던 2곳을 보강했다
 *   (cosmetics `linkOwnerToStore`, glycopharm `approveMember`).
 *   두 보강 모두 organization id 축을 그대로 따른다.
 *
 * WO-O4O-STORE-SLUG-RESERVESLUG-CENSUS-DRIFT-CLOSURE-V1
 *   WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1 이 Cafe24 매장 provisioning 에
 *   9번째 호출부를 추가했다. `ensureOrganizationWithOwnerAndService` 가 돌려준
 *   organizations.id 를 그대로 쓰므로 축은 canonical 이다 (PharmacyHub 와 동형).
 */
const EXPECTED: Record<string, string[]> = {
  'routes/cosmetics/services/cosmetics-store.service.ts': ['orgId', 'organizationId'],
  'routes/glycopharm/services/glycopharm-member.service.ts': ['organizationId'],
  'routes/glycopharm/controllers/admin.controller.ts': ['createdOrg.id'],
  'routes/glycopharm/controllers/store-applications.controller.ts': ['createdOrg.id'],
  'routes/glycopharm/services/glycopharm.service.ts': ['org.id'],
  'routes/kpa/controllers/organization.controller.ts': ['saved.id'],
  'routes/kpa/services/kpa-store-organization.provisioning.ts': ['orgResult.id'],
  'services/cafe24-b2b/Cafe24B2bStoreProvisioningService.ts': ['organizationId'],
  'services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts': ['organizationId'],
  // WO-O4O-POST-RETIREMENT-MAIN-BASELINE-HOUSEKEEPING-V1:
  //   Cafe24 B2B 매장 회원 로그인 파일럿(WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1)이
  //   9번째 호출부를 추가하면서 이 census 등재를 빠뜨려 guard 가 red 였다.
  //   축 자체는 정상 — `storeId: organizationId` 로 organization id 축을 그대로 따른다.
  //   (파일럿 코드를 고친 게 아니라 census 를 실제 호출부 집합에 맞춘 것이다.)
  'services/cafe24-b2b/Cafe24B2bStoreProvisioningService.ts': ['organizationId'],
};

/** 축이 어긋난 것으로 확인된 표현식은 어떤 호출부에서도 다시 나타나면 안 된다. */
const FORBIDDEN_STORE_ID = [
  '(savedStore as any).id',
  'savedStore.id',
  'store.id',
];

function collect(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__') continue;
      collect(full, out);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

/** reserveSlug({ ... }) 블록에서 storeId 인자 표현식을 뽑는다. */
function findReserveSlugStoreIds(src: string): string[] {
  const found: string[] = [];
  const re = /reserveSlug\(\{([\s\S]{0,400}?)\}\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const arg = m[1].match(/storeId\s*:\s*([^,\n]+)/);
    if (arg) found.push(arg[1].trim());
  }
  return found;
}

describe('§6 platform_store_slugs.store_id 축 census', () => {
  const files = collect(API_SERVER_SRC);

  const actual: Record<string, string[]> = {};
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf-8');
    if (!src.includes('reserveSlug({')) continue;
    const rel = path.relative(API_SERVER_SRC, file).split(path.sep).join('/');
    const ids = findReserveSlugStoreIds(src);
    if (ids.length > 0) actual[rel] = ids;
  }

  it('reserveSlug 호출부 집합이 문서화된 9곳뿐이다', () => {
    expect(Object.keys(actual).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('모든 호출부가 organization id 축으로 slug 를 예약한다', () => {
    for (const [rel, expected] of Object.entries(EXPECTED)) {
      for (const id of actual[rel] ?? []) {
        expect(`${rel}::${id}::${expected.includes(id)}`).toBe(`${rel}::${id}::true`);
      }
    }
  });

  it('서비스 전용 매장 테이블 PK 를 store_id 로 쓰지 않는다', () => {
    for (const [rel, ids] of Object.entries(actual)) {
      for (const id of ids) {
        expect(`${rel}::${FORBIDDEN_STORE_ID.includes(id)}`).toBe(`${rel}::false`);
      }
    }
  });

  /**
   * WO-O4O-KCOS-GP-MISSING-STORE-SLUG-CANONICALIZATION-V1 §5
   *
   * 프로덕션에서 slug 없는 정상 조직 4곳이 생긴 실제 원인은 축 오류가 아니라
   * **승인 경로에 slug 예약 단계 자체가 없었던 것**이다.
   *   - KCos `linkOwnerToStore`  : org member + enrollment 만 보강
   *   - GP   `approveMember`     : organization + owner + enrollment 만 생성
   * 두 경로가 다시 slug 없이 조직을 확정하지 않도록 고정한다.
   */
  it('KCos 기존 매장 연결 경로가 slug 를 보강한다', () => {
    const src = fs.readFileSync(
      path.join(API_SERVER_SRC, 'routes/cosmetics/services/cosmetics-store.service.ts'),
      'utf-8',
    );
    expect(src).toMatch(/linkOwnerToStore[\s\S]{0,1200}ensureCosmeticsStoreSlug\(/);
  });

  it('GP 약국경영자 승인 경로가 두 분기 모두 slug 를 보강한다', () => {
    const src = fs.readFileSync(
      path.join(API_SERVER_SRC, 'routes/glycopharm/services/glycopharm-member.service.ts'),
      'utf-8',
    );
    const calls = src.match(/this\.ensureGlycopharmStoreSlug\(/g) ?? [];
    expect(calls.length).toBe(2);
  });

  it('공개 조회는 slug.storeId 를 organizations 로 해석한다 (축의 근거)', () => {
    const src = fs.readFileSync(
      path.join(API_SERVER_SRC, 'routes/platform/store-public/store-public-utils.ts'),
      'utf-8',
    );
    expect(src).toMatch(/orgRepo[\s\S]{0,200}record\.storeId/);
  });
});
