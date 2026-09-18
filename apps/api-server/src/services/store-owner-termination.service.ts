import { createHash } from 'crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { MediaLibraryService } from '../modules/media/services/media-library.service.js';
import logger from '../utils/logger.js';

export const STORE_OWNER_CONTRACT_SERVICES = ['kpa-society', 'k-cosmetics', 'pharmacy-hub'] as const;
export type StoreOwnerContractServiceKey = typeof STORE_OWNER_CONTRACT_SERVICES[number];

type CaseStatus =
  | 'requested'
  | 'return_pending'
  | 'return_completed'
  | 'termination_scheduled'
  | 'terminated'
  | 'purge_completed'
  | 'cancelled'
  | 'failed';

interface ServiceConfig {
  role: string;
  /** store-content tables historically use role-prefix keys for KPA and sometimes Cosmetics. */
  contentKeys: string[];
  slugKeys: string[];
}

const SERVICE_CONFIG: Record<StoreOwnerContractServiceKey, ServiceConfig> = {
  'kpa-society': { role: 'kpa:store_owner', contentKeys: ['kpa', 'kpa-society'], slugKeys: ['kpa'] },
  'k-cosmetics': { role: 'cosmetics:store_owner', contentKeys: ['k-cosmetics', 'cosmetics'], slugKeys: ['cosmetics'] },
  'pharmacy-hub': { role: 'pharmacy-hub:store_owner', contentKeys: ['pharmacy-hub'], slugKeys: ['pharmacy-hub'] },
};

/** 공유 Store 데이터 보호 시 현재 store-capable enrollment 로 취급할 축. */
const SHARED_STORE_SERVICE_CODES = ['kpa-society', 'k-cosmetics', 'pharmacy-hub', 'cafe24-b2b'] as const;

export interface StoreOwnerTerminationCase {
  id: string;
  serviceKey: StoreOwnerContractServiceKey;
  organizationId: string;
  userId: string;
  status: CaseStatus;
  requestedAt: string;
  requestedBy: string | null;
  returnRequested: boolean;
  returnCompletedAt: string | null;
  terminationEffectiveAt: string | null;
  purgeDueAt: string | null;
  purgeCompletedAt: string | null;
  cancelledAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurgeInventoryItem {
  key: string;
  classification: 'SERVICE_SCOPED' | 'ORGANIZATION_SHARED' | 'SUPPLIER_OWNED' | 'SYSTEM_LOG';
  count: number;
  action: 'DELETE' | 'PRESERVE';
  reason?: string;
}

export interface PurgePreview {
  caseId: string;
  serviceKey: StoreOwnerContractServiceKey;
  organizationId: string;
  hasOtherActiveStoreService: boolean;
  items: PurgeInventoryItem[];
  totalDeleteRows: number;
  mediaCandidates: number;
}

export class StoreOwnerTerminationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 400,
  ) {
    super(message);
    this.name = 'StoreOwnerTerminationError';
  }
}

function configFor(serviceKey: string): ServiceConfig {
  if (!STORE_OWNER_CONTRACT_SERVICES.includes(serviceKey as StoreOwnerContractServiceKey)) {
    throw new StoreOwnerTerminationError('STORE_OWNER_TERMINATION_SERVICE_NOT_ALLOWED', '매장 경영자 계약 종료 대상 서비스가 아닙니다.');
  }
  return SERVICE_CONFIG[serviceKey as StoreOwnerContractServiceKey];
}

function mapCase(row: any): StoreOwnerTerminationCase {
  return {
    id: row.id,
    serviceKey: row.service_key,
    organizationId: row.organization_id,
    userId: row.user_id,
    status: row.status,
    requestedAt: new Date(row.requested_at).toISOString(),
    requestedBy: row.requested_by ?? null,
    returnRequested: !!row.return_requested,
    returnCompletedAt: row.return_completed_at ? new Date(row.return_completed_at).toISOString() : null,
    terminationEffectiveAt: row.termination_effective_at ? new Date(row.termination_effective_at).toISOString() : null,
    purgeDueAt: row.purge_due_at ? new Date(row.purge_due_at).toISOString() : null,
    purgeCompletedAt: row.purge_completed_at ? new Date(row.purge_completed_at).toISOString() : null,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : null,
    failureReason: row.failure_reason ?? null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function count(ds: DataSource | EntityManager, sql: string, params: unknown[]): Promise<number> {
  const rows = await ds.query(sql, params);
  return Number(rows?.[0]?.n ?? 0);
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export class StoreOwnerTerminationService {
  constructor(private readonly dataSource: DataSource) {}

  async createCase(input: {
    serviceKey: StoreOwnerContractServiceKey;
    organizationId: string;
    userId: string;
    requestedBy?: string | null;
    returnRequested?: boolean;
    terminationEffectiveAt?: string | null;
  }): Promise<StoreOwnerTerminationCase> {
    const cfg = configFor(input.serviceKey);
    const effective = input.terminationEffectiveAt ? new Date(input.terminationEffectiveAt) : new Date();
    if (Number.isNaN(effective.getTime())) {
      throw new StoreOwnerTerminationError('TERMINATION_EFFECTIVE_AT_INVALID', '종료 예정일이 올바르지 않습니다.');
    }

    const [enrollment] = await this.dataSource.query(
      `SELECT 1 FROM organization_service_enrollments
        WHERE organization_id=$1 AND service_code=$2 AND status='active' LIMIT 1`,
      [input.organizationId, input.serviceKey],
    );
    if (!enrollment) {
      throw new StoreOwnerTerminationError('STORE_SERVICE_NOT_ACTIVE', '해당 매장은 현재 서비스에 활성 연결되어 있지 않습니다.', 409);
    }

    const [role] = await this.dataSource.query(
      `SELECT 1 FROM role_assignments
        WHERE user_id=$1 AND role=$2 AND is_active=true LIMIT 1`,
      [input.userId, cfg.role],
    );
    if (!role) {
      throw new StoreOwnerTerminationError('STORE_OWNER_ROLE_NOT_ACTIVE', '대상 사용자의 매장 경영자 역할이 활성 상태가 아닙니다.', 409);
    }

    const returnRequested = !!input.returnRequested;
    const status: CaseStatus = returnRequested ? 'return_pending' : 'termination_scheduled';
    try {
      const rows = await this.dataSource.query(
        `INSERT INTO store_owner_termination_cases
           (service_key, organization_id, user_id, status, requested_by, return_requested, termination_effective_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [input.serviceKey, input.organizationId, input.userId, status, input.requestedBy ?? null, returnRequested, effective.toISOString()],
      );
      return mapCase(rows[0]);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new StoreOwnerTerminationError('TERMINATION_CASE_ALREADY_OPEN', '이미 진행 중인 매장 경영자 계약 종료 건이 있습니다.', 409);
      }
      throw error;
    }
  }

  async getCase(caseId: string): Promise<StoreOwnerTerminationCase> {
    const rows = await this.dataSource.query(`SELECT * FROM store_owner_termination_cases WHERE id=$1 LIMIT 1`, [caseId]);
    if (!rows[0]) throw new StoreOwnerTerminationError('TERMINATION_CASE_NOT_FOUND', '계약 종료 건을 찾을 수 없습니다.', 404);
    return mapCase(rows[0]);
  }

  async listCases(limit = 100): Promise<StoreOwnerTerminationCase[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const rows = await this.dataSource.query(
      `SELECT * FROM store_owner_termination_cases ORDER BY requested_at DESC LIMIT $1`,
      [safeLimit],
    );
    return rows.map(mapCase);
  }

  /**
   * 계약 별표 1 A/B/D/E 를 운영자가 전달할 수 있는 JSON 패키지로 구성한다.
   * 공급자 원본(C)과 운영·감사로그(F)는 의도적으로 제외한다.
   */
  async buildReturnPackage(caseId: string): Promise<Record<string, unknown>> {
    const c = await this.getCase(caseId);
    const cfg = configFor(c.serviceKey);
    const q = this.dataSource;

    const [organization] = await q.query(
      `SELECT id, name, address, address_detail, phone, business_number, storefront_config, storefront_blocks
         FROM organizations WHERE id=$1 LIMIT 1`,
      [c.organizationId],
    );

    const listings = await q.query(
      `SELECT id, service_key, master_id, offer_id, is_active, status, price, created_at, updated_at
         FROM organization_product_listings
        WHERE organization_id=$1 AND service_key=ANY($2::text[])
        ORDER BY created_at, id`,
      [c.organizationId, cfg.contentKeys],
    );
    const localProducts = await q.query(
      `SELECT id, name, description, images, category, barcode, price_display, summary, detail_html,
              usage_info, caution_info, thumbnail_url, gallery_images, badge_type, highlight_flag,
              is_active, sort_order, created_at, updated_at
         FROM store_local_products WHERE organization_id=$1 ORDER BY created_at, id`,
      [c.organizationId],
    );
    const snapshots = await q.query(
      `SELECT id, source_service, source_asset_id, asset_type, title, content_json, created_at
         FROM o4o_asset_snapshots WHERE organization_id=$1 ORDER BY created_at, id`,
      [c.organizationId],
    );
    const storePlaylists = await q.query(
      `SELECT id, name, playlist_type, publish_status, is_active, source_playlist_id, created_at, updated_at
         FROM store_playlists WHERE organization_id=$1 ORDER BY created_at, id`,
      [c.organizationId],
    );
    const storePlaylistIds = storePlaylists.map((r: any) => r.id);
    const storePlaylistItems = storePlaylistIds.length
      ? await q.query(
          `SELECT id, playlist_id, snapshot_id, display_order, is_forced, is_locked,
                  forced_start_at, forced_end_at, created_at, updated_at
             FROM store_playlist_items WHERE playlist_id=ANY($1::uuid[]) ORDER BY playlist_id, display_order, id`,
          [storePlaylistIds],
        )
      : [];
    const tablets = await q.query(
      `SELECT id, name, location, is_active, current_screen_set_id, created_at
         FROM store_tablets WHERE organization_id=$1 ORDER BY created_at, id`,
      [c.organizationId],
    );
    const tabletDevices = await q.query(
      `SELECT id, name, current_location_id, last_seen_at, is_active, created_at, updated_at
         FROM store_tablet_devices WHERE organization_id=$1 ORDER BY created_at, id`,
      [c.organizationId],
    );
    const storeContents = await q.query(
      `SELECT id, snapshot_id, source_type, title, content_json, tags, created_at, updated_at,
              author_role, visibility_scope, source_metadata, workspace_status
         FROM kpa_store_contents WHERE organization_id=$1 ORDER BY created_at, id`,
      [c.organizationId],
    );
    const executionAssets = await q.query(
      `SELECT id, title, description, file_url, file_name, file_size, mime_type, category, asset_type,
              usage_type, url, html_content, source_type, tags, created_at, updated_at
         FROM store_execution_assets WHERE organization_id=$1 ORDER BY created_at, id`,
      [c.organizationId],
    );
    const pops = await q.query(
      `SELECT id, service_key, title, slug, excerpt, content, status, created_at, updated_at
         FROM store_pops
        WHERE store_id=$1 AND service_key=ANY($2::text[]) AND author_role='store'
        ORDER BY created_at, id`,
      [c.organizationId, cfg.contentKeys],
    );
    const blogs = await q.query(
      `SELECT id, service_key, title, slug, excerpt, content, status, created_at, updated_at
         FROM store_blog_posts
        WHERE store_id=$1 AND service_key=ANY($2::text[]) AND author_role='store'
        ORDER BY created_at, id`,
      [c.organizationId, cfg.contentKeys],
    );
    const videos = await q.query(
      `SELECT id, service_key, title, slug, description, video_url, status, copied_from_id, created_at, updated_at
         FROM store_videos
        WHERE store_id=$1 AND service_key=ANY($2::text[]) AND author_role='store'
        ORDER BY created_at, id`,
      [c.organizationId, cfg.contentKeys],
    );
    const qr = await q.query(
      `SELECT id, title, description, landing_type, landing_target_id, content_source, slug, is_active,
              consultation_cta_enabled, consultation_cta_label, created_at, updated_at
         FROM store_qr_codes WHERE organization_id=$1 ORDER BY created_at, id`,
      [c.organizationId],
    );
    const multilingualGroups = await q.query(
      `SELECT id, service_key, target_kind, target_id, content_key, title, default_locale, source_type,
              source_ref_id, public_key, status, metadata, created_at, updated_at
         FROM store_multilingual_product_content_groups
        WHERE organization_id=$1 AND (service_key IS NULL OR service_key=ANY($2::text[]))
        ORDER BY created_at, id`,
      [c.organizationId, cfg.contentKeys],
    );
    const groupIds = multilingualGroups.map((r: any) => r.id);
    const multilingualPages = groupIds.length
      ? await q.query(
          `SELECT id, group_id, locale, title, summary, content_format, content, assets, buttons, status,
                  is_default, sort_order, metadata, created_at, updated_at
             FROM store_multilingual_product_content_pages
            WHERE group_id=ANY($1::uuid[]) ORDER BY group_id, sort_order, id`,
          [groupIds],
        )
      : [];

    const payload = {
      format: 'O4O_STORE_OWNER_DATA_RETURN_V1',
      generatedAt: new Date().toISOString(),
      caseId: c.id,
      serviceKey: c.serviceKey,
      organization,
      data: {
        productListings: listings,
        localProducts,
        snapshots,
        storePlaylists: { playlists: storePlaylists, items: storePlaylistItems },
        tablets: { locations: tablets, devices: tabletDevices },
        storeContents,
        executionAssets,
        storePops: pops,
        storeBlogPosts: blogs,
        storeVideos: videos,
        qrCodes: qr,
        multilingual: { groups: multilingualGroups, pages: multilingualPages },
      },
    };
    return { ...payload, manifestHash: sha256(payload) };
  }

  async markReturnCompleted(caseId: string): Promise<StoreOwnerTerminationCase> {
    const c = await this.getCase(caseId);
    if (!c.returnRequested) {
      throw new StoreOwnerTerminationError('RETURN_NOT_REQUESTED', '이 종료 건에는 정보 반환 요청이 없습니다.', 409);
    }
    if (['cancelled', 'purge_completed'].includes(c.status)) {
      throw new StoreOwnerTerminationError('TERMINATION_CASE_CLOSED', '이미 종료된 건입니다.', 409);
    }
    const rows = await this.dataSource.query(
      `UPDATE store_owner_termination_cases
          SET return_completed_at=COALESCE(return_completed_at,NOW()),
              status='termination_scheduled', updated_at=NOW(), failure_reason=NULL
        WHERE id=$1 RETURNING *`,
      [caseId],
    );
    return mapCase(rows[0]);
  }

  async cancelCase(caseId: string): Promise<StoreOwnerTerminationCase> {
    const c = await this.getCase(caseId);
    if (['terminated', 'purge_completed'].includes(c.status)) {
      throw new StoreOwnerTerminationError('TERMINATION_ALREADY_EFFECTIVE', '이미 계약 종료가 적용된 건은 취소할 수 없습니다.', 409);
    }
    const rows = await this.dataSource.query(
      `UPDATE store_owner_termination_cases
          SET status='cancelled', cancelled_at=NOW(), updated_at=NOW()
        WHERE id=$1 RETURNING *`,
      [caseId],
    );
    return mapCase(rows[0]);
  }

  async terminateCase(caseId: string, now = new Date()): Promise<StoreOwnerTerminationCase> {
    const c = await this.getCase(caseId);
    const cfg = configFor(c.serviceKey);
    if (c.status === 'cancelled' || c.status === 'purge_completed') return c;
    if (c.returnRequested && !c.returnCompletedAt) {
      throw new StoreOwnerTerminationError('RETURN_NOT_COMPLETED', '정보 반환 요청이 완료되지 않아 계약 종료를 적용할 수 없습니다.', 409);
    }
    const effectiveAt = c.terminationEffectiveAt ? new Date(c.terminationEffectiveAt) : now;
    if (effectiveAt.getTime() > now.getTime()) {
      throw new StoreOwnerTerminationError('TERMINATION_NOT_DUE', '아직 계약 종료 예정일이 되지 않았습니다.', 409);
    }

    await this.dataSource.transaction(async (m) => {
      // 일반 서비스 회원자격은 유지한다. 매장 경영자 역할과 해당 Store↔Service 연결만 종료한다.
      await m.query(
        `UPDATE role_assignments SET is_active=false, updated_at=NOW()
          WHERE user_id=$1 AND role=$2 AND is_active=true`,
        [c.userId, cfg.role],
      );
      await m.query(
        `UPDATE organization_service_enrollments SET status='inactive', updated_at=NOW()
          WHERE organization_id=$1 AND service_code=$2 AND status='active'`,
        [c.organizationId, c.serviceKey],
      );
      await this.disablePublicSurface(m, c);
      await m.query(
        `UPDATE store_owner_termination_cases
            SET status='terminated',
                termination_effective_at=COALESCE(termination_effective_at,$2::timestamptz),
                purge_due_at=COALESCE(purge_due_at,$2::timestamptz + interval '7 days'),
                updated_at=NOW(), failure_reason=NULL
          WHERE id=$1`,
        [c.id, effectiveAt.toISOString()],
      );
    });
    return this.getCase(caseId);
  }

  private async disablePublicSurface(m: EntityManager, c: StoreOwnerTerminationCase): Promise<void> {
    const cfg = configFor(c.serviceKey);
    await m.query(
      `UPDATE platform_store_slugs SET is_active=false, updated_at=NOW()
        WHERE store_id=$1 AND service_key=ANY($2::text[])`,
      [c.organizationId, cfg.slugKeys],
    );
    await m.query(
      `UPDATE store_pops SET status='archived', updated_at=NOW()
        WHERE store_id=$1 AND service_key=ANY($2::text[]) AND author_role='store' AND status<>'archived'`,
      [c.organizationId, cfg.contentKeys],
    );
    await m.query(
      `UPDATE store_blog_posts SET status='archived', updated_at=NOW()
        WHERE store_id=$1 AND service_key=ANY($2::text[]) AND author_role='store' AND status<>'archived'`,
      [c.organizationId, cfg.contentKeys],
    );
    await m.query(
      `UPDATE store_videos SET status='archived', updated_at=NOW()
        WHERE store_id=$1 AND service_key=ANY($2::text[]) AND author_role='store' AND status<>'archived'`,
      [c.organizationId, cfg.contentKeys],
    );
    await m.query(
      `UPDATE store_pop_documents SET status='archived', updated_at=NOW()
        WHERE organization_id=$1 AND service_key=ANY($2::text[]) AND status<>'archived'`,
      [c.organizationId, cfg.contentKeys],
    );
    await m.query(
      `UPDATE signage_media SET status='archived', "updatedAt"=NOW()
        WHERE "organizationId"=$1 AND "serviceKey"=ANY($2::text[]) AND "deletedAt" IS NULL AND status<>'archived'`,
      [c.organizationId, cfg.contentKeys],
    );
    await m.query(
      `UPDATE signage_playlists SET status='archived', "isPublic"=false, "updatedAt"=NOW()
        WHERE "organizationId"=$1 AND "serviceKey"=ANY($2::text[]) AND "deletedAt" IS NULL AND status<>'archived'`,
      [c.organizationId, cfg.contentKeys],
    );

    const otherStore = await this.hasOtherActiveStoreService(c.organizationId, c.serviceKey, m);
    if (!otherStore) {
      await m.query(`UPDATE store_qr_codes SET is_active=false, updated_at=NOW() WHERE organization_id=$1 AND is_active=true`, [c.organizationId]);
      await m.query(`UPDATE store_playlists SET is_active=false, publish_status='draft', updated_at=NOW() WHERE organization_id=$1 AND is_active=true`, [c.organizationId]);
      await m.query(
        `UPDATE store_tablet_devices
            SET is_active=false, device_token_hash=NULL, pairing_code=NULL, pairing_expires_at=NULL, updated_at=NOW()
          WHERE organization_id=$1 AND is_active=true`,
        [c.organizationId],
      );
      await m.query(
        `UPDATE store_tablet_screen_sets
            SET status='archived', deleted_at=COALESCE(deleted_at,NOW()), updated_at=NOW()
          WHERE organization_id=$1 AND origin='store' AND deleted_at IS NULL`,
        [c.organizationId],
      );
    }
  }

  private async hasOtherActiveStoreService(
    organizationId: string,
    currentService: StoreOwnerContractServiceKey,
    executor: DataSource | EntityManager = this.dataSource,
  ): Promise<boolean> {
    const rows = await executor.query(
      `SELECT 1 FROM organization_service_enrollments
        WHERE organization_id=$1
          AND status='active'
          AND service_code=ANY($2::text[])
          AND service_code<>$3
        LIMIT 1`,
      [organizationId, [...SHARED_STORE_SERVICE_CODES], currentService],
    );
    return rows.length > 0;
  }

  async previewPurge(caseId: string): Promise<PurgePreview> {
    const c = await this.getCase(caseId);
    const cfg = configFor(c.serviceKey);
    const q = this.dataSource;
    const otherStore = await this.hasOtherActiveStoreService(c.organizationId, c.serviceKey);

    const items: PurgeInventoryItem[] = [];
    const add = (key: string, classification: PurgeInventoryItem['classification'], n: number, action: 'DELETE'|'PRESERVE', reason?: string) =>
      items.push({ key, classification, count: n, action, ...(reason ? { reason } : {}) });

    add('store_pops', 'SERVICE_SCOPED', await count(q, `SELECT COUNT(*)::int n FROM store_pops WHERE store_id=$1 AND service_key=ANY($2::text[]) AND author_role='store'`, [c.organizationId,cfg.contentKeys]), 'DELETE');
    add('store_blog_posts', 'SERVICE_SCOPED', await count(q, `SELECT COUNT(*)::int n FROM store_blog_posts WHERE store_id=$1 AND service_key=ANY($2::text[]) AND author_role='store'`, [c.organizationId,cfg.contentKeys]), 'DELETE');
    add('store_videos', 'SERVICE_SCOPED', await count(q, `SELECT COUNT(*)::int n FROM store_videos WHERE store_id=$1 AND service_key=ANY($2::text[]) AND author_role='store'`, [c.organizationId,cfg.contentKeys]), 'DELETE');
    add('store_pop_documents', 'SERVICE_SCOPED', await count(q, `SELECT COUNT(*)::int n FROM store_pop_documents WHERE organization_id=$1 AND service_key=ANY($2::text[])`, [c.organizationId,cfg.contentKeys]), 'DELETE');
    add('organization_product_listings', 'SERVICE_SCOPED', await count(q, `SELECT COUNT(*)::int n FROM organization_product_listings WHERE organization_id=$1 AND service_key=ANY($2::text[])`, [c.organizationId,cfg.contentKeys]), 'DELETE');
    add('store_multilingual_product_content_groups(service)', 'SERVICE_SCOPED', await count(q, `SELECT COUNT(*)::int n FROM store_multilingual_product_content_groups WHERE organization_id=$1 AND service_key=ANY($2::text[])`, [c.organizationId,cfg.contentKeys]), 'DELETE');
    add('signage_media', 'SERVICE_SCOPED', await count(q, `SELECT COUNT(*)::int n FROM signage_media WHERE "organizationId"=$1 AND "serviceKey"=ANY($2::text[])`, [c.organizationId,cfg.contentKeys]), 'DELETE');
    add('signage_playlists', 'SERVICE_SCOPED', await count(q, `SELECT COUNT(*)::int n FROM signage_playlists WHERE "organizationId"=$1 AND "serviceKey"=ANY($2::text[])`, [c.organizationId,cfg.contentKeys]), 'DELETE');
    add('platform_store_slugs', 'SERVICE_SCOPED', await count(q, `SELECT COUNT(*)::int n FROM platform_store_slugs WHERE store_id=$1 AND service_key=ANY($2::text[])`, [c.organizationId,cfg.slugKeys]), 'DELETE');

    const sharedAction: 'DELETE'|'PRESERVE' = otherStore ? 'PRESERVE' : 'DELETE';
    const sharedReason = otherStore ? '다른 활성 Store 서비스가 동일 organization을 사용 중' : undefined;
    for (const [key, sql] of [
      ['store_local_products', `SELECT COUNT(*)::int n FROM store_local_products WHERE organization_id=$1`],
      ['o4o_asset_snapshots', `SELECT COUNT(*)::int n FROM o4o_asset_snapshots WHERE organization_id=$1`],
      ['kpa_store_contents', `SELECT COUNT(*)::int n FROM kpa_store_contents WHERE organization_id=$1`],
      ['store_execution_assets', `SELECT COUNT(*)::int n FROM store_execution_assets WHERE organization_id=$1`],
      ['store_qr_codes', `SELECT COUNT(*)::int n FROM store_qr_codes WHERE organization_id=$1`],
      ['store_playlists', `SELECT COUNT(*)::int n FROM store_playlists WHERE organization_id=$1`],
      ['store_playlist_items', `SELECT COUNT(*)::int n FROM store_playlist_items WHERE playlist_id IN (SELECT id FROM store_playlists WHERE organization_id=$1)`],
      ['store_tablet_devices', `SELECT COUNT(*)::int n FROM store_tablet_devices WHERE organization_id=$1`],
      ['store_tablet_screen_sets', `SELECT COUNT(*)::int n FROM store_tablet_screen_sets WHERE organization_id=$1 AND origin='store'`],
      ['store_multilingual_product_content_groups(shared)', `SELECT COUNT(*)::int n FROM store_multilingual_product_content_groups WHERE organization_id=$1 AND service_key IS NULL`],
    ] as const) {
      add(key, 'ORGANIZATION_SHARED', await count(q, sql, [c.organizationId]), sharedAction, sharedReason);
    }

    add('supplier/operator originals', 'SUPPLIER_OWNED', 0, 'PRESERVE', '공급자·운영자 원본은 매장 계약 종료 파기 대상이 아님');
    add('audit/security logs', 'SYSTEM_LOG', 0, 'PRESERVE', '별도 보유기간 정책 적용');

    const mediaCandidates = otherStore ? 0 : await count(
      q,
      `SELECT COUNT(*)::int n
         FROM store_execution_assets sea
         JOIN media_assets ma ON ma.url=sea.file_url
        WHERE sea.organization_id=$1 AND sea.file_url IS NOT NULL
          AND ma.uploaded_by=$2
          AND ma.service_key=ANY($3::text[])`,
      [c.organizationId, c.userId, cfg.contentKeys],
    );

    return {
      caseId: c.id,
      serviceKey: c.serviceKey,
      organizationId: c.organizationId,
      hasOtherActiveStoreService: otherStore,
      items,
      totalDeleteRows: items.filter(i=>i.action==='DELETE').reduce((sum,i)=>sum+i.count,0),
      mediaCandidates,
    };
  }

  private async hasExternalReference(url: string, organizationId: string): Promise<boolean> {
    const [row] = await this.dataSource.query(
      `SELECT (
          EXISTS (SELECT 1 FROM store_execution_assets WHERE organization_id<>$1 AND (file_url=$2 OR html_content ILIKE '%' || $2 || '%'))
          OR EXISTS (SELECT 1 FROM store_local_products WHERE organization_id<>$1 AND (
               images::text ILIKE '%' || $2 || '%' OR gallery_images::text ILIKE '%' || $2 || '%'
               OR COALESCE(thumbnail_url,'')=$2 OR COALESCE(detail_html,'') ILIKE '%' || $2 || '%'))
          OR EXISTS (SELECT 1 FROM kpa_store_contents WHERE organization_id<>$1 AND content_json::text ILIKE '%' || $2 || '%')
          OR EXISTS (SELECT 1 FROM store_pop_documents WHERE organization_id<>$1 AND fields::text ILIKE '%' || $2 || '%')
          OR EXISTS (
               SELECT 1 FROM store_multilingual_product_content_pages p
               JOIN store_multilingual_product_content_groups g ON g.id=p.group_id
               WHERE g.organization_id<>$1 AND (p.content::text ILIKE '%' || $2 || '%' OR p.assets::text ILIKE '%' || $2 || '%'))
          OR EXISTS (
               SELECT 1 FROM store_tablet_screen_blocks b
               JOIN store_tablet_screen_sets s ON s.id=b.screen_set_id
               WHERE s.organization_id<>$1 AND b.config::text ILIKE '%' || $2 || '%')
          OR EXISTS (SELECT 1 FROM signage_media WHERE "organizationId" IS DISTINCT FROM $1 AND (
               COALESCE("sourceUrl",'')=$2 OR COALESCE("thumbnailUrl",'')=$2 OR COALESCE(content,'') ILIKE '%' || $2 || '%'))
        ) AS used_elsewhere`,
      [organizationId, url],
    );
    return !!row?.used_elsewhere;
  }

  private async purgeOwnedMedia(c: StoreOwnerTerminationCase): Promise<void> {
    const cfg = configFor(c.serviceKey);
    const rows = await this.dataSource.query(
      `SELECT DISTINCT ma.id, ma.url
         FROM store_execution_assets sea
         JOIN media_assets ma ON ma.url=sea.file_url
        WHERE sea.organization_id=$1
          AND sea.file_url IS NOT NULL
          AND ma.uploaded_by=$2
          AND ma.service_key=ANY($3::text[])`,
      [c.organizationId, c.userId, cfg.contentKeys],
    );
    const mediaService = new MediaLibraryService(this.dataSource);
    for (const row of rows) {
      if (await this.hasExternalReference(row.url, c.organizationId)) continue;
      try {
        await mediaService.deleteAsset(row.id);
      } catch (error: any) {
        if (error?.code === 'MEDIA_STORAGE_DELETE_FAILED' || error?.message === 'MEDIA_STORAGE_DELETE_FAILED') {
          throw new StoreOwnerTerminationError('PURGE_INCOMPLETE', 'GCS 객체 삭제 실패로 파기를 완료하지 못했습니다.', 500);
        }
        // 사용 중/파생관계 보호는 "공유 또는 보호 자산"으로 간주하고 물리 파일을 보존한다.
        logger.warn('[store-owner-termination] media preserved by reference guard', {
          caseId: c.id,
          mediaId: row.id,
          code: error?.code ?? error?.message ?? 'MEDIA_GUARD',
        });
      }
    }
  }

  async purgeCase(caseId: string, options: { dryRun?: boolean; now?: Date } = {}): Promise<PurgePreview> {
    const preview = await this.previewPurge(caseId);
    if (options.dryRun !== false) return preview;

    const c = await this.getCase(caseId);
    if (!['terminated','failed'].includes(c.status)) {
      throw new StoreOwnerTerminationError('PURGE_NOT_ALLOWED', '계약 종료가 적용된 건만 파기할 수 있습니다.', 409);
    }
    const now = options.now ?? new Date();
    if (!c.purgeDueAt || new Date(c.purgeDueAt).getTime() > now.getTime()) {
      throw new StoreOwnerTerminationError('PURGE_NOT_DUE', '아직 7일 파기 기한이 도래하지 않았습니다.', 409);
    }

    try {
      if (!preview.hasOtherActiveStoreService) await this.purgeOwnedMedia(c);
      const cfg = configFor(c.serviceKey);

      await this.dataSource.transaction(async (m) => {
        // 서비스 전용 매장 사본/출력물
        await m.query(`DELETE FROM signage_schedules WHERE "organizationId"=$1 AND "serviceKey"=ANY($2::text[])`, [c.organizationId,cfg.contentKeys]);
        await m.query(`DELETE FROM signage_playlist_items WHERE "playlistId" IN (SELECT id FROM signage_playlists WHERE "organizationId"=$1 AND "serviceKey"=ANY($2::text[]))`, [c.organizationId,cfg.contentKeys]);
        await m.query(`DELETE FROM signage_playlists WHERE "organizationId"=$1 AND "serviceKey"=ANY($2::text[])`, [c.organizationId,cfg.contentKeys]);
        await m.query(
          `DELETE FROM signage_media sm
            WHERE sm."organizationId"=$1
              AND sm."serviceKey"=ANY($2::text[])
              AND NOT EXISTS (SELECT 1 FROM signage_playlist_items spi WHERE spi."mediaId"=sm.id)`,
          [c.organizationId,cfg.contentKeys],
        );
        await m.query(`DELETE FROM store_pop_documents WHERE organization_id=$1 AND service_key=ANY($2::text[])`, [c.organizationId,cfg.contentKeys]);
        await m.query(`DELETE FROM store_pops WHERE store_id=$1 AND service_key=ANY($2::text[]) AND author_role='store'`, [c.organizationId,cfg.contentKeys]);
        await m.query(`DELETE FROM store_blog_posts WHERE store_id=$1 AND service_key=ANY($2::text[]) AND author_role='store'`, [c.organizationId,cfg.contentKeys]);
        await m.query(`DELETE FROM store_videos WHERE store_id=$1 AND service_key=ANY($2::text[]) AND author_role='store'`, [c.organizationId,cfg.contentKeys]);
        await m.query(`DELETE FROM store_asset_derivations WHERE organization_id=$1 AND service_key=ANY($2::text[])`, [c.organizationId,cfg.contentKeys]);
        await m.query(`DELETE FROM store_multilingual_product_content_pages WHERE group_id IN (
                          SELECT id FROM store_multilingual_product_content_groups
                           WHERE organization_id=$1 AND service_key=ANY($2::text[]))`, [c.organizationId,cfg.contentKeys]);
        await m.query(`DELETE FROM store_multilingual_product_content_groups WHERE organization_id=$1 AND service_key=ANY($2::text[])`, [c.organizationId,cfg.contentKeys]);
        await m.query(`DELETE FROM organization_product_channels WHERE product_listing_id IN (
                          SELECT id FROM organization_product_listings WHERE organization_id=$1 AND service_key=ANY($2::text[]))`, [c.organizationId,cfg.contentKeys]);
        await m.query(`DELETE FROM organization_product_listings WHERE organization_id=$1 AND service_key=ANY($2::text[])`, [c.organizationId,cfg.contentKeys]);
        await m.query(`DELETE FROM platform_store_slugs WHERE store_id=$1 AND service_key=ANY($2::text[])`, [c.organizationId,cfg.slugKeys]);

        if (c.serviceKey === 'k-cosmetics') {
          // cosmetics local store는 canonical organization 의 service-specific projection.
          const stores = await m.query(`SELECT id FROM cosmetics.cosmetics_stores WHERE organization_id=$1`, [c.organizationId]);
          const storeIds = stores.map((r:any)=>r.id);
          if (storeIds.length) {
            await m.query(`DELETE FROM cosmetics.cosmetics_store_playlist_items WHERE playlist_id IN (
                              SELECT id FROM cosmetics.cosmetics_store_playlists WHERE store_id=ANY($1::uuid[]))`, [storeIds]);
            await m.query(`DELETE FROM cosmetics.cosmetics_store_playlists WHERE store_id=ANY($1::uuid[])`, [storeIds]);
            await m.query(`DELETE FROM cosmetics.cosmetics_store_listings WHERE store_id=ANY($1::uuid[])`, [storeIds]);
            await m.query(`DELETE FROM cosmetics.cosmetics_store_members WHERE store_id=ANY($1::uuid[])`, [storeIds]);
            await m.query(`DELETE FROM cosmetics.cosmetics_stores WHERE id=ANY($1::uuid[])`, [storeIds]);
          }
        }

        if (!preview.hasOtherActiveStoreService) {
          // 조직 공용 Store 데이터 — 마지막 활성 Store 서비스가 끝나는 경우에만 파기한다.
          await m.query(`DELETE FROM store_playlist_items WHERE playlist_id IN (SELECT id FROM store_playlists WHERE organization_id=$1)`, [c.organizationId]);
          await m.query(`DELETE FROM store_playlists WHERE organization_id=$1`, [c.organizationId]);
          await m.query(`DELETE FROM store_tablet_devices WHERE organization_id=$1`, [c.organizationId]);
          await m.query(`UPDATE store_tablets SET current_screen_set_id=NULL WHERE organization_id=$1`, [c.organizationId]);
          await m.query(`DELETE FROM store_tablet_displays WHERE tablet_id IN (SELECT id FROM store_tablets WHERE organization_id=$1)`, [c.organizationId]);
          await m.query(`DELETE FROM store_tablet_corner_contents WHERE organization_id=$1`, [c.organizationId]);
          await m.query(`DELETE FROM store_tablet_screen_blocks WHERE screen_set_id IN (SELECT id FROM store_tablet_screen_sets WHERE organization_id=$1 AND origin='store')`, [c.organizationId]);
          await m.query(`DELETE FROM store_qr_codes WHERE organization_id=$1`, [c.organizationId]);
          await m.query(`DELETE FROM store_tablet_screen_sets WHERE organization_id=$1 AND origin='store'`, [c.organizationId]);
          await m.query(`DELETE FROM store_tablets WHERE organization_id=$1`, [c.organizationId]);
          await m.query(`DELETE FROM store_multilingual_product_content_pages WHERE group_id IN (
                            SELECT id FROM store_multilingual_product_content_groups WHERE organization_id=$1)`, [c.organizationId]);
          await m.query(`DELETE FROM store_multilingual_product_content_groups WHERE organization_id=$1`, [c.organizationId]);
          await m.query(`DELETE FROM store_asset_derivations WHERE organization_id=$1`, [c.organizationId]);
          await m.query(`DELETE FROM kpa_store_contents WHERE organization_id=$1`, [c.organizationId]);
          await m.query(`DELETE FROM store_execution_assets WHERE organization_id=$1`, [c.organizationId]);
          await m.query(`DELETE FROM o4o_asset_snapshots WHERE organization_id=$1`, [c.organizationId]);
          await m.query(`DELETE FROM store_local_products WHERE organization_id=$1`, [c.organizationId]);

          const [activeAny] = await m.query(
            `SELECT 1 FROM organization_service_enrollments WHERE organization_id=$1 AND status='active' LIMIT 1`,
            [c.organizationId],
          );
          if (!activeAny) {
            // FK identity row는 보존하되 Store 개인정보/사업장 정보는 제거한다.
            await m.query(
              `UPDATE organizations
                  SET name='종료된 매장', address=NULL, address_detail=NULL, phone=NULL, business_number=NULL,
                      storefront_config='{}'::jsonb, storefront_blocks=NULL, "isActive"=false, "updatedAt"=NOW()
                WHERE id=$1`,
              [c.organizationId],
            );
            await m.query(
              `UPDATE organization_members SET "leftAt"=COALESCE("leftAt",NOW()), "updatedAt"=NOW()
                WHERE organization_id=$1 AND user_id=$2 AND role='owner' AND "leftAt" IS NULL`,
              [c.organizationId,c.userId],
            );
          }
        }

        await m.query(
          `UPDATE store_owner_termination_cases
              SET status='purge_completed', purge_completed_at=NOW(), failure_reason=NULL, updated_at=NOW()
            WHERE id=$1`,
          [c.id],
        );
      });
    } catch (error: any) {
      const code = error instanceof StoreOwnerTerminationError ? error.code : 'PURGE_INCOMPLETE';
      await this.dataSource.query(
        `UPDATE store_owner_termination_cases
            SET status='failed', failure_reason=$2, updated_at=NOW()
          WHERE id=$1`,
        [c.id, String(code).slice(0,500)],
      );
      throw error;
    }
    return this.previewPurge(caseId);
  }

  /**
   * Scheduler owns termination + overdue detection only.
   * Destructive purge requires the admin API's explicit {mode:'apply'} operation.
   * This prevents a newly-created production case from turning into an unattended delete job.
   */
  async runDueCases(now = new Date()): Promise<{ terminated: number; overduePurges: number; failed: number }> {
    let terminated = 0;
    let failed = 0;

    const dueTermination = await this.dataSource.query(
      `SELECT id FROM store_owner_termination_cases
        WHERE status IN ('termination_scheduled','return_completed')
          AND termination_effective_at<= $1
          AND (return_requested=false OR return_completed_at IS NOT NULL)
        ORDER BY termination_effective_at, id LIMIT 50`,
      [now.toISOString()],
    );
    for (const row of dueTermination) {
      try { await this.terminateCase(row.id, now); terminated++; }
      catch (error) { failed++; logger.error('[store-owner-termination] scheduled termination failed', { caseId: row.id, error: error instanceof Error ? error.message : String(error) }); }
    }

    const duePurge = await this.dataSource.query(
      `SELECT id FROM store_owner_termination_cases
        WHERE status IN ('terminated','failed')
          AND purge_completed_at IS NULL
          AND purge_due_at<= $1
        ORDER BY purge_due_at, id LIMIT 50`,
      [now.toISOString()],
    );
    if (duePurge.length > 0) {
      logger.warn('[store-owner-termination] purge approval required', {
        overdueCases: duePurge.length,
      });
    }
    return { terminated, overduePurges: duePurge.length, failed };
  }
}

export const storeOwnerTerminationService = new StoreOwnerTerminationService(AppDataSource);
