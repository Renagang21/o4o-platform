/**
 * Store QR Placement — 사용처 이력 · 대표값 · scan 귀속 (공통 SSOT)
 *
 * WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §6·§12·§14
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 세 상태를 분리한다 (DESIGN §14)
 *
 *   QR 자체     is_active            이 주소가 열리는가
 *   Target      대상 원장 status      열 내용이 아직 있는가
 *   Placement   placements.status     지금 그 자리에 붙어 있는가   ← 이 파일
 *
 * 매대에서 뗐다고 QR 을 비활성화하면 이미 인쇄된 QR 이 전부 죽는다.
 * 그래서 배치 종료는 **QR 을 건드리지 않는다**.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * KPA / PharmacyHub 공용. 서비스 조건문을 두지 않는다 —
 * 컨트롤러가 organizationId 만 해석해 넘긴다(유일한 정당한 서비스 차이).
 */
import type { DataSource } from 'typeorm';

// ─── 계약 타입 ────────────────────────────────────────────────────────────────

export interface StoreQrPlacementRow {
  id: string;
  qrCodeId: string;
  placement: string;
  label: string | null;
  cornerRef: string | null;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PlacementResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; message: string };

const NOT_FOUND = {
  ok: false as const,
  status: 404,
  code: 'QR_NOT_FOUND',
  message: 'QR 을 찾을 수 없습니다.',
};
const PLACEMENT_NOT_FOUND = {
  ok: false as const,
  status: 404,
  code: 'PLACEMENT_NOT_FOUND',
  message: '배치 기록을 찾을 수 없습니다.',
};

/**
 * UI preset — **DB 제약이 아니다.** 프론트가 고를 값을 제안할 뿐이며,
 * 서버는 목록 밖의 값도 그대로 저장한다(DESIGN §7-2 개방형).
 */
export const QR_PLACEMENT_PRESETS = [
  'TABLET',
  'SHELF',
  'ESL',
  'POP',
  'POSTER',
  'COUNSELING_TABLE',
  'ENTRANCE',
  'PRINT',
  'OTHER',
] as const;

/** 활성 배치가 2개 이상일 때 대표값에 넣는 표식. 잘못된 단일값을 보여주지 않는다(§14). */
export const PRIMARY_PLACEMENT_MULTIPLE = 'MULTIPLE';

const MAX_PLACEMENT_LEN = 40;
const MAX_LABEL_LEN = 200;

function normalizePlacement(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (!v || v.length > MAX_PLACEMENT_LEN) return null;
  return v;
}
function normalizeText(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  if (!v) return null;
  return v.slice(0, max);
}

// ─── 경계 확인 ────────────────────────────────────────────────────────────────

/**
 * 이 QR 이 이 조직 것인지 확인한다.
 * 조직 조건 없는 UUID 단독 조회를 하지 않는다(CLAUDE.md §7 Guard Rule 1).
 */
async function assertQrOwned(
  dataSource: DataSource,
  organizationId: string,
  qrCodeId: string,
): Promise<boolean> {
  const rows = await dataSource.query(
    `SELECT 1 FROM store_qr_codes WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [qrCodeId, organizationId],
  );
  return Array.isArray(rows) && rows.length > 0;
}

// ─── 대표값 계산 (§14) ────────────────────────────────────────────────────────

/**
 * `store_qr_codes.primary_placement` 재계산.
 *
 *   활성 1개   → 그 placement
 *   활성 0개   → NULL
 *   활성 2개+  → 'MULTIPLE'   (임의로 하나를 고르지 않는다)
 *
 * SSOT 는 placements 테이블이며 이 컬럼은 목록 조회 캐시다.
 * 모든 write 경로가 이 함수를 마지막에 호출한다 — 동기화 지점을 하나로 둔다.
 */
export async function syncPrimaryPlacement(
  dataSource: DataSource,
  organizationId: string,
  qrCodeId: string,
): Promise<string | null> {
  const rows = await dataSource.query(
    `SELECT placement FROM store_qr_placements
      WHERE qr_code_id = $1 AND organization_id = $2 AND status = 'active'
      LIMIT 2`,
    [qrCodeId, organizationId],
  );
  const next =
    rows.length === 0 ? null : rows.length === 1 ? String(rows[0].placement) : PRIMARY_PLACEMENT_MULTIPLE;
  await dataSource.query(
    `UPDATE store_qr_codes SET primary_placement = $1, updated_at = now()
      WHERE id = $2 AND organization_id = $3`,
    [next, qrCodeId, organizationId],
  );
  return next;
}

// ─── 조회 ─────────────────────────────────────────────────────────────────────

const SELECT_COLUMNS = `
  id,
  qr_code_id  AS "qrCodeId",
  placement,
  label,
  corner_ref  AS "cornerRef",
  status,
  started_at  AS "startedAt",
  ended_at    AS "endedAt",
  created_at  AS "createdAt",
  updated_at  AS "updatedAt"
`;

/** 이 QR 의 사용처 이력(최신 시작 순). 활성이 먼저 온다. */
export async function listQrPlacements(
  dataSource: DataSource,
  organizationId: string,
  qrCodeId: string,
): Promise<PlacementResult<{ items: StoreQrPlacementRow[]; activeCount: number }>> {
  if (!(await assertQrOwned(dataSource, organizationId, qrCodeId))) return NOT_FOUND;
  const items: StoreQrPlacementRow[] = await dataSource.query(
    `SELECT ${SELECT_COLUMNS}
       FROM store_qr_placements
      WHERE qr_code_id = $1 AND organization_id = $2
      ORDER BY (status = 'active') DESC, started_at DESC`,
    [qrCodeId, organizationId],
  );
  return { ok: true, data: { items, activeCount: items.filter((i) => i.status === 'active').length } };
}

// ─── lifecycle (§6) ──────────────────────────────────────────────────────────

export interface StartPlacementInput {
  placement: unknown;
  label?: unknown;
  cornerRef?: unknown;
  /** true 면 기존 활성 배치를 모두 종료하고 시작한다(= 이동). */
  endOthers?: unknown;
}

/**
 * A. 배치 시작 / B. 이동(`endOthers=true`).
 *
 * 이동은 "기존 종료 + 신규 시작" 이며 **두 행이 남는다** — 이력이 지워지지 않는다.
 * 종료된 구간은 과거 스캔 귀속에 계속 쓰인다(§12).
 */
export async function startQrPlacement(
  dataSource: DataSource,
  organizationId: string,
  qrCodeId: string,
  input: StartPlacementInput,
): Promise<PlacementResult<{ placement: StoreQrPlacementRow; primaryPlacement: string | null }>> {
  if (!(await assertQrOwned(dataSource, organizationId, qrCodeId))) return NOT_FOUND;

  const placement = normalizePlacement(input.placement);
  if (!placement) {
    return {
      ok: false,
      status: 400,
      code: 'PLACEMENT_REQUIRED',
      message: '사용처를 선택해 주세요.',
    };
  }
  const label = normalizeText(input.label, MAX_LABEL_LEN);
  const cornerRef = normalizeText(input.cornerRef, MAX_LABEL_LEN);
  const endOthers = input.endOthers === true || input.endOthers === 'true';

  if (endOthers) {
    await dataSource.query(
      `UPDATE store_qr_placements
          SET status = 'ended', ended_at = now(), updated_at = now()
        WHERE qr_code_id = $1 AND organization_id = $2 AND status = 'active'`,
      [qrCodeId, organizationId],
    );
  }

  const inserted = await dataSource.query(
    `INSERT INTO store_qr_placements
       (organization_id, qr_code_id, placement, label, corner_ref, status, started_at)
     VALUES ($1, $2, $3, $4, $5, 'active', now())
     RETURNING ${SELECT_COLUMNS}`,
    [organizationId, qrCodeId, placement, label, cornerRef],
  );
  // ⚠️ INSERT ... RETURNING 은 드라이버에 따라 [rows, count] 로 온다 — 배열 앞을 취한다.
  const row: StoreQrPlacementRow = Array.isArray(inserted[0]) ? inserted[0][0] : inserted[0];

  const primaryPlacement = await syncPrimaryPlacement(dataSource, organizationId, qrCodeId);
  return { ok: true, data: { placement: row, primaryPlacement } };
}

/** 배치 메모 수정(사용처 코드 자체는 이동으로 처리한다 — 이력을 덮어쓰지 않는다). */
export async function updateQrPlacement(
  dataSource: DataSource,
  organizationId: string,
  qrCodeId: string,
  placementId: string,
  input: { label?: unknown; cornerRef?: unknown },
): Promise<PlacementResult<StoreQrPlacementRow>> {
  if (!(await assertQrOwned(dataSource, organizationId, qrCodeId))) return NOT_FOUND;
  const label = normalizeText(input.label, MAX_LABEL_LEN);
  const cornerRef = normalizeText(input.cornerRef, MAX_LABEL_LEN);

  const updated = await dataSource.query(
    `UPDATE store_qr_placements
        SET label = COALESCE($1, label),
            corner_ref = COALESCE($2, corner_ref),
            updated_at = now()
      WHERE id = $3 AND qr_code_id = $4 AND organization_id = $5
      RETURNING ${SELECT_COLUMNS}`,
    [label, cornerRef, placementId, qrCodeId, organizationId],
  );
  const rows = Array.isArray(updated[0]) ? updated[0] : updated;
  if (!rows?.[0]) return PLACEMENT_NOT_FOUND;
  return { ok: true, data: rows[0] };
}

/**
 * C. 종료. **QR 은 건드리지 않는다** — 주소는 살아 있고 인쇄물도 그대로 동작한다(§14-1).
 * 이미 종료된 배치를 다시 종료해도 안전하다(ended_at 을 덮지 않는다).
 */
export async function endQrPlacement(
  dataSource: DataSource,
  organizationId: string,
  qrCodeId: string,
  placementId: string,
): Promise<PlacementResult<{ placement: StoreQrPlacementRow; primaryPlacement: string | null }>> {
  if (!(await assertQrOwned(dataSource, organizationId, qrCodeId))) return NOT_FOUND;

  const updated = await dataSource.query(
    `UPDATE store_qr_placements
        SET status = 'ended',
            ended_at = COALESCE(ended_at, now()),
            updated_at = now()
      WHERE id = $1 AND qr_code_id = $2 AND organization_id = $3
      RETURNING ${SELECT_COLUMNS}`,
    [placementId, qrCodeId, organizationId],
  );
  const rows = Array.isArray(updated[0]) ? updated[0] : updated;
  if (!rows?.[0]) return PLACEMENT_NOT_FOUND;

  const primaryPlacement = await syncPrimaryPlacement(dataSource, organizationId, qrCodeId);
  return { ok: true, data: { placement: rows[0], primaryPlacement } };
}

// ─── scan 귀속 (§12) ─────────────────────────────────────────────────────────

export interface PlacementScanBreakdownRow {
  /** 사용처 코드 · `UNPLACED`(배치 이력 없음) · `AMBIGUOUS`(동시 활성 다중 → 구분 불가) */
  placement: string;
  label: string | null;
  scans: number;
}

/**
 * scan → placement 귀속.
 *
 * 스캔 이벤트는 `qr_code_id` 만 안다. 그래서 **시간 구간 조인**으로 귀속한다:
 *   scan.created_at ∈ [placement.started_at, placement.ended_at)
 *
 * 구간에 맞는 배치가
 *   1개 → 그 배치
 *   0개 → `UNPLACED`
 *   2개+ → `AMBIGUOUS` — 같은 QR 이미지를 여러 곳에 붙이면 어느 위치에서 찍혔는지
 *          **어떤 소프트웨어로도 알 수 없다.** 임의 배분하지 않고 사실대로 접는다(DESIGN §8·§9-3).
 *
 * 스캔 이벤트 스키마는 바꾸지 않는다 — 시점 denormalize 를 하면 구간 정보가 사라진다(§13-3).
 */
export async function getQrPlacementScanBreakdown(
  dataSource: DataSource,
  organizationId: string,
  qrCodeId: string,
): Promise<PlacementResult<PlacementScanBreakdownRow[]>> {
  if (!(await assertQrOwned(dataSource, organizationId, qrCodeId))) return NOT_FOUND;

  const rows = await dataSource.query(
    `WITH matched AS (
       SELECT e.id AS event_id,
              COUNT(p.id) AS match_count,
              MIN(p.placement) AS placement,
              MIN(p.label)     AS label
         FROM store_qr_scan_events e
         LEFT JOIN store_qr_placements p
                ON p.qr_code_id = e.qr_code_id
               AND p.organization_id = e.organization_id
               AND e.created_at >= p.started_at
               AND (p.ended_at IS NULL OR e.created_at < p.ended_at)
        WHERE e.qr_code_id = $1 AND e.organization_id = $2
        GROUP BY e.id
     )
     SELECT CASE WHEN match_count = 0 THEN 'UNPLACED'
                 WHEN match_count > 1 THEN 'AMBIGUOUS'
                 ELSE placement END AS placement,
            CASE WHEN match_count = 1 THEN label ELSE NULL END AS label,
            COUNT(*)::int AS scans
       FROM matched
      GROUP BY 1, 2
      ORDER BY scans DESC, placement ASC`,
    [qrCodeId, organizationId],
  );
  return { ok: true, data: rows };
}

/**
 * 조직 전체 사용처별 스캔 분포 — 운영 화면의 "어디서 많이 찍히는가".
 * 같은 구간 귀속 규칙을 쓰며, contentSource/targetKind 축과 함께 집계한다(§13-1).
 */
export async function getOrganizationPlacementAnalytics(
  dataSource: DataSource,
  organizationId: string,
  params?: { days?: number },
): Promise<{
  byPlacement: PlacementScanBreakdownRow[];
  byContentSource: Array<{ contentSource: string | null; scans: number }>;
  byTargetKind: Array<{ landingType: string | null; scans: number }>;
  totalScans: number;
}> {
  const days = Number.isFinite(Number(params?.days)) ? Math.max(1, Math.min(365, Number(params?.days))) : null;
  // 기간은 **바인딩**한다. 값이 서버에서 정규화된 정수라도 SQL 문자열에 끼워 넣지 않는다
  // (CLAUDE.md §7 Guard Rule 2 — 예외를 한 번 열면 다음 사람이 그 자리에 문자열을 넣는다).
  const since = days ? `AND e.created_at >= CURRENT_DATE - ($2::int * INTERVAL '1 day')` : '';
  const args = days ? [organizationId, days] : [organizationId];

  const [byPlacement, byContentSource, byTargetKind, totals] = await Promise.all([
    dataSource.query(
      `WITH matched AS (
         SELECT e.id AS event_id, COUNT(p.id) AS match_count, MIN(p.placement) AS placement
           FROM store_qr_scan_events e
           LEFT JOIN store_qr_placements p
                  ON p.qr_code_id = e.qr_code_id
                 AND p.organization_id = e.organization_id
                 AND e.created_at >= p.started_at
                 AND (p.ended_at IS NULL OR e.created_at < p.ended_at)
          WHERE e.organization_id = $1 ${since}
          GROUP BY e.id
       )
       SELECT CASE WHEN match_count = 0 THEN 'UNPLACED'
                   WHEN match_count > 1 THEN 'AMBIGUOUS'
                   ELSE placement END AS placement,
              NULL::text AS label,
              COUNT(*)::int AS scans
         FROM matched GROUP BY 1 ORDER BY scans DESC, placement ASC`,
      args,
    ),
    dataSource.query(
      `SELECT q.content_source AS "contentSource", COUNT(*)::int AS scans
         FROM store_qr_scan_events e
         JOIN store_qr_codes q ON q.id = e.qr_code_id AND q.organization_id = e.organization_id
        WHERE e.organization_id = $1 ${since}
        GROUP BY 1 ORDER BY scans DESC`,
      args,
    ),
    dataSource.query(
      `SELECT q.landing_type AS "landingType", COUNT(*)::int AS scans
         FROM store_qr_scan_events e
         JOIN store_qr_codes q ON q.id = e.qr_code_id AND q.organization_id = e.organization_id
        WHERE e.organization_id = $1 ${since}
        GROUP BY 1 ORDER BY scans DESC`,
      args,
    ),
    dataSource.query(
      `SELECT COUNT(*)::int AS total FROM store_qr_scan_events e
        WHERE e.organization_id = $1 ${since}`,
      args,
    ),
  ]);

  return {
    byPlacement,
    byContentSource,
    byTargetKind,
    totalScans: totals?.[0]?.total ?? 0,
  };
}
