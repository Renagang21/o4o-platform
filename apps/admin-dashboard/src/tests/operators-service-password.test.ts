/**
 * WO-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1
 *
 * OperatorsPage 의 비밀번호 계약을 소스 기준으로 고정한다.
 *
 * 이 저장소의 admin-dashboard 테스트는 대부분 DOM 렌더 없이 **소스·계약 검증** 방식이다
 * (admin-menu-route-backend-alignment 등 기존 테스트와 동일 패턴).
 * 여기서도 같은 방식으로 "무엇을 호출하고 무엇을 보내지 않는가" 를 고정한다.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../pages/operators/OperatorsPage.tsx'),
  'utf-8',
);

describe('OperatorsPage — 비밀번호 write 계약', () => {
  describe('일반 정보 편집', () => {
    it('PUT /admin/users/:id 에 password 를 싣지 않는다', () => {
      // 편집 제출부에 password 를 payload 에 넣는 코드가 없어야 한다.
      expect(SRC).not.toMatch(/data\.password\s*=/);
    });

    it('편집 모드에서는 비밀번호 입력 필드를 렌더하지 않는다', () => {
      // 생성 전용 분기(!editingUserId) 안에서만 password input 을 그린다.
      expect(SRC).toMatch(/\{!editingUserId \? \(/);
      expect(SRC).toMatch(/비밀번호는 여기서 변경하지 않습니다/);
    });

    // WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1:
    //   등록 payload 가 조건부로 바뀌었다(기존 사용자 경로에서는 비밀번호를 보내지 않는다).
    //   계약의 본질 — "등록 경로는 여전히 입력 비밀번호를 서버로 보낸다" — 은 그대로 고정한다.
    it('신규 등록 경로는 입력 비밀번호를 서버로 보낸다', () => {
      expect(SRC).toMatch(/payload\.password = formData\.password/);
      expect(SRC).toMatch(/신규 등록에는 최초 서비스 비밀번호가 필요합니다/);
    });
  });

  // WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1
  describe('서비스 운영자 등록 계약', () => {
    it('Pharmacy-Hub 운영자를 등록 카탈로그에서 선택할 수 있다', () => {
      expect(SRC).toMatch(/'pharmacy-hub:operator'/);
    });

    it('platform:super_admin 은 등록 카탈로그에 없다', () => {
      const catalog = SRC.slice(
        SRC.indexOf('const ASSIGNABLE_ROLES'),
        SRC.indexOf('CATALOG_ROLE_VALUES'),
      );
      expect(catalog).not.toMatch(/platform:super_admin/);
    });

    it('대상 서비스를 하나만 보낸다 (roles = [targetRole] + canonical serviceKey)', () => {
      expect(SRC).toMatch(/roles: \[targetRole\]/);
      expect(SRC).toMatch(/const canonicalServiceKey = resolveCanonicalServiceKey\(targetServiceKey\)/);
      expect(SRC).toMatch(/serviceKey: canonicalServiceKey/);
    });

    it('신규 사용자와 기존 사용자 권한 추가를 구분한다', () => {
      expect(SRC).toMatch(/registerMode/);
      expect(SRC).toMatch(/const isNewUser = registerMode === 'new'/);
      // 기존 사용자 경로에서는 비밀번호가 있을 때만 보낸다(없는 credential 초기화 전용).
      expect(SRC).toMatch(/if \(formData\.password\) payload\.password = formData\.password/);
    });

    it('기존 credential 유지 응답을 관리자에게 그대로 알린다', () => {
      expect(SRC).toMatch(/KEEP_EXISTING_CREDENTIAL/);
      expect(SRC).toMatch(/기존 비밀번호는 그대로 유지됩니다/);
    });

    // WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1 (재정비):
    //   화면에 KPA 가 고정 표시되고 다른 서비스를 고를 수 없던 결함의 회귀 방지.
    it('다섯 서비스가 모두 등록 카탈로그에 있다', () => {
      const catalog = SRC.slice(
        SRC.indexOf('const ASSIGNABLE_ROLES'),
        SRC.indexOf('CATALOG_ROLE_VALUES'),
      );
      for (const key of ['kpa', 'neture', 'pharmacy-hub', 'glycopharm', 'cosmetics']) {
        expect(catalog).toMatch(new RegExp(`${key}:`));
      }
    });

    // WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1:
    //   Pharmacy-Hub 에 admin 이 생겼다. 이전 계약("operator 만")을 대체한다.
    it('Pharmacy-Hub 는 Admin·Operator 두 역할을 제공한다', () => {
      const catalog = SRC.slice(
        SRC.indexOf('const ASSIGNABLE_ROLES'),
        SRC.indexOf('CATALOG_ROLE_VALUES'),
      );
      const phBlock = catalog.slice(catalog.indexOf("'pharmacy-hub': ["));
      const roles = phBlock.slice(0, phBlock.indexOf('],'));
      expect(roles).toMatch(/'pharmacy-hub:admin'/);
      expect(roles).toMatch(/'pharmacy-hub:operator'/);
      // 사업자 신분 역할은 이 화면(서비스 운영자 등록)의 대상이 아니다.
      expect(roles).not.toMatch(/pharmacy-hub:store_owner|pharmacy-hub:supplier/);
    });

    it('대상 서비스에 기본값(KPA 고정)을 두지 않는다', () => {
      expect(SRC).toMatch(/const \[targetServiceKey, setTargetServiceKey\] = useState<string>\(''\)/);
      expect(SRC).toMatch(/const \[targetRole, setTargetRole\] = useState<string>\(''\)/);
      // 모달을 열 때도 첫 서비스를 자동 확정하지 않는다.
      expect(SRC).toMatch(/setTargetServiceKey\(''\)/);
      expect(SRC).toMatch(/setTargetRole\(''\)/);
    });

    it('서비스를 바꾸면 역할 선택을 초기화한다 (자동 확정 없음)', () => {
      const fn = SRC.slice(SRC.indexOf('const changeTargetService'), SRC.indexOf('const openEditModal'));
      expect(fn).toMatch(/setTargetServiceKey\(svc\)/);
      expect(fn).toMatch(/setTargetRole\(''\)/);
      expect(fn).not.toMatch(/ASSIGNABLE_ROLES\[svc\]\[0\]/);
    });

    it('서비스·역할 미선택이면 제출을 차단한다', () => {
      expect(SRC).toMatch(/errors\.targetService = '대상 서비스를 선택하세요\.'/);
      expect(SRC).toMatch(/errors\.roles = '역할을 선택하세요\.'/);
      // 요청 생성 자체를 막는 가드
      expect(SRC).toMatch(/if \(!targetServiceKey \|\| !targetRole\) \{/);
      // 제출 버튼 비활성화
      expect(SRC).toMatch(/disabled=\{submitting \|\| \(!editingUserId && \(!targetServiceKey \|\| !targetRole\)\)\}/);
    });

    it('역할 목록은 선택한 서비스의 역할만 렌더한다', () => {
      expect(SRC).toMatch(/ASSIGNABLE_ROLES\[targetServiceKey\]\.map/);
      expect(SRC).toMatch(/먼저 대상 서비스를 선택하세요/);
    });

    it('서비스 선택 목록은 canonical serviceKey 를 SSOT 에서 표시한다', () => {
      expect(SRC).toMatch(/REGISTRABLE_SERVICE_KEYS\.map/);
      expect(SRC).toMatch(/resolveCanonicalServiceKey\(key\)/);
    });

    it('편집 화면은 카탈로그 밖 역할을 읽기 전용으로 보존한다', () => {
      expect(SRC).toMatch(/CATALOG_ROLE_VALUES\.has\(r\)/);
      expect(SRC).toMatch(/이 화면에서 변경하지 않는 권한/);
    });
  });

  describe('서비스 비밀번호 변경', () => {
    it('B6 계약(PUT /operator/members/:userId + serviceKey)을 사용한다', () => {
      expect(SRC).toMatch(/\/operator\/members\/\$\{pwTarget\.userId\}/);
      expect(SRC).toMatch(/password: pwValue,\s*\n\s*serviceKey,/);
    });

    it('role prefix 를 그대로 보내지 않고 canonical 로 변환한다', () => {
      expect(SRC).toMatch(/import \{ resolveCanonicalServiceKey \} from '@o4o\/security-core'/);
      expect(SRC).toMatch(/const serviceKey = resolveCanonicalServiceKey\(pwTarget\.service\.key\)/);
      // 로컬 중복 매핑 상수를 만들지 않았다.
      expect(SRC).not.toMatch(/kpa-society'\s*:\s*'kpa'|'kpa'\s*:\s*'kpa-society'/);
    });

    it('대상 서비스는 클릭한 행 하나로 고정된다 (선택 UI 없음)', () => {
      // 비밀번호 변경 모달 안에는 서비스 선택 UI 가 없어야 한다 — 행이 곧 대상이다.
      // (등록 모달은 별개다. 등록에서는 대상 서비스를 명시적으로 골라야 한다.)
      const pwModal = SRC.slice(SRC.indexOf('{pwTarget && ('), SRC.indexOf('{showModal && ('));
      expect(pwModal.length).toBeGreaterThan(0);
      expect(pwModal).not.toMatch(/서비스를 선택하세요|name="target-service"/);
      expect(SRC).toMatch(/setPwTarget\(row\)/);
    });

    it('platform 행에는 액션을 제공하지 않는다', () => {
      expect(SRC).toMatch(/row\.service\.key === 'platform'\s*\n?\s*\?\s*\[\]/);
    });

    it('모달에 서비스명과 canonical serviceKey 를 함께 표시한다', () => {
      expect(SRC).toMatch(/대상 서비스/);
      expect(SRC).toMatch(/resolveCanonicalServiceKey\(pwTarget\.service\.key\)/);
      expect(SRC).toMatch(/이 서비스의 로그인 비밀번호만 변경됩니다/);
    });

    it('성공 표시는 요청 성공 이후에만 한다', () => {
      const submitBody = SRC.slice(
        SRC.indexOf('const submitServicePassword'),
        SRC.indexOf('setPwSubmitting(false)'),
      );
      const awaitIdx = submitBody.indexOf('await authClient.api.put');
      const toastIdx = submitBody.indexOf('toast.success');
      expect(awaitIdx).toBeGreaterThan(-1);
      expect(toastIdx).toBeGreaterThan(awaitIdx);
    });

    it('플랫폼 계정 비밀번호 API 를 호출하지 않는다', () => {
      expect(SRC).not.toMatch(/platform-accounts\/[^)]*\/password/);
    });
  });

  describe('사일런트 무효 안내 제거', () => {
    it('더 이상 unaffectedServiceKeys 경고에 의존하지 않는다', () => {
      // 조작 자체가 유효해졌으므로 "안 바뀐 서비스" 안내가 필요 없다.
      expect(SRC).not.toMatch(/unaffectedServiceKeys/);
    });
  });
});
