/**
 * WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §H
 *
 * 소스 계약 — Supplier Identity / Business Profile canonicalization.
 *
 *   §A·§B  authorization 의 canonical relation 은 organization_members 다 · LIMIT 1 임의 선택 0
 *   §D·§G  Supplier profile 이 users.businessInfo 를 read/write SSOT 로 쓰지 않는다
 *   §F     profile write 가 단일 트랜잭션 · org write 실패를 삼키지 않는다
 *   §9     silent skip / silent success 금지
 *   §C     신규 등록이 canonical owner membership 을 만든다
 *   §10·§11 Regulated Category 불변 · Operator/Admin 경계 불변
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

const RESOLVER = 'apps/api-server/src/modules/neture/middleware/supplier-context.resolver.ts';
const MIDDLEWARE = 'apps/api-server/src/modules/neture/middleware/neture-identity.middleware.ts';
const SUPPLIER_SVC = 'apps/api-server/src/modules/neture/services/supplier.service.ts';
const MGMT_CTL = 'apps/api-server/src/modules/neture/controllers/supplier-management.controller.ts';
const REGCAT_SVC = 'apps/api-server/src/modules/neture/services/supplier-regulated-category.service.ts';
const ADMIN_CTL = 'apps/api-server/src/modules/neture/controllers/admin.controller.ts';
const BIZ_UTIL = 'apps/api-server/src/utils/business-info-write.ts';

/** 코드 본문만 검사 — 주석은 "하지 않는 것" 을 설명하려고 이름을 언급한다 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

describe('§A·§B authorization canonical relation', () => {
  const resolver = stripComments(read(RESOLVER));
  const middleware = stripComments(read(MIDDLEWARE));

  it('canonical 질의가 organization_members → organizations(type=supplier) → neture_suppliers 다', () => {
    expect(resolver).toContain('FROM organization_members om');
    expect(resolver).toContain('JOIN organizations o');
    expect(resolver).toContain('JOIN neture_suppliers s');
    expect(resolver).toContain("o.type = 'supplier'");
    expect(resolver).toContain('om.left_at IS NULL');
  });

  it('supplier 후보 조회에 LIMIT 1 임의 선택이 없다', () => {
    expect(resolver).not.toMatch(/FROM organization_members[\s\S]*?LIMIT\s+1/i);
  });

  it('middleware 가 더 이상 user_id 직접 질의를 하지 않는다 (resolver 경유)', () => {
    expect(middleware).not.toMatch(/FROM neture_suppliers WHERE user_id/);
    expect(middleware).toContain('resolveSupplierForUser');
  });

  it('legacy fallback 은 관측 가능한 경고를 남긴다 (silent fallback 금지)', () => {
    expect(resolver).toContain('LEGACY_SUPPLIER_USER_ID_FALLBACK');
    expect(resolver).toMatch(/logger\.warn/);
  });

  it('canonical 이 legacy 보다 먼저 시도된다 (코드 순서)', () => {
    const iCanonical = resolver.indexOf('listSupplierCandidates(dataSource, userId)');
    const iLegacy = resolver.indexOf('resolveByLegacyUserId(dataSource, userId)');
    expect(iCanonical).toBeGreaterThan(-1);
    expect(iLegacy).toBeGreaterThan(iCanonical);
  });

  it('기존 응답 계약 코드가 유지된다', () => {
    for (const code of ['UNAUTHORIZED', 'NO_SUPPLIER', 'SUPPLIER_NOT_ACTIVE', 'currentStatus']) {
      expect(middleware).toContain(code);
    }
  });

  it('multi-context 계약이 있다 (409 + 403)', () => {
    expect(middleware).toContain('SUPPLIER_CONTEXT_REQUIRED');
    expect(middleware).toContain('SUPPLIER_CONTEXT_FORBIDDEN');
    expect(middleware).toContain('candidates');
  });

  it('context 전달은 기존 선례(x-organization-id / organizationId)를 재사용한다', () => {
    expect(resolver).toContain("'x-organization-id'");
    expect(resolver).toContain('organizationId');
  });
});

describe('§D·§G users.businessInfo Supplier runtime 은퇴', () => {
  const svc = stripComments(read(SUPPLIER_SVC));

  it('supplier.service 가 businessInfo write 헬퍼를 더 이상 쓰지 않는다', () => {
    expect(svc).not.toContain('buildBusinessInfoUpdateStatement');
  });

  it('profile update 경로에 businessInfo UPDATE 가 없다', () => {
    expect(svc).not.toMatch(/UPDATE\s+users[\s\S]{0,80}businessInfo/i);
  });

  it('공유 util 파일은 삭제하지 않았다 (타 서비스 소비처 존재)', () => {
    expect(() => read(BIZ_UTIL)).not.toThrow();
  });
});

describe('§9 silent skip / silent success 금지', () => {
  const svc = stripComments(read(SUPPLIER_SVC));

  it('저장 위치가 없는 필드는 명시적 오류로 거부한다', () => {
    expect(svc).toContain('SupplierProfileFieldUnsupportedError');
    expect(svc).toMatch(/throw new SupplierProfileFieldUnsupportedError/);
  });

  it('controller 가 그 오류를 400 으로 노출한다 (조용히 성공 아님)', () => {
    const ctl = stripComments(read(MGMT_CTL));
    expect(ctl).toContain('SUPPLIER_PROFILE_FIELD_UNSUPPORTED');
    expect(ctl).toContain('SupplierProfileFieldUnsupportedError');
  });

  it('org business write 가 실패를 삼키지 않는다 (catch→warn 제거)', () => {
    expect(svc).not.toMatch(/Org business write failed/);
  });

  it('canonical owner membership 생성 실패가 관측된다', () => {
    expect(svc).toContain('CANONICAL_OWNER_MEMBERSHIP_FAILED');
    expect(svc).toContain('CANONICAL_OWNER_MEMBERSHIP_SKIPPED');
  });
});

describe('§F profile write atomicity', () => {
  const svc = stripComments(read(SUPPLIER_SVC));

  it('organizations + neture_suppliers write 가 단일 트랜잭션 안에 있다', () => {
    expect(svc).toMatch(/AppDataSource\.transaction\(async \(manager\)/);
    // 트랜잭션 시작 → org write → supplier save 가 같은 블록 안에서 이 순서로 일어난다
    const iTx = svc.indexOf('AppDataSource.transaction(async (manager)');
    const iSave = svc.indexOf('manager.getRepository(NetureSupplier).save(supplier)');
    expect(iTx).toBeGreaterThan(-1);
    expect(iSave).toBeGreaterThan(iTx);
    expect(svc.slice(iTx, iSave)).toContain('writeOrgBusinessData');
  });

  it('writeOrgBusinessData 가 manager 를 받아 같은 TX 에서 실행된다', () => {
    expect(svc).toContain('manager?: EntityManager');
    expect(svc).toContain('const runner = manager ?? AppDataSource');
  });
});

describe('§C 신규 등록의 canonical 관계', () => {
  const svc = stripComments(read(SUPPLIER_SVC));

  it('등록 시 organization owner membership 을 만든다', () => {
    expect(svc).toContain('organizationOpsService.setOwner');
  });
});

describe('§10·§11 불변 영역', () => {
  it('Regulated Category 는 제품 등록 gate 에 연결되지 않는다', () => {
    const reg = stripComments(read(REGCAT_SVC));
    for (const forbidden of ['ProductMaster', 'offer_service_approvals', 'promoteWithin', 'product_masters']) {
      expect(reg).not.toContain(forbidden);
    }
  });

  it('Admin 의 정지/재활성 guard 가 유지된다', () => {
    const admin = read(ADMIN_CTL);
    expect(admin).toMatch(/suppliers\/:id\/deactivate/);
    expect(admin).toMatch(/suppliers\/:id\/reactivate/);
    expect(admin).toContain("requireNetureScope('neture:admin')");
  });
});
