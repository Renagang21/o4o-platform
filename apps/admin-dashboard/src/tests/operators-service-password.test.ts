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

    it('신규 생성 경로의 password 는 유지한다 (P2 미변경)', () => {
      expect(SRC).toMatch(/password: formData\.password/);
      expect(SRC).toMatch(/Password is required for new operator/);
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
      // 서비스 선택 select 가 없어야 한다 — 행이 곧 대상이다.
      expect(SRC).not.toMatch(/서비스를 선택하세요/);
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
