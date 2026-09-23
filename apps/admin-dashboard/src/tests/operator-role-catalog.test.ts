/**
 * 운영자 등록 화면 계약 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §16·§17·§21
 *
 * 두 가지를 고정한다.
 *  1) 화면 역할 카탈로그 = 서버 allowlist. 어긋나면 "고를 수는 있는데 서버가 거부하는 역할" 이 생긴다.
 *  2) `/operators` 에는 비밀번호 입력·비밀번호 모달·신규 계정 생성 경로가 **하나도 없다**.
 *     운영자는 Google 로 로그인하며, 관리자는 타인의 비밀번호를 만들지도 재설정하지도 않는다.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  ASSIGNABLE_ROLES,
  ASSIGNABLE_ROLE_VALUES,
  REGISTRABLE_SERVICE_KEYS,
  findRoleOption,
} from '@/lib/operator-role-catalog';

const REPO_ROOT = resolve(__dirname, '../../../..');
const SERVER_CATALOG = resolve(REPO_ROOT, 'apps/api-server/src/config/operator-role-catalog.ts');
const OPERATORS_PAGE = resolve(__dirname, '../pages/operators/OperatorsPage.tsx');

/** 서버 파일에서 `ASSIGNABLE_OPERATOR_ROLES` 배열 리터럴을 그대로 읽는다(빌드 의존 없이 비교하기 위함). */
function readServerRoles(): string[] {
  const src = readFileSync(SERVER_CATALOG, 'utf-8');
  const block = src.match(/ASSIGNABLE_OPERATOR_ROLES[^=]*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/);
  expect(block, '서버 카탈로그에서 ASSIGNABLE_OPERATOR_ROLES 배열을 찾지 못했습니다.').toBeTruthy();
  return [...block![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe('운영자 역할 카탈로그 — 서버 allowlist 와 일치', () => {
  it('화면 카탈로그와 서버 allowlist 가 같은 집합·같은 순서다', () => {
    expect(ASSIGNABLE_ROLE_VALUES).toEqual(readServerRoles());
  });

  it('platform:* 은 부여 대상이 아니다 (platform:super_admin 신규 부여 기능 없음)', () => {
    expect(ASSIGNABLE_ROLE_VALUES.some((r) => r.startsWith('platform:'))).toBe(false);
    expect(REGISTRABLE_SERVICE_KEYS).not.toContain('platform');
    expect(findRoleOption('platform:super_admin')).toBeUndefined();
  });

  it('모든 역할은 자신이 속한 서비스 prefix 를 갖는다', () => {
    for (const [serviceKey, options] of Object.entries(ASSIGNABLE_ROLES)) {
      for (const opt of options) {
        expect(opt.value.split(':')[0]).toBe(serviceKey);
      }
    }
  });

  it('역할 값에 중복이 없다', () => {
    expect(new Set(ASSIGNABLE_ROLE_VALUES).size).toBe(ASSIGNABLE_ROLE_VALUES.length);
  });
});

describe('/operators — 비밀번호 표면 0 (§17)', () => {
  const src = readFileSync(OPERATORS_PAGE, 'utf-8');
  /** 주석은 제외하고 실제 코드만 본다(제거 사실을 설명하는 주석까지 금지하지는 않는다). */
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');

  it('비밀번호 입력 필드가 없다', () => {
    expect(code).not.toMatch(/type=["']password["']/);
  });

  it('비밀번호 관련 상태·정책·모달이 남아 있지 않다', () => {
    expect(code).not.toMatch(/password/i);
    expect(code).not.toMatch(/password-policy/);
  });

  it('신규 계정 생성(POST /admin/users) 경로가 없다', () => {
    expect(code).not.toMatch(/post\(\s*['"`]\/admin\/users['"`]/);
  });

  it('두 경로(직접 지정 · 초대) 만 사용한다', () => {
    expect(code).toMatch(/\/admin\/operator-assignments['"`]/);
    expect(code).toMatch(/\/admin\/operator-invitations['"`]/);
    // 지정 대상은 email 이 아니라 userId 다 (§5 — email ≠ Identity Key).
    expect(code).toMatch(/userId:\s*selectedCandidate!\.userId/);
  });
});
