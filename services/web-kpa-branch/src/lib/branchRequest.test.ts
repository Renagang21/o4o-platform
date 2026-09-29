/**
 * 분회 개설 신청 — 화면 판정 · API 경로 · 예약어 목록 정합
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

const calls: Array<{ method: string; url: string; body?: unknown }> = [];
vi.mock('./apiClient', () => {
  const record = (method: string) => async (url: string, body?: unknown) => {
    calls.push({ method, url, body });
    return { data: { success: true, data: { requests: [], outcome: 'created', branch: { id: 'b', name: 'B', slug: 'b' } } } };
  };
  return { api: { get: record('get'), post: record('post'), patch: record('patch'), delete: record('delete') } };
});

import {
  RESERVED_BRANCH_SLUGS,
  approveResultMessage,
  normalizeSlugInput,
  slugProblem,
} from './branchRequest';
import {
  approveBranchRequest,
  listBranchRequests,
  listMyBranchRequests,
  rejectBranchRequest,
  submitBranchRequest,
} from './api/serviceAdmin';
import { ROLES, satisfiesRole } from '../config/service';

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8');

describe('신청 전 주소 안내', () => {
  it.each(RESERVED_BRANCH_SLUGS.map((s) => [s]))('예약어 %s 는 신청 전에 막는다', (slug) => {
    expect(slugProblem(slug)).toMatch(/예약되어/);
  });

  it('대소문자·공백을 정리한 뒤 판정한다', () => {
    expect(normalizeSlugInput('  Service-Admin ')).toBe('service-admin');
    expect(slugProblem('  ME ')).toMatch(/예약되어/);
  });

  it('예약어를 포함할 뿐인 주소는 허용한다', () => {
    expect(slugProblem('me-seoul')).toBeNull();
    expect(slugProblem('login-branch')).toBeNull();
    expect(slugProblem('seoul-gangnam')).toBeNull();
  });

  it('형식 위반은 형식 안내를 준다', () => {
    expect(slugProblem('')).toMatch(/입력/);
    expect(slugProblem('a')).toMatch(/2~80자/);
    expect(slugProblem('seoul_gangnam')).toMatch(/영문 소문자/);
    expect(slugProblem('-seoul')).toMatch(/영문 소문자/);
  });
});

describe('예약어 목록 정합 — backend 정책 · App.tsx 고정 route', () => {
  it('backend branch-slug-policy.ts 와 같은 목록이다', () => {
    const src = read('../../../../apps/api-server/src/services/kpa-branch/branch-slug-policy.ts');
    const body = src.match(/RESERVED_BRANCH_SLUGS(?::[^=]+)?=\s*Object\.freeze\(\[([\s\S]*?)\]\)/);
    expect(body).not.toBeNull();
    const backend = [...body![1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    expect([...RESERVED_BRANCH_SLUGS].sort()).toEqual(backend);
  });

  it('App.tsx 의 고정 첫 segment route 는 모두 예약어다', () => {
    const app = read('../App.tsx');
    const fixed = [...app.matchAll(/<Route\s+path="\/([a-z0-9-]+)(?:\/\*)?"/g)].map((m) => m[1]);
    expect(fixed.length).toBeGreaterThan(0);
    for (const seg of fixed) expect(RESERVED_BRANCH_SLUGS).toContain(seg);
  });
});

describe('승인 결과 안내 — 주소 충돌은 개설하지 않고 재신청 요청', () => {
  it('개설 → 첫 운영자 안내', () => {
    expect(approveResultMessage({ outcome: 'created', branch: { id: 'b', name: '강남분회', slug: 'gangnam' } })).toMatch(
      /첫 분회 운영자/,
    );
  });
  it.each([
    ['taken', /이미 사용 중/],
    ['reserved', /예약어/],
  ] as const)('slug_conflict(%s) → 개설 안 함 · 재신청 요청', (reason, re) => {
    const msg = approveResultMessage({ outcome: 'slug_conflict', slug: 'me', reason });
    expect(msg).toMatch(re);
    expect(msg).toMatch(/개설하지 않았습니다/);
    expect(msg).toMatch(/재신청/);
  });
});

describe('심사 API 는 서비스 관리자 경로, 신청 API 는 인증 경로로 나간다', () => {
  it('경로', async () => {
    calls.length = 0;
    await listBranchRequests();
    await approveBranchRequest('r/1');
    await rejectBranchRequest('r1', '사유');
    await submitBranchRequest({ name: 'A', slug: 'alpha' });
    await listMyBranchRequests();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'get /kpa-branch/admin/branch-requests',
      'post /kpa-branch/admin/branch-requests/r%2F1/approve',
      'post /kpa-branch/admin/branch-requests/r1/reject',
      'post /kpa-branch/branch-requests',
      'get /kpa-branch/branch-requests/mine',
    ]);
    expect(calls[2].body).toEqual({ reason: '사유' });
  });
});

describe('심사 화면 진입 게이트(UX) — backend requireKpaBranchScope 와 같은 계층', () => {
  it('kpa-branch:admin · platform:super_admin 만 연다', () => {
    expect(satisfiesRole(['kpa-branch:admin'], ROLES.admin)).toBe(true);
    expect(satisfiesRole(['platform:super_admin'], ROLES.admin)).toBe(true);
    expect(satisfiesRole(['kpa-branch:operator'], ROLES.admin)).toBe(false);
    expect(satisfiesRole(['kpa-branch:member'], ROLES.admin)).toBe(false);
    expect(satisfiesRole(['kpa:admin'], ROLES.admin)).toBe(false);
    expect(satisfiesRole([], ROLES.admin)).toBe(false);
  });
});
