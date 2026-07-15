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

import type { DataSource } from 'typeorm';
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

/**
 * Screen Set 에 screen_set QR 을 멱등 확보 + public_qr_slug 동기화.
 * @returns 확보된 QR(slug/url/reused). 게이트 미충족(미소유/삭제/보관) 시 null.
 */
export async function ensureScreenSetQr(
  dataSource: DataSource,
  opts: { organizationId: string; screenSetId: string; serviceKey?: string },
): Promise<EnsureScreenSetQrResult | null> {
  const { organizationId, screenSetId } = opts;
  const serviceKey = opts.serviceKey ?? 'kpa';

  const [set] = await dataSource.query(
    `SELECT id, name, public_qr_slug AS "publicQrSlug" FROM store_tablet_screen_sets
     WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL AND status <> 'archived' LIMIT 1`,
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
