/**
 * 공통 View adoption 고정 테스트 (정적 검사)
 *
 * WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1 §12
 *   B21 운영자 커뮤니티 콘솔(KPA/Neture) 과 C7 운영자 콘텐츠 허브(KPA)
 *   wrapper 가 공통 View 를 소비하는 상태를 고정한다. 자체 구현으로 되돌아가면 실패한다.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(p, 'utf-8');

const B21_WRAPPERS = [
  'services/web-neture/src/pages/admin/CommunityManagementPage.tsx',
];

// WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7: 옛 KPA 운영자 화면은 제거됐다 — pharmacy 운영 화면이 필요하면 새로 만든다.
const KPA_RETIRED_WRAPPERS = [
  'services/web-pharmacy-business/src/pages/operator/CommunityManagementPage.tsx',
  'services/web-pharmacy-business/src/pages/operator/OperatorContentHubPage.tsx',
];

const SHARED_VIEWS = [
  'packages/operator-core-ui/src/modules/community-home/CommunityHomeConsole.tsx',
  'packages/operator-core-ui/src/modules/operator-content-hub/OperatorContentHubConsole.tsx',
];

describe('B21 운영자 커뮤니티 콘솔 adoption', () => {
  it.each(B21_WRAPPERS)('%s 는 CommunityHomeConsole 을 소비한다', (path) => {
    const src = read(path);
    expect(src).toContain("@o4o/operator-core-ui/modules/community-home");
    expect(src).toContain('CommunityHomeConsole');
  });

  it.each(B21_WRAPPERS)('%s 는 목록/모달을 자체 구현하지 않는다', (path) => {
    const src = read(path);
    expect(src).not.toContain('<table');
    expect(src).not.toContain('DataTable');
    expect(src).not.toContain('window.confirm');
  });
});

describe('옛 KPA 운영자 wrapper 제거 (WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7)', () => {
  it.each(KPA_RETIRED_WRAPPERS)('%s 는 존재하지 않는다', (path) => {
    expect(existsSync(path)).toBe(false);
  });
});

describe('공통 View 는 service-neutral 이어야 한다', () => {
  it.each(SHARED_VIEWS)('%s 에 서비스 분기·직접 fetch 가 없다', (path) => {
    // 주석(설계 의도 서술)은 제외하고 실제 코드만 검사한다.
    const src = read(path)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    // 서비스 분기 금지
    expect(src).not.toMatch(/serviceKey\s*===/);
    expect(src).not.toMatch(/switch\s*\(\s*service/);
    expect(src).not.toMatch(/service\s*===\s*['"]/);
    // 데이터 접근은 주입된 client adapter 로만
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toContain('axios');
    expect(src).not.toContain('apiClient');
    // 서비스별 API 모듈 import 금지
    expect(src).not.toMatch(/from\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/services\//);
  });
});
