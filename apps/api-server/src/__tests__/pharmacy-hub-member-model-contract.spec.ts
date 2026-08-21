/**
 * Pharmacy-Hub 회원 모델 계약 (drift guard)
 *
 * WO-O4O-PHARMACYHUB-PHARMACIST-MEMBER-AND-STORE-OWNER-MODEL-CLOSURE-V1 §7
 * 정본: docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md §4 · §7
 *
 * 지키는 계약 4가지:
 *   ① 공급자는 Pharmacy-Hub 가입 역할이 아니다 (재등장 금지)
 *   ② operator / admin 은 자가 신청 경로가 없다 (사후 부여만)
 *   ③ 일반 약사 회원(member)은 가입 유형이지 capability 가 아니다
 *      → 매장 경영 scope 를 얻지 못한다 (권한 판정은 scope guard spec 이 함께 검증)
 *   ④ 약사 "자격" 과 "역할" 을 재혼합하지 않는다 (자격 role 신설 금지)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PHARMACY_HUB_SIGNUP_ROLES,
  PHARMACY_HUB_SIGNUP_ROLE_LABEL,
  isPharmacyHubSignupRole,
} from '../constants/pharmacy-hub-signup-roles.js';
import { PHARMACY_HUB_SCOPE_CONFIG } from '../middleware/pharmacy-hub-scope.middleware.js';
import { ROLE_REGISTRY } from '../types/roles.js';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf-8');

/** 가입 write-path 는 이 둘뿐이다 (공통 Core + 얇은 래퍼) */
const SIGNUP_WRITE_PATHS = [
  'modules/auth/controllers/auth-register.controller.ts',
  'controllers/pharmacy-hub/PharmacyHubJoinController.ts',
];

describe('Pharmacy-Hub 회원 모델 계약', () => {
  describe('① 자가 가입 역할 SSOT', () => {
    it('가입 유형은 일반 약사 회원 / 약국 경영자 둘뿐이다', () => {
      expect([...PHARMACY_HUB_SIGNUP_ROLES]).toEqual(['member', 'store_owner']);
      expect(PHARMACY_HUB_SIGNUP_ROLE_LABEL.member).toBe('약사 회원');
      expect(PHARMACY_HUB_SIGNUP_ROLE_LABEL.store_owner).toBe('약국 경영자');
    });

    it('supplier 는 가입 역할로 되돌아오지 않는다', () => {
      expect(isPharmacyHubSignupRole('supplier')).toBe(false);
      expect(isPharmacyHubSignupRole('pharmacy-hub:supplier')).toBe(false);
    });

    it('② operator / admin 은 자가 신청 경로가 없다', () => {
      expect(isPharmacyHubSignupRole('operator')).toBe(false);
      expect(isPharmacyHubSignupRole('admin')).toBe(false);
      expect(isPharmacyHubSignupRole('instructor')).toBe(false);
    });

    it('가입 write-path 2곳이 모두 이 SSOT 를 소비한다 (목록 사본 금지)', () => {
      // 한쪽만 막고 다른 쪽을 열어둬 우회 가입이 가능했던 전례가 있다.
      for (const rel of SIGNUP_WRITE_PATHS) {
        expect(read(rel)).toContain('pharmacy-hub-signup-roles.js');
      }
    });
  });

  describe('③ member 는 capability 가 아니다', () => {
    it('scope guard 는 member 를 모른다', () => {
      expect(PHARMACY_HUB_SCOPE_CONFIG.allowedRoles).not.toContain('pharmacy-hub:member');
      expect(PHARMACY_HUB_SCOPE_CONFIG.scopeRoleMapping ?? {}).not.toHaveProperty(
        'pharmacy-hub:member',
      );
    });

    it('매장 경영 capability 를 가진 가입 유형은 store_owner 하나뿐이다', () => {
      const storeScopes = Object.entries(PHARMACY_HUB_SCOPE_CONFIG.scopeRoleMapping ?? {})
        .filter(([scope]) => scope.endsWith(':store_owner'))
        .flatMap(([, roles]) => roles);
      expect(storeScopes).toEqual(['pharmacy-hub:store_owner']);
    });

    it('매장 provisioning 은 store_owner membership 에만 반응한다', () => {
      const src = read('services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts');
      expect(src).toContain('STORE_OWNER_ROLE');
      expect(src).not.toContain("'pharmacy-hub:member'");
    });

    it('역할 카탈로그에 member 가 서비스 역할로 등록돼 있다', () => {
      const meta = ROLE_REGISTRY['pharmacy-hub:member'];
      expect(meta).toBeDefined();
      expect(meta.service).toBe('pharmacy-hub');
      expect(meta.category).toBe('service');
      expect(meta.deprecated).toBe(false);
    });
  });

  describe('④ 자격 ≠ 역할', () => {
    it('약사 자격을 뜻하는 pharmacy-hub 역할을 만들지 않는다', () => {
      // 자격은 profile 축(kpa_pharmacist_profiles)이다 — KPA 선례:
      // 20260326300000-DeactivateQualificationRoles 가 kpa:pharmacist 를 profile 로 대체했다.
      const pharmacyHubRoles = Object.keys(ROLE_REGISTRY).filter((r) =>
        r.startsWith('pharmacy-hub:'),
      );
      expect(pharmacyHubRoles.filter((r) => /pharmacist|license|student/i.test(r))).toEqual([]);
      expect(pharmacyHubRoles.sort()).toEqual([
        'pharmacy-hub:admin',
        'pharmacy-hub:member',
        'pharmacy-hub:operator',
        'pharmacy-hub:store_owner',
      ]);
    });

    it('가입 경로가 약사 자격을 텍스트 값으로 추론하지 않는다', () => {
      const join = read('controllers/pharmacy-hub/PharmacyHubJoinController.ts');
      expect(join).not.toContain('licenseNumber');
      // 자격 profile 을 이 경로에서 만들지 않는다 (주석 언급은 허용 — 쓰기 코드가 없어야 한다).
      expect(join).not.toContain('PharmacistProfile');
      expect(join).not.toMatch(/INSERT\s+INTO\s+kpa_pharmacist_profiles/i);
    });
  });
});
