/**
 * WO-O4O-STORE-QR-CANONICAL-ADOPTED-IMPLEMENTATION-GAP-AUDIT-AND-PH-SCREENSET-FINAL-CLOSURE-V1
 *
 * 채택된 Store QR canonical 구현의 **불변 조건을 회귀 고정**한다.
 * 폐기된 경쟁 patch 가 명시 가드로 갖고 있던 항목 중, 이 저장소에는 구조적 근거만 있고
 * 회귀 검사가 없던 것들을 여기서 고정한다(§2 차이 감사의 ACTIVE_GAP A).
 *
 *   §1  canonical 2축 무결성 — landing_type → targetKind 매핑 구멍 0 · contentSource 전수 귀속
 *   §2  `type` 컬럼 = DEAD residue — DROP 하지 않고, 런타임이 읽지도 쓰지도 않는다
 *   §3  PRODUCT_MASTER_LANDING 은 Store QR writer 가 만들 수 없다 (감사 후보 B)
 *   §4  신규 `promotion` 생성 차단 · 과거 행 표시 축 보존 (감사 후보 C)
 *   §5  migration 이 안정 식별축·스캔 이력을 건드리지 않는다
 *   §6  Placement 미구현 · ProductMaster `/p/` 와 Store `/qr/` 분리 유지
 *   §7  screen_set 공개 뷰어는 KPA·PharmacyHub 공용 1개 (이번 회차 결함 회귀 고정)
 *
 * DB 에 붙지 않는다 — 계약은 소스 정적 검사와 순수 함수로 검증한다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  QR_TARGET_KINDS,
  QR_CONTENT_SOURCES,
  LANDING_TYPE_TO_TARGET_KIND,
  TARGET_KIND_CONTENT_SOURCES,
  toQrTargetKind,
  contentSourceClassifySql,
} from '../services/store/store-qr-target.contract.js';
import { VALID_QR_LANDING_TYPES } from '../services/store/store-qr.service.js';

const ROOT = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

/** 주석은 계약이 아니다 — 경계 검사는 실제 코드에만 적용한다. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const CONTRACT = 'apps/api-server/src/services/store/store-qr-target.contract.ts';
const QR_SERVICE = 'apps/api-server/src/services/store/store-qr.service.ts';
const QR_ENTITY = 'apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts';
const CONTENT_SOURCE_MIGRATION =
  'apps/api-server/src/database/migrations/20270327000000-AddStoreQrContentSource.ts';
const SHARED_VIEWER = 'packages/tablet-kiosk-core/src/PublicScreenSetViewer.tsx';
const KPA_LANDING = 'services/web-kpa-society/src/pages/qr/QrLandingPage.tsx';
const PH_LANDING = 'services/web-pharmacy-hub/src/pages/QrLandingPage.tsx';

/** 분류 SQL 은 컬럼 이름만 받는 순수 문자열 생성기다. */
const classifySql = () =>
  contentSourceClassifySql({
    qrAlias: 'q',
    landingTypeCol: 'landing_type',
    landingTargetIdCol: 'landing_target_id',
    libraryItemIdCol: 'library_item_id',
    organizationIdCol: 'organization_id',
  } as Parameters<typeof contentSourceClassifySql>[0]);

// ─────────────────────────────────────────────────────────────────────────────
// §1 canonical 2축 무결성
// ─────────────────────────────────────────────────────────────────────────────

describe('§1 canonical 2축 — targetKind · contentSource', () => {
  it('생성 허용 landing_type 은 전부 targetKind 로 매핑된다 (undefined 구멍 0)', () => {
    for (const lt of VALID_QR_LANDING_TYPES) {
      expect(toQrTargetKind(lt)).not.toBeNull();
      expect(QR_TARGET_KINDS as readonly string[]).toContain(toQrTargetKind(lt));
    }
  });

  it('표시 매핑도 알 수 없는 targetKind 를 만들지 않는다', () => {
    for (const kind of Object.values(LANDING_TYPE_TO_TARGET_KIND)) {
      expect(QR_TARGET_KINDS as readonly string[]).toContain(kind);
    }
  });

  it('알 수 없는 landing_type 은 추측하지 않고 null 이다', () => {
    expect(toQrTargetKind('placement')).toBeNull();
    expect(toQrTargetKind('')).toBeNull();
    expect(toQrTargetKind(null)).toBeNull();
    expect(toQrTargetKind(undefined)).toBeNull();
  });

  it('모든 contentSource 는 정확히 하나의 targetKind 에 귀속된다', () => {
    const owners = new Map<string, string[]>();
    for (const [kind, sources] of Object.entries(TARGET_KIND_CONTENT_SOURCES)) {
      for (const s of sources) owners.set(s, [...(owners.get(s) ?? []), kind]);
    }
    for (const s of QR_CONTENT_SOURCES) {
      expect(owners.get(s)).toHaveLength(1);
    }
    // 귀속표에만 있고 목록에 없는 값이 생기면 안 된다(양방향 전수).
    for (const s of owners.keys()) {
      expect(QR_CONTENT_SOURCES as readonly string[]).toContain(s);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §2 `type` 컬럼 = DEAD residue
// ─────────────────────────────────────────────────────────────────────────────

describe('§2 store_qr_codes.type — DROP 하지 않고 런타임 의존 0', () => {
  it('엔티티에 컬럼 정의는 남아 있다 (NOT NULL DEFAULT 라 DROP 금지)', () => {
    const src = read(QR_ENTITY);
    expect(src).toContain('type!: string');
    expect(src).toContain("default: 'product'");
  });

  it('마이그레이션이 type 컬럼을 DROP 하지 않는다', () => {
    const src = stripComments(read(CONTENT_SOURCE_MIGRATION));
    expect(src).not.toMatch(/DROP\s+COLUMN\s+"?type"?/i);
  });

  it('QR 서비스가 type 을 읽지도 쓰지도 않는다', () => {
    const src = stripComments(read(QR_SERVICE));
    expect(src).not.toMatch(/\bqr\.type\b/);
    expect(src).not.toMatch(/\bitem\.type\s*=/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §3 PRODUCT_MASTER_LANDING — Store QR writer 가 만들 수 없다
// ─────────────────────────────────────────────────────────────────────────────

describe('§3 /qr/ writer 는 ProductMaster 대표 QR 축을 만들 수 없다', () => {
  it('분류 SQL 에 PRODUCT_MASTER_LANDING 을 낼 수 있는 분기가 없다', () => {
    expect(classifySql()).not.toContain('PRODUCT_MASTER_LANDING');
  });

  it('생성 경로가 클라이언트 contentSource 를 받지 않는다 (서버 판정만)', () => {
    const src = stripComments(read(QR_SERVICE));
    const start = src.indexOf('export async function createStoreQrCode');
    expect(start).toBeGreaterThan(-1);
    const rest = src.slice(start + 1);
    const end = rest.indexOf('export async function');
    const body = end === -1 ? rest : rest.slice(0, end);
    expect(body).not.toContain('contentSource: body');
    expect(body).not.toMatch(/contentSource[^;]{0,200}=\s*body/);
    // 원천 축은 관계 존재 여부로만 판정한다.
    expect(body).toContain('resolveQrContentSource');
  });

  it('PRODUCT_MASTER_LANDING 은 계약 목록에는 남아 있다 (표시·타 경로용)', () => {
    expect(QR_CONTENT_SOURCES as readonly string[]).toContain('PRODUCT_MASTER_LANDING');
    expect(TARGET_KIND_CONTENT_SOURCES.PRODUCT as readonly string[]).toContain(
      'PRODUCT_MASTER_LANDING',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §4 promotion — 신규 생성 차단 · 표시 축 보존
// ─────────────────────────────────────────────────────────────────────────────

describe('§4 promotion — 생성 축과 표시 축을 분리한다', () => {
  it('신규 생성 허용 목록에 없다', () => {
    expect(VALID_QR_LANDING_TYPES as readonly string[]).not.toContain('promotion');
  });

  it('그래도 표시 매핑은 남아 있다 (과거 행이 판정 불가가 되지 않는다)', () => {
    expect(toQrTargetKind('promotion')).toBe('CONTENT');
  });

  it('관계 원장이 있는 생성 타입은 분류 SQL 이 전부 다룬다', () => {
    // link/video 는 관계 원장이 없어 설계상 별도 경로다.
    const sql = classifySql();
    for (const lt of ['product', 'page', 'screen_set'] as const) {
      expect(sql).toContain(`'${lt}'`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §5 migration 은 안정 식별축을 건드리지 않는다
// ─────────────────────────────────────────────────────────────────────────────

describe('§5 안정 식별축 불변 — migration', () => {
  const IMMUTABLE = ['slug', 'organization_id', 'landing_target_id', 'is_active'];

  /**
   * `SET` 근처 문자열이 아니라 **대입 대상 컬럼**만 뽑는다.
   * CASE 식 안의 `q.landing_target_id = …` 같은 조건절을 대입으로 오인하면 안 된다.
   */
  const setTargets = () => {
    const src = stripComments(read(CONTENT_SOURCE_MIGRATION));
    return [...src.matchAll(/\bSET\s+"?([a-z_]+)"?\s*=/gi)].map((m) => m[1].toLowerCase());
  };

  it('UPDATE 의 대입 대상은 새 컬럼 content_source 하나뿐이다', () => {
    expect(setTargets()).toEqual(['content_source']);
  });

  it.each(IMMUTABLE)('%s 를 UPDATE 하지 않는다', (col) => {
    expect(setTargets()).not.toContain(col);
  });

  it.each(IMMUTABLE)('%s 를 DROP/RENAME 하지 않는다', (col) => {
    const src = stripComments(read(CONTENT_SOURCE_MIGRATION));
    expect(src).not.toMatch(new RegExp(`(DROP|RENAME)\\s+COLUMN\\s+"?${col}"?`, 'i'));
  });

  it('스캔 이력을 삭제하지 않는다', () => {
    const src = stripComments(read(CONTENT_SOURCE_MIGRATION));
    expect(src).not.toMatch(/DELETE\s+FROM/i);
    expect(src).not.toMatch(/TRUNCATE/i);
    expect(src).not.toMatch(/DROP\s+TABLE/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §6 Placement 미구현 · /p/ 와 /qr/ 분리
// ─────────────────────────────────────────────────────────────────────────────

describe('§6 범위 경계', () => {
  it.each([CONTRACT, QR_SERVICE, CONTENT_SOURCE_MIGRATION])(
    '%s 가 Placement 원장을 도입하지 않는다 (설계상 Phase 2)',
    (file) => {
      expect(stripComments(read(file))).not.toContain('store_qr_placements');
    },
  );

  it('Store QR 서비스가 ProductMaster 대표 QR 경로 `/p/` 를 만들지 않는다', () => {
    const src = stripComments(read(QR_SERVICE));
    expect(src).not.toMatch(/['"`]\/p\//);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §7 screen_set 공개 뷰어 = 공용 1개
// ─────────────────────────────────────────────────────────────────────────────

describe('§7 screen_set 공개 랜딩 — KPA · PharmacyHub 동일 renderer', () => {
  it('뷰어는 공통 패키지에 있고 서비스 로컬 테마·API 에 의존하지 않는다', () => {
    const src = read(SHARED_VIEWER);
    expect(src).not.toContain('../../styles/theme');
    expect(src).not.toContain('../../api/storeQr');
    expect(src).toContain('export function PublicScreenSetViewer');
  });

  it.each([
    ['KPA', KPA_LANDING],
    ['PharmacyHub', PH_LANDING],
  ])('%s 공개 랜딩이 공통 뷰어를 소비한다 (사본 아님)', (_svc, file) => {
    const src = stripComments(read(file));
    expect(src).toContain("from '@o4o/tablet-kiosk-core'");
    expect(src).toContain('PublicScreenSetViewer');
    expect(src).toContain("landingType === 'screen_set'");
  });

  it('PharmacyHub 가 screen_set 을 빈 준비 메시지로 처리하지 않는다', () => {
    const src = stripComments(read(PH_LANDING));
    const guard = src.indexOf("landingType === 'screen_set'");
    const fallback = src.indexOf('표시할 내용이 아직 준비되지 않았습니다');
    expect(guard).toBeGreaterThan(-1);
    expect(fallback).toBeGreaterThan(guard);
  });
});
