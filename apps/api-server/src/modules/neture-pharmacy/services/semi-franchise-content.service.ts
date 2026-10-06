/**
 * 세미프랜차이즈 콘텐츠 자료함 — DESIGN §6 · §15 (WO TODO 3-3)
 *
 * - 원장: `semi_franchise_contents` (담당 운영자가 작성 · 게시). 공통 콘텐츠 Core(cms_contents · hub contents — F4 · F5)는
 *   건드리지 않는다 — cms_contents 는 serviceKey 공개 조회 경로가 있어 가입 약국 한정 콘텐츠를 담을 수 없다.
 * - 열람 · 사본: 약국 조직의 세미프랜차이즈 가입 active ∧ 세미프랜차이즈 active ∧ 콘텐츠 published 일 때만.
 *   사본은 기존 공개 API `AssetCopyService.copyResolved()` 로 `o4o_asset_snapshots(asset_type='content',
 *   source_service='semi-franchise')` 를 만든다 — 이후 편집 · 매장 자료함 · 채널 게시는 기존 경로 그대로.
 *   (asset-copy-core resolver 는 조직 문맥을 받지 않아 가입 판정을 할 수 없으므로 resolver 분기를 쓰지 않는다.)
 */
import type { DataSource } from 'typeorm';
import { NeturePharmacyError, rowsOf } from '../constants.js';
import type { SemiFranchiseRow } from './semi-franchise.service.js';

export const SEMI_FRANCHISE_CONTENT_SOURCE = 'semi-franchise';

export interface ContentInput {
  title?: string;
  summary?: string | null;
  body?: string | null;
  thumbnailUrl?: string | null;
  attachments?: unknown;
  tags?: unknown;
}

/** 사본 생성기 — 기본은 AssetCopyService.copyResolved. 테스트는 같은 행을 SQL 로 만든다. */
export type SnapshotCopier = (input: {
  sourceService: string;
  sourceAssetId: string;
  assetType: string;
  targetOrganizationId: string;
  createdBy: string;
  title: string;
  contentJson: Record<string, unknown>;
}) => Promise<{ snapshotId: string }>;

function cleanContent(input: ContentInput, requireTitle: boolean) {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (requireTitle && (!title || title.length > 300)) {
    throw new NeturePharmacyError(400, 'INVALID_TITLE', '제목을 입력해 주세요(300자 이하).');
  }
  const arr = (v: unknown) => (Array.isArray(v) ? v : undefined);
  const text = (v: unknown) => (typeof v === 'string' ? v : v === null ? null : undefined);
  return {
    title: title || undefined,
    summary: text(input.summary),
    body: text(input.body),
    thumbnailUrl: text(input.thumbnailUrl),
    attachments: arr(input.attachments),
    tags: arr(input.tags)?.filter((t) => typeof t === 'string').slice(0, 20),
  };
}

const VIEW = `
  SELECT c.id, c.title, c.summary, c.body, c.thumbnail_url AS "thumbnailUrl", c.attachments, c.tags,
         c.status, c.published_at AS "publishedAt", c.created_at AS "createdAt", c.updated_at AS "updatedAt",
         sf.key AS "semiFranchiseKey", sf.name AS "semiFranchiseName"
    FROM semi_franchise_contents c
    JOIN semi_franchises sf ON sf.id = c.semi_franchise_id`;

/** 약국 조직이 지금 볼 수 있는 콘텐츠 조건 ($1 = organizationId) */
const PHARMACY_SCOPE = `
  c.status = 'published' AND sf.status = 'active'
  AND EXISTS (SELECT 1 FROM semi_franchise_memberships sfm
               WHERE sfm.semi_franchise_id = sf.id AND sfm.organization_id = $1 AND sfm.status = 'active')`;

export class SemiFranchiseContentService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly copier: SnapshotCopier,
  ) {}

  // ─── 담당 운영자 ────────────────────────────────────────────────────────

  async operatorList(sf: SemiFranchiseRow, status?: string) {
    const s = status && status !== 'all' ? status : null;
    return this.dataSource.query(
      `${VIEW} WHERE c.semi_franchise_id = $1 AND ($2::text IS NULL OR c.status = $2) ORDER BY c.updated_at DESC`,
      [sf.id, s],
    );
  }

  async operatorGet(sf: SemiFranchiseRow, id: string) {
    const [row] = await this.dataSource.query(`${VIEW} WHERE c.id = $1::uuid AND c.semi_franchise_id = $2`, [id, sf.id]);
    if (!row) throw new NeturePharmacyError(404, 'CONTENT_NOT_FOUND', '콘텐츠를 찾을 수 없습니다.');
    return row;
  }

  async operatorCreate(sf: SemiFranchiseRow, userId: string, input: ContentInput) {
    const c = cleanContent(input, true);
    const [row] = await this.dataSource.query(
      `INSERT INTO semi_franchise_contents
         (semi_franchise_id, title, summary, body, thumbnail_url, attachments, tags, status, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, 'draft', $8, $8)
       RETURNING id, status`,
      [sf.id, c.title, c.summary ?? null, c.body ?? null, c.thumbnailUrl ?? null,
        JSON.stringify(c.attachments ?? []), JSON.stringify(c.tags ?? []), userId],
    );
    return row;
  }

  async operatorUpdate(sf: SemiFranchiseRow, userId: string, id: string, input: ContentInput) {
    const c = cleanContent(input, false);
    if (input.title !== undefined && !c.title) {
      throw new NeturePharmacyError(400, 'INVALID_TITLE', '제목을 입력해 주세요(300자 이하).');
    }
    const rows = rowsOf(await this.dataSource.query(
      `UPDATE semi_franchise_contents SET
          title = COALESCE($3, title),
          summary = CASE WHEN $4 THEN $5 ELSE summary END,
          body = CASE WHEN $6 THEN $7 ELSE body END,
          thumbnail_url = CASE WHEN $8 THEN $9 ELSE thumbnail_url END,
          attachments = COALESCE($10::jsonb, attachments),
          tags = COALESCE($11::jsonb, tags),
          updated_by = $12, updated_at = NOW()
        WHERE id = $1::uuid AND semi_franchise_id = $2 AND status <> 'archived'
      RETURNING id, status`,
      [
        id, sf.id, c.title ?? null,
        c.summary !== undefined, c.summary ?? null,
        c.body !== undefined, c.body ?? null,
        c.thumbnailUrl !== undefined, c.thumbnailUrl ?? null,
        c.attachments ? JSON.stringify(c.attachments) : null,
        c.tags ? JSON.stringify(c.tags) : null,
        userId,
      ],
    ));
    if (!rows[0]) throw new NeturePharmacyError(404, 'CONTENT_NOT_FOUND', '수정할 수 있는 콘텐츠가 없습니다.');
    return rows[0];
  }

  /** 게시 · 보관(게시 중단). 보관된 콘텐츠는 약국에 보이지 않지만 이미 만든 매장 사본은 매장 소유로 남는다. */
  async operatorSetStatus(sf: SemiFranchiseRow, userId: string, id: string, action: 'publish' | 'archive') {
    const to = action === 'publish' ? 'published' : 'archived';
    const from = action === 'publish' ? ['draft', 'archived'] : ['draft', 'published'];
    const rows = rowsOf(await this.dataSource.query(
      `UPDATE semi_franchise_contents
          SET status = $3::text, updated_by = $4, updated_at = NOW(),
              published_at = CASE WHEN $3::text = 'published' THEN NOW() ELSE published_at END
        WHERE id = $1::uuid AND semi_franchise_id = $2 AND status = ANY($5::text[])
      RETURNING id, status`,
      [id, sf.id, to, userId, from],
    ));
    if (!rows[0]) throw new NeturePharmacyError(409, 'INVALID_TRANSITION', '처리할 수 없는 상태입니다.');
    return rows[0];
  }

  // ─── 약국 ──────────────────────────────────────────────────────────────

  /** 가입한(active) 세미프랜차이즈의 게시 콘텐츠. sfKey 로 한 세미프랜차이즈만 볼 수 있다. */
  async pharmacyList(organizationId: string, filter: { sfKey?: string; q?: string; page?: number; limit?: number } = {}) {
    const limit = Math.min(Math.max(Number(filter.limit) || 30, 1), 100);
    const offset = (Math.max(Number(filter.page) || 1, 1) - 1) * limit;
    const sfKey = filter.sfKey?.trim() || null;
    const q = filter.q?.trim() ? `%${filter.q.trim()}%` : null;
    const where = `WHERE ${PHARMACY_SCOPE} AND ($2::text IS NULL OR sf.key = $2)
                     AND ($3::text IS NULL OR c.title ILIKE $3 OR c.summary ILIKE $3)`;
    const items = await this.dataSource.query(
      `${VIEW} ${where} ORDER BY c.published_at DESC NULLS LAST, c.id LIMIT $4 OFFSET $5`,
      [organizationId, sfKey, q, limit, offset],
    );
    const [{ count }] = await this.dataSource.query(
      `SELECT count(*)::int AS count FROM semi_franchise_contents c JOIN semi_franchises sf ON sf.id = c.semi_franchise_id ${where}`,
      [organizationId, sfKey, q],
    );
    return { items, total: count };
  }

  /** 상세 — 볼 수 없으면 존재를 드러내지 않는다(404). */
  async pharmacyGet(organizationId: string, id: string) {
    const [row] = await this.dataSource.query(`${VIEW} WHERE ${PHARMACY_SCOPE} AND c.id = $2::uuid`, [organizationId, id]);
    if (!row) throw new NeturePharmacyError(404, 'CONTENT_NOT_AVAILABLE', '이용할 수 없는 콘텐츠입니다.');
    return row;
  }

  /** 내 매장 편집용 사본 — 원본 변경은 사본에 전파되지 않는다(Store 소유 독립 사본). */
  async pharmacyCopy(organizationId: string, userId: string, id: string) {
    const c = await this.pharmacyGet(organizationId, id);
    const { snapshotId } = await this.copier({
      sourceService: SEMI_FRANCHISE_CONTENT_SOURCE,
      sourceAssetId: c.id,
      assetType: 'content',
      targetOrganizationId: organizationId,
      createdBy: userId,
      title: c.title,
      contentJson: {
        title: c.title,
        summary: c.summary,
        body: c.body,
        thumbnailUrl: c.thumbnailUrl,
        attachments: c.attachments,
        tags: c.tags,
        semiFranchiseKey: c.semiFranchiseKey,
        semiFranchiseName: c.semiFranchiseName,
        sourceLabel: '세미프랜차이즈',
        capturedAt: new Date().toISOString(),
      },
    });
    return { snapshotId };
  }
}
