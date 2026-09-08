/**
 * WO-O4O-KPA-TABLET-GENERATION-CONSOLIDATION-AND-CANONICAL-REFERENCE-V1
 *
 * KPA Tablet 을 "다음 공통화의 기준(canonical reference)" 으로 쓰기 위해, 이번 회차에서 확정한
 * 계약을 **회귀 고정**한다. 세 축을 검사한다.
 *
 *   §2  product_content 은퇴 — 쓰기 허용 목록 · resolver · 뷰어에서 제거됐고,
 *                              의약품 가드(읽기 방어)만 남아 있다.
 *   §7  idle 단일 계약 — 같은 의미의 두 경로(config 없음 / source='legacy_idle_playlist')가
 *                        **같은 결과**를 낸다(운영자 공통 영상 유실 없음).
 *   §5  상품 Content 1순위 단일화 — supplier·local 양쪽이 1세대 `disp.content_id` 가 아니라
 *                        링크 원장(kpa_store_content_product_links)을 1순위 근거로 쓴다.
 *   §9  preview / 실제 Tablet / QR 동일성 — 세 경로가 같은 resolver 를 경유한다.
 *
 * DB 에 붙지 않는다 — 계약은 소스 정적 검사와 순수 함수로 검증한다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseIdleMediaConfig, resolveIdleMediaItems } from '../routes/platform/store-tablet-idle-block.js';
import { collectScreenSetMasterIds } from '../routes/platform/store-tablet-medication-guard.js';

const ROOT = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

/** 주석은 계약이 아니다 — 경계 검사는 실제 코드에만 적용한다. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const SCREEN_CONTENT_CORE = 'packages/screen-content-core/src/index.ts';
const PUBLIC_RESOLVE = 'apps/api-server/src/routes/platform/store-public/store-public-screen-set-resolve.ts';
const PUBLIC_UTILS = 'apps/api-server/src/routes/platform/store-public/store-public-utils.ts';
const PUBLIC_TABLET_HANDLER = 'apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts';
const IDLE_RESOLVE = 'apps/api-server/src/routes/platform/store-public/store-public-tablet-idle-resolve.ts';
const STORE_TABLET_ROUTES = 'apps/api-server/src/routes/platform/store-tablet.routes.ts';
const OPERATOR_SET = 'apps/api-server/src/routes/o4o-store/controllers/operator-screen-set.controller.ts';
const SUPPLIER_SET = 'apps/api-server/src/routes/o4o-store/controllers/supplier-screen-set.controller.ts';
const KPA_VIEWER = 'services/web-kpa-society/src/pages/qr/PublicScreenSetViewer.tsx';
const KPA_TABLET_API = 'services/web-kpa-society/src/api/tabletDisplays.ts';

// ─────────────────────────────────────────────────────────────────────────────
// §2 product_content 은퇴
// ─────────────────────────────────────────────────────────────────────────────

describe('§2 product_content 은퇴 — 쓰기·resolve·렌더 경로 0', () => {
  it('블록 타입 계약(screen-content-core union)에 없다', () => {
    const src = stripComments(read(SCREEN_CONTENT_CORE));
    expect(src).not.toContain("'product_content'");
    // 대체 축은 그대로 살아 있어야 한다.
    expect(src).toContain("'content_list'");
    expect(src).toContain("'product_list'");
  });

  it.each([
    ['공통 매장 라우터', STORE_TABLET_ROUTES],
    ['운영자 세트 컨트롤러', OPERATOR_SET],
    ['공급자 세트 컨트롤러', SUPPLIER_SET],
  ])('%s 의 쓰기 허용 목록·preview 분기에 없다', (_label, path) => {
    expect(stripComments(read(path))).not.toContain('product_content');
  });

  it('공개 resolver 가 product_content 섹션을 내보내지 않는다', () => {
    expect(stripComments(read(PUBLIC_RESOLVE))).not.toContain('product_content');
  });

  it('KPA 뷰어·API 타입에 렌더 분기가 없다', () => {
    expect(stripComments(read(KPA_VIEWER))).not.toContain('product_content');
    expect(stripComments(read(KPA_TABLET_API))).not.toContain('product_content');
  });

  it('의약품 가드는 방어적으로 계속 수집한다 (DB CHECK 제약이 아직 허용하므로)', () => {
    // 은퇴는 쓰기·렌더 축이다. 안전 판정을 좁히지 않는다.
    const ids = collectScreenSetMasterIds([
      { blockType: 'product_content', config: { productRef: '11111111-1111-4111-8111-111111111111' } },
    ]);
    expect(ids).toEqual(['11111111-1111-4111-8111-111111111111']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §7 idle 단일 계약
// ─────────────────────────────────────────────────────────────────────────────

describe('§7 idle — 같은 의미의 두 경로가 같은 결과를 낸다', () => {
  const legacy = [{ mediaType: 'image' as const, url: 'https://cdn.example/a.png' }];
  const operator = [{ mediaType: 'youtube' as const, url: 'https://youtu.be/x' }];

  it("source='legacy_idle_playlist' 의 기준 목록은 매장 대기 목록이다", () => {
    const parsed = parseIdleMediaConfig({ source: 'legacy_idle_playlist' });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const out = resolveIdleMediaItems(parsed.value, {
      legacyIdlePlaylist: legacy,
      operatorCommon: operator,
    });
    // 순수 resolver 는 base 만 만든다. 운영자 공통 prepend 는 §7 에서 호출부(resolveTabletIdleItems)가 맞춘다.
    expect(out.map((i) => i.url)).toEqual(['https://cdn.example/a.png']);
  });

  it('호출부가 legacy 소스에 운영자 공통을 prepend 하도록 고정돼 있다', () => {
    const src = stripComments(read(IDLE_RESOLVE));
    // 비대칭(운영자 공통 유실)이 되살아나지 않도록 조건 자체를 고정한다.
    expect(src).toContain("parsed.value.source === 'legacy_idle_playlist'");
    expect(src).toContain('prependOperator');
    expect(src).toContain('[operatorItem, ...resolved.map(toViewerItem)]');
  });

  it("명시 선택 소스(custom_media)에는 prepend 하지 않는다 (중복 방지)", () => {
    const parsed = parseIdleMediaConfig({
      source: 'custom_media',
      items: [{ mediaType: 'image', url: 'https://cdn.example/b.png' }],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const out = resolveIdleMediaItems(parsed.value, {
      legacyIdlePlaylist: legacy,
      operatorCommon: operator,
    });
    expect(out.map((i) => i.url)).toEqual(['https://cdn.example/b.png']);
  });

  it('idle resolve 지점은 하나다 — 두 소비처가 모두 이 함수를 경유한다', () => {
    expect(stripComments(read(PUBLIC_TABLET_HANDLER))).toContain('resolveTabletIdleItems');
    expect(stripComments(read(PUBLIC_RESOLVE))).toContain('resolveTabletIdleItems');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §5 상품 Content 1순위 단일화
// ─────────────────────────────────────────────────────────────────────────────

describe('§5 상품 Content 1순위 — 링크 원장이 근거이고 1세대 컬럼에 종속되지 않는다', () => {
  it.each([
    ['supplier(공개 상품 쿼리)', PUBLIC_UTILS],
    ['local(공개 태블릿 핸들러)', PUBLIC_TABLET_HANDLER],
  ])('%s: 링크 조인이 disp.content_id 일치를 필수 조건으로 쓰지 않는다', (_label, path) => {
    const src = stripComments(read(path));
    // 회귀 금지 = **JOIN ON 의 필수 조건**으로서의 `AND <alias>.content_id = disp.content_id`.
    //   (1세대 종속: 진열 행에 콘텐츠가 붙어 있어야만 1순위가 발화하는 형태)
    // 허용 = ORDER BY 안의 동점 처리 `(l.content_id = disp.content_id) DESC` — 이건 우선순위일 뿐
    //   링크 발견의 전제 조건이 아니다. 규칙을 넓게 잡으면 이 정렬 키까지 오탐한다.
    expect(src).not.toMatch(/AND\s+\w+\.content_id\s*=\s*disp\.content_id/);
    // 링크 원장을 직접 근거로 삼는다.
    expect(src).toContain('kpa_store_content_product_links');
    // 다중 링크 시 행 증식·비결정성 방지(LATERAL + LIMIT 1).
    expect(src).toContain('LEFT JOIN LATERAL');
  });

  it('disp.content_id 는 제거가 아니라 우선순위 정렬 키로 보존된다 (과거 데이터 호환)', () => {
    for (const path of [PUBLIC_UTILS, PUBLIC_TABLET_HANDLER]) {
      expect(stripComments(read(path))).toContain('(l.content_id = disp.content_id) DESC');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §6 product_list 3단 계약 · §9 preview / Tablet / QR 동일성
// ─────────────────────────────────────────────────────────────────────────────

describe('§6·§9 product_list 계약과 세 경로 동일성', () => {
  it('선택 상품 판정은 공용 함수 하나다 — preview·공개 resolver 가 같은 것을 쓴다', () => {
    // 미리보기(공통 매장 라우터)와 공개 runtime 이 같은 resolver 를 import 한다.
    expect(stripComments(read(STORE_TABLET_ROUTES))).toContain('resolveSelectedProductListSection');
    expect(stripComments(read(PUBLIC_RESOLVE))).toContain('resolveSelectedProductListSection');
  });

  it('QR·모바일(태블릿 문맥 없음)은 매장 전체 상품으로 폴백하지 않는다', () => {
    const src = stripComments(read(PUBLIC_RESOLVE));
    expect(src).toContain('EMPTY_QR_PRODUCT_SECTION');
    expect(src).toContain('if (!tabletContext)');
  });

  it('코너 진열 경로는 selectionMode 로 출처를 표시한다 (어느 단을 통해 왔는지 구분 가능)', () => {
    const src = stripComments(read(PUBLIC_RESOLVE));
    expect(src).toContain("selectionMode: 'corner_display'");
    expect(src).toContain("selectionMode: 'selected'");
  });

  it('1세대 진열은 태블릿 문맥에서만 읽힌다 — 삭제되지 않았다(살아 있는 2대가 의존)', () => {
    const src = stripComments(read(PUBLIC_RESOLVE));
    expect(src).toContain('queryTabletVisibleProducts');
    expect(src).toContain('tabletContext.configured');
  });
});
