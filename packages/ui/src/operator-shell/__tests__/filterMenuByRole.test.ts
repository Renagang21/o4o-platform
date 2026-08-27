/**
 * filterMenuByRole — 메뉴 가시성 계약 회귀검증 (4서비스 공통)
 *
 * WO-O4O-UI-VITEST-CI-ADOPTION-AND-PLATFORMONLY-MENU-GUARD-REGRESSION-V1
 *
 * 잠그는 계약:
 *   adminOnly       : isAdmin === true 일 때만 통과
 *   platformOnly    : isPlatformAdmin === true 일 때만 통과 (서비스 admin 도 제외)
 *   두 플래그 동시   : 교집합 (둘 다 true 여야 통과)
 *   3번째 인자 기본값: false → 2-인자 호출처(PharmacyHub / Neture / KPA-Society / K-Cosmetics)
 *                     동작은 완전히 동일해야 한다
 *   플래그 키        : 반환 객체에서 제거 (렌더러 계약 = OperatorMenuItem)
 *   순서            : 보존
 *   빈 그룹          : 결과에서 제외
 *   그 외 필드       : 보존 (exact / sectionLabel …)
 *
 * 서비스별 실제 UNIFIED_MENU 를 복사하지 않는다. 공통 함수 계약만 작은 fixture 로 검증한다.
 */
import { describe, it, expect } from 'vitest';
import { filterMenuByRole } from '../filterMenuByRole';
import type { OperatorGroupKey, UnifiedMenuItem } from '../types';

type Menu = Partial<Record<OperatorGroupKey, UnifiedMenuItem[]>>;

/** platformOnly 를 전혀 쓰지 않는 메뉴 = 기존 4서비스 형태 */
const LEGACY_MENU: Menu = {
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  users: [
    { label: '사용자', path: '/operator/users' },
    { label: '권한 관리', path: '/operator/roles', adminOnly: true },
  ],
  analytics: [{ label: '통계', path: '/operator/analytics', sectionLabel: '분석' }],
};

/** platformOnly 를 쓰는 메뉴 = GlycoPharm AI 운영 화면 형태 */
const PLATFORM_MENU: Menu = {
  analytics: [
    { label: 'AI 리포트', path: '/operator/ai-report' },
    { label: 'AI 사용량', path: '/operator/ai-usage', platformOnly: true },
    { label: 'AI 정산', path: '/operator/ai-billing', platformOnly: true },
  ],
};

const labels = (items: { label: string }[] | undefined) => (items ?? []).map(i => i.label);

describe('filterMenuByRole — 기존 adminOnly 계약', () => {
  it('일반 항목은 항상 통과하고 adminOnly 는 isAdmin 일 때만 통과한다', () => {
    expect(labels(filterMenuByRole(LEGACY_MENU, false).users)).toEqual(['사용자']);
    expect(labels(filterMenuByRole(LEGACY_MENU, true).users)).toEqual(['사용자', '권한 관리']);
  });

  it('순서 · 부가 필드를 보존하고 플래그 키는 제거한다', () => {
    const result = filterMenuByRole(LEGACY_MENU, true);
    expect(result.dashboard).toEqual([{ label: '대시보드', path: '/operator', exact: true }]);
    expect(result.analytics).toEqual([
      { label: '통계', path: '/operator/analytics', sectionLabel: '분석' },
    ]);
    for (const item of result.users ?? []) {
      expect(item).not.toHaveProperty('adminOnly');
      expect(item).not.toHaveProperty('platformOnly');
    }
  });

  it('통과 항목이 0개인 그룹은 결과에서 제외한다', () => {
    const menu: Menu = { users: [{ label: '권한 관리', path: '/operator/roles', adminOnly: true }] };
    expect(filterMenuByRole(menu, true)).toHaveProperty('users');
    expect(filterMenuByRole(menu, false)).not.toHaveProperty('users');
    expect(Object.keys(filterMenuByRole(menu, false))).toEqual([]);
  });
});

describe('filterMenuByRole — platformOnly 계약', () => {
  it('isPlatformAdmin=false 면 platformOnly 항목을 제거한다 (서비스 admin 도 제외)', () => {
    expect(labels(filterMenuByRole(PLATFORM_MENU, false, false).analytics)).toEqual(['AI 리포트']);
    // 서비스 admin(isAdmin=true) 이어도 platform 전용 항목은 보이지 않는다 — 이 WO 의 핵심 negative
    expect(labels(filterMenuByRole(PLATFORM_MENU, true, false).analytics)).toEqual(['AI 리포트']);
  });

  it('isPlatformAdmin=true 면 platformOnly 항목을 노출한다', () => {
    expect(labels(filterMenuByRole(PLATFORM_MENU, true, true).analytics)).toEqual([
      'AI 리포트',
      'AI 사용량',
      'AI 정산',
    ]);
  });

  it('platformOnly 만 있는 그룹은 비-platform 운영자에게 그룹째 사라진다', () => {
    const menu: Menu = { analytics: [{ label: 'AI 정산', path: '/operator/ai-billing', platformOnly: true }] };
    expect(filterMenuByRole(menu, true, false)).not.toHaveProperty('analytics');
    expect(filterMenuByRole(menu, true, true)).toHaveProperty('analytics');
  });

  it('adminOnly 와 platformOnly 가 함께 있으면 교집합이다 (둘 다 true 여야 통과)', () => {
    const menu: Menu = {
      analytics: [{ label: '플랫폼 정산', path: '/operator/x', adminOnly: true, platformOnly: true }],
    };
    expect(labels(filterMenuByRole(menu, false, false).analytics)).toEqual([]);
    expect(labels(filterMenuByRole(menu, true, false).analytics)).toEqual([]);
    expect(labels(filterMenuByRole(menu, false, true).analytics)).toEqual([]);
    expect(labels(filterMenuByRole(menu, true, true).analytics)).toEqual(['플랫폼 정산']);
  });
});

describe('filterMenuByRole — 2-인자 호출처 backward compatibility', () => {
  it('3번째 인자 기본값은 false 다', () => {
    expect(filterMenuByRole(PLATFORM_MENU, true)).toEqual(filterMenuByRole(PLATFORM_MENU, true, false));
  });

  it('platformOnly 를 쓰지 않는 메뉴는 3번째 인자와 무관하게 동일한 결과를 낸다', () => {
    for (const isAdmin of [false, true]) {
      const twoArg = filterMenuByRole(LEGACY_MENU, isAdmin);
      expect(filterMenuByRole(LEGACY_MENU, isAdmin, false)).toEqual(twoArg);
      expect(filterMenuByRole(LEGACY_MENU, isAdmin, true)).toEqual(twoArg);
    }
  });

  it('입력 메뉴를 변형하지 않는다', () => {
    const snapshot = JSON.stringify(PLATFORM_MENU);
    filterMenuByRole(PLATFORM_MENU, true, true);
    filterMenuByRole(PLATFORM_MENU, false, false);
    expect(JSON.stringify(PLATFORM_MENU)).toBe(snapshot);
  });
});
