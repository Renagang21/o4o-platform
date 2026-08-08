/**
 * Screen Set QR 자동 연결 서비스
 *
 * WO-O4O-KPA-TABLET-QR-AUTO-LINK-AND-GUIDE-URL-V1
 *
 * 태블릿 콘텐츠(Screen Set) 저장 시 해당 Screen Set 의 screen_set QR(store_qr_codes)을 **멱등**으로
 * 확보하고 store_tablet_screen_sets.public_qr_slug 를 동기화한다. 콘텐츠를 복사/재작성하지 않는다.
 *
 * - 게이트: organization 소유 + deleted_at IS NULL + status <> 'archived'. 미충족 → null.
 * - 있으면 재사용(이름 변경 ≠ slug 변경), 없으면 생성. Screen Set 당 QR 1개(WO-A partial unique 로 DB 보장).
 * - 동시 생성/중복은 DB unique 위반 catch 후 재조회로 흡수(멱등).
 * - QR 이미지는 저장하지 않고 동적 생성 유지(slug 만 관리).
 */

import { getService } from '../../config/service-catalog.js';

// store owner/플랫폼 service key → service-catalog key. (store-qr-landing.controller 의 매핑과 동일 의미)
const SVC_TO_CATALOG: Record<string, string> = {
  kpa: 'kpa-society',
  'kpa-society': 'kpa-society',
  glycopharm: 'glycopharm',
  cosmetics: 'k-cosmetics',
  'k-cosmetics': 'k-cosmetics',
};

/** Screen Set QR 의 canonical 공개 절대 URL. QR 인코딩/공유용(상대경로 아님). */
export function buildScreenSetQrUrl(serviceKey: string, slug: string): string {
  const catalogKey = SVC_TO_CATALOG[serviceKey] ?? serviceKey;
  const domain = getService(catalogKey)?.domain || 'kpa-society.co.kr';
  return `https://${domain}/qr/${slug}`;
}

/** 이름 기반 slug 후보(ASCII 안전, 한글 제거). 비면 fallback. store_qr_codes.slug varchar(200) 여유. */
function slugifyName(name: string): string {
  const base = (name || '')
    .toLowerCase()
    .trim()
    .replace(/[가-힣]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return base || 'tablet-corner';
}

export interface EnsureScreenSetQrResult {
  slug: string;
  url: string;
  reused: boolean;
}

/** query 가능한 실행자(DataSource 또는 트랜잭션 EntityManager). */
type QueryExecutor = { query: (sql: string, params?: unknown[]) => Promise<unknown> };

/**
 * WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §1·§2 — QR 상태 판정 SQL SSOT.
 *
 * screen_set QR 은 `is_active` 만으로 상태를 결정할 수 없다. 공개 `/qr/:slug` 는 **이중 게이트**
 * (QR is_active + Screen Set 유효)를 통과해야 랜딩되므로, `is_active = true` 인데 대상 Screen Set 이
 * 보관·삭제·타 origin 이면 **랜딩 불가**다. 활성 QR KPI(§2)와 QR 목록 상태 배지(§1)가 서로,
 * 그리고 실제 공개 랜딩과 어긋나지 않도록 판정식을 여기 한 곳에 둔다.
 *
 * 사용 규칙: QR 테이블 alias = `qr`, 아래 JOIN 이 붙이는 Screen Set alias = `qs`.
 * `qs.id::text = qr.landing_target_id` — landing_target_id 는 varchar(link QR=URL 등 비-UUID 가능)라
 * uuid 직접 비교를 하지 않는다(uuid → text 캐스팅 방향 고정).
 */
export const SCREEN_SET_QR_JOIN = `
  LEFT JOIN store_tablet_screen_sets qs
    ON qs.id::text = qr.landing_target_id
   AND qs.organization_id = qr.organization_id
   AND qs.origin = 'store'`;

/** 공개 `/qr/:slug` 가 실제로 랜딩되는(=진짜 활성) QR 조건. */
export const QR_LANDABLE_CONDITION = `(
  qr.is_active = true
  AND (
    qr.landing_type <> 'screen_set'
    OR (qs.id IS NOT NULL AND qs.deleted_at IS NULL AND qs.status <> 'archived')
  )
)`;

/**
 * 보관된 Screen Set 에 종속된 QR — 목록에 '보관' 상태로 계속 보여준다(§1).
 * 사용자가 직접 삭제한 일반 QR(is_active=false, Screen Set 무관)은 여기 걸리지 않아 계속 숨는다.
 */
export const ARCHIVED_SCREEN_SET_QR_CONDITION = `(
  qr.landing_type = 'screen_set'
  AND qs.id IS NOT NULL
  AND (qs.deleted_at IS NOT NULL OR qs.status = 'archived')
)`;

/**
 * 위 판정의 **JOIN 없는 EXISTS 형태**. `SCREEN_SET_QR_JOIN` 을 붙일 수 없는 호출부
 * (TypeORM QueryBuilder 등)가 같은 기준을 쓰도록 한다.
 *
 * WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §6-2 (E2E 후속 수정):
 *   일괄 출력 `POST /pharmacy/qr/print` 만 `findStoreQrCode` 를 거치지 않고 raw QueryBuilder 로
 *   `is_active = true` 만 검사해, **보관된 Screen Set 의 코너 QR(is_active=true)이 계속 인쇄되던**
 *   우회가 남아 있었다(프로덕션 E2E 에서 200 실측). 단건 출력 3경로와 판정을 일치시킨다.
 *
 * @param qrAlias QR 테이블/엔티티 alias (기본 `qr`)
 */
export function screenSetQrPrintablePredicate(qrAlias = 'qr'): string {
  return `(
  ${qrAlias}.landing_type <> 'screen_set'
  OR EXISTS (
    SELECT 1 FROM store_tablet_screen_sets s
     WHERE s.id::text = ${qrAlias}.landing_target_id
       AND s.organization_id = ${qrAlias}.organization_id
       AND s.origin = 'store'
       AND s.deleted_at IS NULL
       AND s.status <> 'archived'
  )
)`;
}

/**
 * WO-O4O-SCREEN-SET-QR-LIFECYCLE-SYNC-V1
 * Screen Set 종속 QR(store_qr_codes, landing_type='screen_set')의 is_active 만 동기화한다.
 *  - archive → false, restore → true. **slug·QR row·landing_target_id 불변**(재사용/재생성/삭제 없음).
 *  - landing_type='screen_set' + 해당 set 만 대상 → 일반 QR(product/page/link/video)·다른 Screen Set QR 무영향.
 *  - 트랜잭션 원자성을 위해 executor(EntityManager)를 주입받는다.
 */
export async function setScreenSetQrActive(
  executor: QueryExecutor,
  organizationId: string,
  screenSetId: string,
  active: boolean,
): Promise<void> {
  await executor.query(
    `UPDATE store_qr_codes SET is_active = $1, updated_at = NOW()
      WHERE organization_id = $2 AND landing_type = 'screen_set' AND landing_target_id = $3`,
    [active, organizationId, screenSetId],
  );
}

/**
 * Screen Set 에 screen_set QR 을 멱등 확보 + public_qr_slug 동기화.
 * @returns 확보된 QR(slug/url/reused). 게이트 미충족(미소유/삭제/보관) 시 null.
 */
export async function ensureScreenSetQr(
  executor: QueryExecutor,
  opts: { organizationId: string; screenSetId: string; serviceKey?: string },
): Promise<EnsureScreenSetQrResult | null> {
  const { organizationId, screenSetId } = opts;
  const serviceKey = opts.serviceKey ?? 'kpa';

  // WO-O4O-SCREEN-SET-QR-WRITE-BOUNDARY-FIX-V1:
  //   저장 트랜잭션(EntityManager) 안에서 호출할 수 있도록 executor 를 받는다.
  //   → Screen Set 저장과 QR 확보가 같은 트랜잭션에서 성패를 함께 한다(부분 성공 없음).
  const dataSource = { query: (sql: string, params?: unknown[]) => executor.query(sql, params) as Promise<any> };

  // WO-O4O-STORE-SCREEN-SET-ORIGIN-ISOLATION-HARDENING-V1: QR 발급/조회 대상은 매장 소유(origin='store') 원본만.
  //   운영자·공급자 원본에는 Screen Set QR 을 발급하지 않는다(set 미존재 → null → 호출부가 QR 미부여).
  const [set] = await dataSource.query(
    `SELECT id, name, public_qr_slug AS "publicQrSlug" FROM store_tablet_screen_sets
     WHERE id = $1 AND organization_id = $2 AND origin = 'store' AND deleted_at IS NULL AND status <> 'archived' LIMIT 1`,
    [screenSetId, organizationId],
  );
  if (!set) return null;

  // 기존 screen_set QR (WO-A partial unique 로 최대 1건)
  const existing = await dataSource.query(
    `SELECT id, slug FROM store_qr_codes
     WHERE organization_id = $1 AND landing_type = 'screen_set' AND landing_target_id = $2
     ORDER BY created_at ASC`,
    [organizationId, screenSetId],
  );
  if (existing.length > 1) {
    // partial unique 상 발생 불가. 방어적 중단 — 임의 신규 생성/운영 데이터 정리 안 함.
    throw new Error(`Ambiguous screen_set QR duplicates for set ${screenSetId} (${existing.length})`);
  }
  if (existing.length === 1) {
    const chosen = existing[0];
    if (set.publicQrSlug !== chosen.slug) {
      await dataSource.query(
        `UPDATE store_tablet_screen_sets SET public_qr_slug = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
        [chosen.slug, screenSetId, organizationId],
      );
    }
    return { slug: chosen.slug, url: buildScreenSetQrUrl(serviceKey, chosen.slug), reused: true };
  }

  // 신규 생성 — slug 후보 + 충돌 재시도(제한 25회, 전역 unique namespace)
  const base = slugifyName(set.name);
  let slug = base;
  let allocated = false;
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [dup] = await dataSource.query(`SELECT 1 FROM store_qr_codes WHERE slug = $1 LIMIT 1`, [candidate]);
    if (!dup) { slug = candidate; allocated = true; break; }
  }
  if (!allocated) throw new Error(`Could not allocate unique QR slug for "${base}"`);

  try {
    await dataSource.query(
      `INSERT INTO store_qr_codes (organization_id, type, title, description, landing_type, landing_target_id, slug, is_active)
       VALUES ($1, 'screen_set', $2, NULL, 'screen_set', $3, $4, true)`,
      [organizationId, (set.name || 'Tablet Corner').slice(0, 300), screenSetId, slug],
    );
  } catch (e: unknown) {
    // 동시 생성 등 partial unique 위반 → 재조회 후 재사용(멱등).
    const [again] = await dataSource.query(
      `SELECT slug FROM store_qr_codes WHERE organization_id = $1 AND landing_type = 'screen_set' AND landing_target_id = $2 ORDER BY created_at ASC LIMIT 1`,
      [organizationId, screenSetId],
    );
    if (again?.slug) {
      if (set.publicQrSlug !== again.slug) {
        await dataSource.query(
          `UPDATE store_tablet_screen_sets SET public_qr_slug = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
          [again.slug, screenSetId, organizationId],
        );
      }
      return { slug: again.slug, url: buildScreenSetQrUrl(serviceKey, again.slug), reused: true };
    }
    throw e;
  }

  await dataSource.query(
    `UPDATE store_tablet_screen_sets SET public_qr_slug = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
    [slug, screenSetId, organizationId],
  );
  return { slug, url: buildScreenSetQrUrl(serviceKey, slug), reused: false };
}
