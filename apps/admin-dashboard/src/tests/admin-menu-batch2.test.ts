/**
 * WO-O4O-ADMIN-MENU-CONNECT-BATCH-2-V1 — 메뉴 연결 회귀 테스트
 *
 * 이번 배치의 실제 변경은 **신규 3건 추가 + 기존 죽은 항목 1건 교체** 다.
 * 특히 `/admin/yaksa-hub`(비활성 앱으로 귀결되는 죽은 링크) 가 메뉴에서 사라지고
 * `/admin/yaksa` 로 대체됐는지, 그리고 Yaksa 항목이 **중복되지 않는지**를 고정한다.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// JSX/아이콘 의존 없이 메뉴 정의만 검사하기 위해 소스를 텍스트로 파싱한다.
const SRC = readFileSync(
  join(__dirname, '../admin/menu/admin-menu.static.tsx'),
  'utf8',
);

/** 주석을 제거해 실제 메뉴 정의만 남긴다(설명 주석의 경로 언급이 오탐되지 않도록). */
const CODE = SRC.replace(/^\s*\/\/.*$/gm, '');

/**
 * 그룹 헤더는 `label` 만 있고 `path` 가 없다. 따라서 label→path 를 앞에서부터 짝짓는 방식은
 * 그룹 라벨이 첫 자식의 path 와 잘못 묶여 전체가 밀린다.
 * 각 `path` 기준으로 **바로 앞의 label** 을 찾는 방식이 정확하다
 * (한 항목 안에서 label 이 path 보다 먼저 나오고, 사이에 다른 항목의 path 는 없다).
 */
const labelPositions = [...CODE.matchAll(/label:\s*'([^']+)'/g)].map((m) => ({
  label: m[1],
  index: m.index!,
}));
const leaves = [...CODE.matchAll(/path:\s*'([^']+)'/g)].map((m) => {
  const before = labelPositions.filter((l) => l.index < m.index!);
  return { label: before[before.length - 1]?.label ?? '(unknown)', path: m[1] };
});
const ids = [...CODE.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);

const pathOf = (label: string) => leaves.find((l) => l.label === label)?.path;

describe('배치 2 — 추가한 메뉴 3건', () => {
  it.each([
    ['HUB 콘텐츠', '/operator/hub-contents'],
    ['콘텐츠 승인', '/operator/approvals'],
    ['포인트 운영', '/operator/points'],
  ])('%s → %s', (label, path) => {
    expect(pathOf(label)).toBe(path);
  });
});

describe('배치 2 — Yaksa 죽은 링크 교체', () => {
  // ── 2026-08-04 갱신 ────────────────────────────────────────────────────────
  // `WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1`(ab5570573) 이
  // 레거시 약사회 전용 관리자 도메인을 **전면 제거**했다. 이 배치가 연결했던
  // `지부/분회 관리자 센터 → /admin/yaksa` 도 그 대상에 포함되어 사라졌다.
  //   - `routes/yaksa.routes.tsx` 파일 자체가 삭제되어 route 도 함께 제거됐다
  //   - 따라서 메뉴만 지워 기능을 숨긴 것이 아니라 **정합적인 제거**다
  // 이 배치의 원래 목적(죽은 `/admin/yaksa-hub` 링크 제거)은 그대로 유효하므로
  // "죽은 링크가 없다"는 계약만 남기고, 특정 항목의 존재 단언은 걷어낸다.

  it('죽은 경로 /admin/yaksa-hub 가 메뉴에서 제거됐다', () => {
    expect(CODE).not.toContain("path: '/admin/yaksa-hub'");
    expect(leaves.some((l) => l.path === '/admin/yaksa-hub')).toBe(false);
  });

  it('교체 대상이던 Service Dashboard 항목이 남아 있지 않다', () => {
    expect(leaves.some((l) => l.label === 'Service Dashboard')).toBe(false);
  });

  it('레거시 제거 후 /admin/yaksa* 메뉴 항목이 남아 있지 않다', () => {
    // 제거가 완결됐는지 고정한다. 다시 생기면 route 유무를 함께 확인해야 한다.
    expect(leaves.filter((l) => /^\/admin\/yaksa/.test(l.path))).toHaveLength(0);
  });
});

describe('배치 2 — 포인트 운영 배치', () => {
  it('Admin 거버넌스 그룹(Core) 안에, Platform Settings 앞에 위치한다', () => {
    // Core 그룹은 RBAC/Operators/Membership/Platform Settings 를 담은 Admin 영역이다.
    const coreStart = CODE.indexOf("id: 'core'");
    const coreEnd = CODE.indexOf("id: 'o4o-product-db'");
    const coreBlock = CODE.slice(coreStart, coreEnd);

    expect(coreBlock).toContain("path: '/operator/points'");
    expect(coreBlock.indexOf("id: 'core-points'")).toBeLessThan(
      coreBlock.indexOf("id: 'core-settings'"),
    );
  });

  it('Yaksa 그룹에는 들어가지 않는다', () => {
    const yaksaStart = CODE.indexOf("id: 'yaksa'");
    const yaksaEnd = CODE.indexOf("id: 'digital-signage'");
    expect(CODE.slice(yaksaStart, yaksaEnd)).not.toContain('/operator/points');
  });
});

describe('배치 2 — 기존 메뉴 보존 및 무결성', () => {
  it('기존 주요 메뉴가 그대로 유지된다', () => {
    for (const [label, path] of [
      ['RBAC Role Assignments', '/users'],
      ['Service Operators', '/operators'],
      // 'Membership → /admin/membership/dashboard' 는 레거시 약사회 도메인 전면 제거
      // (ab5570573)로 메뉴·route 가 함께 사라져 단언 대상에서 제외한다.
      ['Platform Settings', '/settings'],
      ['공급 자산 조회', '/operator/kpa/snapshots'],
      ['Force Asset 관리', '/operator/kpa/force-assets'],
      ['플랫폼 HUB', '/admin/platform/hub'],
      ['매장 네트워크', '/admin/store-network'],
      ['오프라인 매장', '/admin/physical-stores'],
    ] as const) {
      expect(pathOf(label)).toBe(path);
    }
  });

  it('메뉴 경로와 id 에 중복이 없다', () => {
    // path·id 는 전역 고유해야 한다.
    expect(new Set(leaves.map((l) => l.path)).size).toBe(leaves.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('이번 배치에서 추가·교체한 라벨은 각각 1개뿐이다', () => {
    // label 자체는 그룹이 다르면 중복될 수 있다(기존 'Overview' 는 3개 그룹에 존재).
    // 따라서 전역 유일성 대신 이번 배치 항목의 유일성만 고정한다.
    for (const label of ['HUB 콘텐츠', '콘텐츠 승인', '포인트 운영']) {
      expect(leaves.filter((l) => l.label === label)).toHaveLength(1);
    }
  });

  it('모든 leaf 가 경로 형식을 갖추고, 배치 2 항목이 그 안에 있다', () => {
    // leaf **총계 고정은 하지 않는다.** 여러 WO 가 병행하며 메뉴를 정당하게 추가·제거하는데,
    // 고정 숫자는 그때마다 무관한 실패를 내고 실제 계약을 검증하지도 못한다
    // (실제로 44→47→48→45→40 으로 바뀌며 이 단언만 반복 실패했다).
    // 대신 "형식이 온전한가 + 이 배치의 항목이 살아 있는가" 를 고정한다.
    expect(leaves.length).toBeGreaterThan(0);
    for (const leaf of leaves) {
      expect(leaf.path.startsWith('/')).toBe(true);
      expect(leaf.label.length).toBeGreaterThan(0);
    }
    for (const path of ['/operator/hub-contents', '/operator/approvals', '/operator/points']) {
      expect(leaves.some((l) => l.path === path)).toBe(true);
    }
  });
});
