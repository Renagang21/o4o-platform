import { createHash } from 'node:crypto';
import { Storage } from '@google-cloud/storage';
import type { DataSource, QueryRunner } from 'typeorm';
import {
  STORE_OWNER_AGREEMENT_ROLE_BY_SERVICE,
  type StoreOwnerAgreementServiceKey,
  isStoreOwnerAgreementServiceKey,
} from '../../common/auth/store-owner-agreement.policy.js';

const PURGE_DAYS = 7;
const MEDIA_BUCKET = process.env.GCS_MEDIA_LIBRARY_BUCKET || 'o4o-media-library';

type CaseStatus =
  | 'requested' | 'return_pending' | 'return_completed' | 'termination_scheduled'
  | 'terminated' | 'purge_completed' | 'cancelled' | 'failed';

export interface StoreOwnerTerminationCase {
  id: string;
  serviceKey: StoreOwnerAgreementServiceKey;
  organizationId: string;
  userId: string;
  status: CaseStatus;
  requestedAt: string;
  requestedBy: string | null;
  returnRequested: boolean;
  returnCompletedAt: string | null;
  terminationEffectiveAt: string;
  purgeDueAt: string;
  purgeCompletedAt: string | null;
  cancelledAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PurgeEntry {
  key: string;
  classification: 'SERVICE_SCOPED' | 'ORGANIZATION_SHARED';
  count: number;
}

export interface StoreOwnerPurgePlan {
  caseId: string;
  serviceKey: StoreOwnerAgreementServiceKey;
  organizationId: string;
  otherActiveServices: string[];
  sharedPurgeEligible: boolean;
  entries: PurgeEntry[];
  gcsObjectCount: number;
  totalRows: number;
}

const aliases = (serviceKey: StoreOwnerAgreementServiceKey): string[] => {
  if (serviceKey === 'kpa-society') return ['kpa-society', 'kpa'];
  if (serviceKey === 'k-cosmetics') return ['k-cosmetics', 'cosmetics'];
  return ['pharmacy-hub'];
};

const asCase = (row: any): StoreOwnerTerminationCase => ({
  id: row.id,
  serviceKey: row.service_key,
  organizationId: row.organization_id,
  userId: row.user_id,
  status: row.status,
  requestedAt: row.requested_at,
  requestedBy: row.requested_by,
  returnRequested: row.return_requested,
  returnCompletedAt: row.return_completed_at,
  terminationEffectiveAt: row.termination_effective_at,
  purgeDueAt: row.purge_due_at,
  purgeCompletedAt: row.purge_completed_at,
  cancelledAt: row.cancelled_at,
  failureReason: row.failure_reason,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

function collectBucketUrls(value: unknown, out: Set<string>) {
  if (typeof value === 'string') {
    const urls = value.match(/https:\/\/storage\.googleapis\.com\/[^\s"'<>]+|https:\/\/[^\s"'<>]+\.storage\.googleapis\.com\/[^\s"'<>]+|gs:\/\/[^\s"'<>]+/g) ?? [];
    for (const u of urls) out.add(u.replace(/[),.;]+$/, ''));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectBucketUrls(item, out);
    return;
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) collectBucketUrls(v, out);
  }
}

function toObjectName(url: string): string | null {
  try {
    if (url.startsWith('gs://')) {
      const noScheme = url.slice(5);
      const slash = noScheme.indexOf('/');
      if (slash < 0 || noScheme.slice(0, slash) !== MEDIA_BUCKET) return null;
      return decodeURIComponent(noScheme.slice(slash + 1));
    }
    const parsed = new URL(url);
    if (parsed.hostname === 'storage.googleapis.com') {
      const [bucket, ...rest] = parsed.pathname.replace(/^\//, '').split('/');
      if (bucket !== MEDIA_BUCKET || rest.length === 0) return null;
      return decodeURIComponent(rest.join('/'));
    }
    if (parsed.hostname === `${MEDIA_BUCKET}.storage.googleapis.com`) {
      return decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    }
  } catch {
    return null;
  }
  return null;
}

export class StoreOwnerTerminationService {
  private storage = new Storage();

  constructor(private readonly dataSource: DataSource) {}

  private async getCase(id: string, q: DataSource | QueryRunner = this.dataSource): Promise<StoreOwnerTerminationCase> {
    const rows = await q.query(
      `SELECT * FROM store_owner_termination_cases WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (!rows[0]) throw Object.assign(new Error('종료 case를 찾을 수 없습니다.'), { statusCode: 404, code: 'TERMINATION_CASE_NOT_FOUND' });
    return asCase(rows[0]);
  }

  async list(serviceKey: string): Promise<StoreOwnerTerminationCase[]> {
    if (!isStoreOwnerAgreementServiceKey(serviceKey)) throw Object.assign(new Error('지원하지 않는 서비스입니다.'), { statusCode: 400 });
    const rows = await this.dataSource.query(
      `SELECT * FROM store_owner_termination_cases WHERE service_key = $1 ORDER BY created_at DESC`,
      [serviceKey],
    );
    return rows.map(asCase);
  }

  async create(input: {
    serviceKey: string;
    organizationId: string;
    userId: string;
    requestedBy: string | null;
    returnRequested: boolean;
    terminationEffectiveAt: Date;
  }): Promise<StoreOwnerTerminationCase> {
    if (!isStoreOwnerAgreementServiceKey(input.serviceKey)) {
      throw Object.assign(new Error('지원하지 않는 서비스입니다.'), { statusCode: 400, code: 'UNSUPPORTED_SERVICE' });
    }
    if (!(input.terminationEffectiveAt instanceof Date) || Number.isNaN(input.terminationEffectiveAt.getTime())) {
      throw Object.assign(new Error('유효한 계약 종료일이 필요합니다.'), { statusCode: 400, code: 'INVALID_TERMINATION_DATE' });
    }

    const role = STORE_OWNER_AGREEMENT_ROLE_BY_SERVICE[input.serviceKey];
    const eligibility = await this.dataSource.query(
      `SELECT 1
         FROM organization_members om
         JOIN service_memberships sm ON sm.user_id = om.user_id
         JOIN role_assignments ra ON ra.user_id = om.user_id
         JOIN organization_service_enrollments ose ON ose.organization_id = om.organization_id
        WHERE om.user_id = $1 AND om.organization_id = $2 AND om."leftAt" IS NULL
          AND sm.service_key = $3 AND sm.status = 'active'
          AND ra.role = $4 AND ra.is_active = true
          AND ose.service_code = $3 AND ose.status = 'active'
        LIMIT 1`,
      [input.userId, input.organizationId, input.serviceKey, role],
    );
    if (eligibility.length === 0) {
      throw Object.assign(new Error('해당 매장의 활성 매장 경영자 계약관계를 확인할 수 없습니다.'), {
        statusCode: 409,
        code: 'STORE_OWNER_TERMINATION_SCOPE_INVALID',
      });
    }

    const due = new Date(input.terminationEffectiveAt.getTime() + PURGE_DAYS * 24 * 60 * 60 * 1000);
    try {
      const rows = await this.dataSource.query(
        `INSERT INTO store_owner_termination_cases
           (service_key, organization_id, user_id, status, requested_by, return_requested,
            termination_effective_at, purge_due_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          input.serviceKey,
          input.organizationId,
          input.userId,
          input.returnRequested ? 'return_pending' : 'termination_scheduled',
          input.requestedBy,
          input.returnRequested,
          input.terminationEffectiveAt,
          due,
        ],
      );
      return asCase(rows[0]);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw Object.assign(new Error('이미 진행 중인 종료 case가 있습니다.'), { statusCode: 409, code: 'TERMINATION_CASE_ALREADY_OPEN' });
      }
      throw error;
    }
  }

  async markReturnCompleted(id: string): Promise<StoreOwnerTerminationCase> {
    const rows = await this.dataSource.query(
      `UPDATE store_owner_termination_cases
          SET return_completed_at = NOW(),
              status = CASE WHEN termination_effective_at <= NOW() THEN 'return_completed' ELSE 'termination_scheduled' END,
              updated_at = NOW(),
              failure_reason = NULL
        WHERE id = $1 AND status IN ('return_pending','requested','failed')
        RETURNING *`,
      [id],
    );
    if (!rows[0]) return this.getCase(id);
    return asCase(rows[0]);
  }

  async exportPackage(id: string) {
    const c = await this.getCase(id);
    const keys = aliases(c.serviceKey);
    const [org, enrollment, businessInfo, storeProducts, productProfiles, localProducts, listings, snapshots,
      executionAssets, derivations, blogs, pops, popDocs, videos, qrs, qrPlacements, tablets, screenSets,
      playlists] = await Promise.all([
      this.dataSource.query(
        `SELECT id,name,code,type,address,address_detail,phone,description,business_number,storefront_config,template_profile,storefront_blocks
           FROM organizations WHERE id=$1`, [c.organizationId]),
      this.dataSource.query(
        `SELECT service_code,status,enrolled_at,config FROM organization_service_enrollments
          WHERE organization_id=$1 AND service_code=$2`, [c.organizationId, c.serviceKey]),
      this.dataSource.query(`SELECT "businessInfo" FROM users WHERE id=$1`, [c.userId]),
      this.dataSource.query(`SELECT * FROM store_products WHERE organization_id=$1 ORDER BY created_at`, [c.organizationId]),
      this.dataSource.query(`SELECT * FROM store_product_profiles WHERE organization_id=$1 ORDER BY created_at`, [c.organizationId]),
      this.dataSource.query(`SELECT * FROM store_local_products WHERE organization_id=$1 ORDER BY created_at`, [c.organizationId]),
      this.dataSource.query(`SELECT * FROM organization_product_listings WHERE organization_id=$1 AND service_key = ANY($2) ORDER BY created_at`, [c.organizationId, keys]),
      this.dataSource.query(`SELECT * FROM o4o_asset_snapshots WHERE organization_id=$1 ORDER BY created_at`, [c.organizationId]),
      this.dataSource.query(`SELECT * FROM store_execution_assets WHERE organization_id=$1 ORDER BY created_at`, [c.organizationId]),
      this.dataSource.query(`SELECT * FROM store_asset_derivations WHERE organization_id=$1 AND service_key = ANY($2) ORDER BY created_at`, [c.organizationId, keys]),
      this.dataSource.query(`SELECT * FROM store_blog_posts WHERE store_id=$1 AND service_key = ANY($2) AND author_role='store' ORDER BY created_at`, [c.organizationId, keys]),
      this.dataSource.query(`SELECT * FROM store_pops WHERE store_id=$1 AND service_key = ANY($2) AND author_role='store' ORDER BY created_at`, [c.organizationId, keys]),
      this.dataSource.query(`SELECT * FROM store_pop_documents WHERE organization_id=$1 AND service_key = ANY($2) ORDER BY created_at`, [c.organizationId, keys]),
      this.dataSource.query(`SELECT * FROM store_videos WHERE store_id=$1 AND service_key = ANY($2) AND author_role='store' ORDER BY created_at`, [c.organizationId, keys]),
      this.dataSource.query(`SELECT * FROM store_qr_codes WHERE organization_id=$1 ORDER BY created_at`, [c.organizationId]),
      this.dataSource.query(`SELECT * FROM store_qr_placements WHERE organization_id=$1 ORDER BY created_at`, [c.organizationId]),
      this.dataSource.query(`SELECT * FROM store_tablets WHERE organization_id=$1 ORDER BY created_at`, [c.organizationId]),
      this.dataSource.query(`SELECT * FROM store_tablet_screen_sets WHERE organization_id=$1 AND origin='store' ORDER BY created_at`, [c.organizationId]),
      this.dataSource.query(`SELECT * FROM store_playlists WHERE organization_id=$1 ORDER BY created_at`, [c.organizationId]),
    ]);

    const data = {
      generatedAt: new Date().toISOString(),
      caseId: c.id,
      serviceKey: c.serviceKey,
      organizationId: c.organizationId,
      categories: {
        store: { organization: org[0] ?? null, enrollment: enrollment[0] ?? null, businessInfo: businessInfo[0]?.businessInfo ?? null },
        products: { storeProducts, productProfiles, localProducts, listings },
        storeCopies: { snapshots, derivations },
        materials: { executionAssets, blogs, pops, popDocs, videos, qrs, qrPlacements, tablets, screenSets, playlists },
      },
    };
    const counts = Object.fromEntries(Object.entries(data.categories).map(([key, value]) => [
      key,
      Object.values(value as Record<string, any>).reduce((n, v) => n + (Array.isArray(v) ? v.length : v ? 1 : 0), 0),
    ]));
    const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return { manifest: { generatedAt: data.generatedAt, counts, sha256: hash }, data };
  }

  private async otherActiveServices(c: StoreOwnerTerminationCase): Promise<string[]> {
    const rows = await this.dataSource.query(
      `SELECT service_code FROM organization_service_enrollments
        WHERE organization_id=$1 AND status='active' AND service_code <> $2
        ORDER BY service_code`,
      [c.organizationId, c.serviceKey],
    );
    return rows.map((r: any) => r.service_code);
  }

  private async targetEnrollmentExists(c: StoreOwnerTerminationCase): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT 1 FROM organization_service_enrollments
        WHERE organization_id=$1 AND service_code=$2 LIMIT 1`,
      [c.organizationId, c.serviceKey],
    );
    return rows.length > 0;
  }

  private async count(sql: string, params: unknown[]): Promise<number> {
    const rows = await this.dataSource.query(sql, params);
    return Number(rows[0]?.count ?? 0);
  }

  private async collectGcsObjects(c: StoreOwnerTerminationCase, sharedPurgeEligible: boolean): Promise<string[]> {
    if (!sharedPurgeEligible) return [];
    const [assets, localProducts, tablets] = await Promise.all([
      this.dataSource.query(
        `SELECT file_url,url FROM store_execution_assets WHERE organization_id=$1`, [c.organizationId]),
      this.dataSource.query(
        `SELECT images,thumbnail_url,gallery_images FROM store_local_products WHERE organization_id=$1`, [c.organizationId]),
      this.dataSource.query(
        `SELECT idle_playlist_items FROM store_tablets WHERE organization_id=$1`, [c.organizationId]),
    ]);
    const urls = new Set<string>();
    collectBucketUrls(assets, urls);
    collectBucketUrls(localProducts, urls);
    collectBucketUrls(tablets, urls);
    const objects = new Set<string>();
    for (const url of urls) {
      const object = toObjectName(url);
      if (object) objects.add(object);
    }
    return Array.from(objects);
  }

  async buildPurgePlan(id: string): Promise<StoreOwnerPurgePlan> {
    const c = await this.getCase(id);
    const keys = aliases(c.serviceKey);
    const targetEnrollment = await this.targetEnrollmentExists(c);
    if (!targetEnrollment) {
      throw Object.assign(new Error('대상 서비스 enrollment를 확인할 수 없어 공용 데이터 경계를 판정할 수 없습니다.'), {
        statusCode: 409, code: 'SHARED_SCOPE_UNRESOLVED',
      });
    }
    const otherActiveServices = await this.otherActiveServices(c);
    const sharedPurgeEligible = otherActiveServices.length === 0;

    const serviceQueries: Array<[string, string, unknown[]]> = [
      ['organization_product_channels', `SELECT COUNT(*)::int count FROM organization_product_channels pc JOIN organization_product_listings l ON l.id=pc.product_listing_id WHERE l.organization_id=$1 AND l.service_key=ANY($2)`, [c.organizationId, keys]],
      ['organization_product_listings', `SELECT COUNT(*)::int count FROM organization_product_listings WHERE organization_id=$1 AND service_key=ANY($2)`, [c.organizationId, keys]],
      ['store_asset_derivations', `SELECT COUNT(*)::int count FROM store_asset_derivations WHERE organization_id=$1 AND service_key=ANY($2)`, [c.organizationId, keys]],
      ['store_pop_documents', `SELECT COUNT(*)::int count FROM store_pop_documents WHERE organization_id=$1 AND service_key=ANY($2)`, [c.organizationId, keys]],
      ['store_blog_posts', `SELECT COUNT(*)::int count FROM store_blog_posts WHERE store_id=$1 AND service_key=ANY($2) AND author_role='store'`, [c.organizationId, keys]],
      ['store_pops', `SELECT COUNT(*)::int count FROM store_pops WHERE store_id=$1 AND service_key=ANY($2) AND author_role='store'`, [c.organizationId, keys]],
      ['store_videos', `SELECT COUNT(*)::int count FROM store_videos WHERE store_id=$1 AND service_key=ANY($2) AND author_role='store'`, [c.organizationId, keys]],
    ];
    if (c.serviceKey === 'kpa-society') {
      serviceQueries.push(
        ['kpa_store_content_product_links', `SELECT COUNT(*)::int count FROM kpa_store_content_product_links WHERE organization_id=$1`, [c.organizationId]],
        ['kpa_store_contents', `SELECT COUNT(*)::int count FROM kpa_store_contents WHERE organization_id=$1`, [c.organizationId]],
      );
    }

    const sharedQueries: Array<[string, string, unknown[]]> = [
      ['store_product_profiles', `SELECT COUNT(*)::int count FROM store_product_profiles WHERE organization_id=$1`, [c.organizationId]],
      ['store_products', `SELECT COUNT(*)::int count FROM store_products WHERE organization_id=$1`, [c.organizationId]],
      ['store_local_products', `SELECT COUNT(*)::int count FROM store_local_products WHERE organization_id=$1`, [c.organizationId]],
      ['o4o_asset_snapshots', `SELECT COUNT(*)::int count FROM o4o_asset_snapshots WHERE organization_id=$1`, [c.organizationId]],
      ['store_execution_assets', `SELECT COUNT(*)::int count FROM store_execution_assets WHERE organization_id=$1`, [c.organizationId]],
      ['store_qr_placements', `SELECT COUNT(*)::int count FROM store_qr_placements WHERE organization_id=$1`, [c.organizationId]],
      ['store_qr_codes', `SELECT COUNT(*)::int count FROM store_qr_codes WHERE organization_id=$1`, [c.organizationId]],
      ['store_tablets', `SELECT COUNT(*)::int count FROM store_tablets WHERE organization_id=$1`, [c.organizationId]],
      ['store_tablet_screen_sets', `SELECT COUNT(*)::int count FROM store_tablet_screen_sets WHERE organization_id=$1 AND origin='store'`, [c.organizationId]],
      ['store_playlists', `SELECT COUNT(*)::int count FROM store_playlists WHERE organization_id=$1`, [c.organizationId]],
      ['organization_channels', `SELECT COUNT(*)::int count FROM organization_channels WHERE organization_id=$1`, [c.organizationId]],
    ];

    if (c.serviceKey === 'k-cosmetics') {
      sharedQueries.push(
        ['cosmetics_store_playlists', `SELECT COUNT(*)::int count FROM cosmetics.cosmetics_store_playlists p JOIN cosmetics.cosmetics_stores s ON s.id=p.store_id WHERE s.organization_id=$1`, [c.organizationId]],
        ['cosmetics_stores', `SELECT COUNT(*)::int count FROM cosmetics.cosmetics_stores WHERE organization_id=$1`, [c.organizationId]],
      );
    }

    const entries: PurgeEntry[] = [];
    for (const [key, sql, params] of serviceQueries) {
      entries.push({ key, classification: 'SERVICE_SCOPED', count: await this.count(sql, params) });
    }
    for (const [key, sql, params] of sharedQueries) {
      entries.push({ key, classification: 'ORGANIZATION_SHARED', count: await this.count(sql, params) });
    }
    const objects = await this.collectGcsObjects(c, sharedPurgeEligible);
    return {
      caseId: c.id,
      serviceKey: c.serviceKey,
      organizationId: c.organizationId,
      otherActiveServices,
      sharedPurgeEligible,
      entries,
      gcsObjectCount: objects.length,
      totalRows: entries.reduce((n, e) => n + e.count, 0),
    };
  }

  async terminate(id: string): Promise<StoreOwnerTerminationCase> {
    const c = await this.getCase(id);
    if (new Date(c.terminationEffectiveAt).getTime() > Date.now()) {
      throw Object.assign(new Error('계약 종료일 이전에는 종료 처리할 수 없습니다.'), { statusCode: 409, code: 'TERMINATION_NOT_EFFECTIVE' });
    }
    if (c.returnRequested && !c.returnCompletedAt) {
      throw Object.assign(new Error('반환 요청이 완료되지 않았습니다.'), { statusCode: 409, code: 'RETURN_NOT_COMPLETED' });
    }

    const keys = aliases(c.serviceKey);
    await this.dataSource.transaction(async (m) => {
      // service-scoped public surfaces first
      await m.query(`UPDATE store_blog_posts SET status='archived', updated_at=NOW() WHERE store_id=$1 AND service_key=ANY($2) AND author_role='store'`, [c.organizationId, keys]);
      await m.query(`UPDATE store_pops SET status='archived', updated_at=NOW() WHERE store_id=$1 AND service_key=ANY($2) AND author_role='store'`, [c.organizationId, keys]);
      await m.query(`UPDATE store_videos SET status='archived', updated_at=NOW() WHERE store_id=$1 AND service_key=ANY($2) AND author_role='store'`, [c.organizationId, keys]);
      await m.query(`UPDATE store_pop_documents SET status='archived', updated_at=NOW() WHERE organization_id=$1 AND service_key=ANY($2)`, [c.organizationId, keys]);
      await m.query(`UPDATE organization_service_enrollments SET status='inactive', updated_at=NOW() WHERE organization_id=$1 AND service_code=$2`, [c.organizationId, c.serviceKey]);
      await m.query(
        `UPDATE store_owner_termination_cases SET status='terminated', updated_at=NOW(), failure_reason=NULL WHERE id=$1`,
        [c.id],
      );
    });
    return this.getCase(id);
  }

  private async deleteServiceScoped(m: QueryRunner, c: StoreOwnerTerminationCase) {
    const keys = aliases(c.serviceKey);
    await m.query(`DELETE FROM organization_product_channels WHERE product_listing_id IN (SELECT id FROM organization_product_listings WHERE organization_id=$1 AND service_key=ANY($2))`, [c.organizationId, keys]);
    await m.query(`DELETE FROM organization_product_listings WHERE organization_id=$1 AND service_key=ANY($2)`, [c.organizationId, keys]);
    await m.query(`DELETE FROM store_asset_derivations WHERE organization_id=$1 AND service_key=ANY($2)`, [c.organizationId, keys]);
    await m.query(`DELETE FROM store_pop_documents WHERE organization_id=$1 AND service_key=ANY($2)`, [c.organizationId, keys]);
    await m.query(`DELETE FROM store_blog_posts WHERE store_id=$1 AND service_key=ANY($2) AND author_role='store'`, [c.organizationId, keys]);
    await m.query(`DELETE FROM store_pops WHERE store_id=$1 AND service_key=ANY($2) AND author_role='store'`, [c.organizationId, keys]);
    await m.query(`DELETE FROM store_videos WHERE store_id=$1 AND service_key=ANY($2) AND author_role='store'`, [c.organizationId, keys]);
    if (c.serviceKey === 'kpa-society') {
      await m.query(`DELETE FROM kpa_store_content_product_links WHERE organization_id=$1`, [c.organizationId]);
      await m.query(`DELETE FROM kpa_store_contents WHERE organization_id=$1`, [c.organizationId]);
    }
  }

  private async deleteShared(m: QueryRunner, c: StoreOwnerTerminationCase) {
    if (c.serviceKey === 'k-cosmetics') {
      await m.query(`DELETE FROM cosmetics.cosmetics_store_playlist_items WHERE playlist_id IN (SELECT p.id FROM cosmetics.cosmetics_store_playlists p JOIN cosmetics.cosmetics_stores s ON s.id=p.store_id WHERE s.organization_id=$1)`, [c.organizationId]);
      await m.query(`DELETE FROM cosmetics.cosmetics_store_playlists WHERE store_id IN (SELECT id FROM cosmetics.cosmetics_stores WHERE organization_id=$1)`, [c.organizationId]);
      await m.query(`DELETE FROM cosmetics.cosmetics_store_members WHERE store_id IN (SELECT id FROM cosmetics.cosmetics_stores WHERE organization_id=$1)`, [c.organizationId]);
      await m.query(`DELETE FROM cosmetics.cosmetics_store_listings WHERE store_id IN (SELECT id FROM cosmetics.cosmetics_stores WHERE organization_id=$1)`, [c.organizationId]);
      await m.query(`DELETE FROM cosmetics.cosmetics_stores WHERE organization_id=$1`, [c.organizationId]);
    }
    await m.query(`DELETE FROM store_tablet_displays WHERE tablet_id IN (SELECT id FROM store_tablets WHERE organization_id=$1)`, [c.organizationId]);
    await m.query(`UPDATE store_tablets SET current_screen_set_id=NULL WHERE organization_id=$1`, [c.organizationId]);
    await m.query(`DELETE FROM store_tablet_screen_blocks WHERE screen_set_id IN (SELECT id FROM store_tablet_screen_sets WHERE organization_id=$1 AND origin='store')`, [c.organizationId]);
    await m.query(`DELETE FROM store_tablet_screen_sets WHERE organization_id=$1 AND origin='store'`, [c.organizationId]);
    await m.query(`DELETE FROM store_tablets WHERE organization_id=$1`, [c.organizationId]);
    await m.query(`DELETE FROM store_playlist_items WHERE playlist_id IN (SELECT id FROM store_playlists WHERE organization_id=$1)`, [c.organizationId]);
    await m.query(`DELETE FROM store_playlists WHERE organization_id=$1`, [c.organizationId]);
    await m.query(`DELETE FROM store_qr_placements WHERE organization_id=$1`, [c.organizationId]);
    await m.query(`DELETE FROM store_qr_codes WHERE organization_id=$1`, [c.organizationId]);
    await m.query(`DELETE FROM organization_product_channels WHERE channel_id IN (SELECT id FROM organization_channels WHERE organization_id=$1)`, [c.organizationId]);
    await m.query(`DELETE FROM organization_channels WHERE organization_id=$1`, [c.organizationId]);
    await m.query(`DELETE FROM store_asset_derivations WHERE organization_id=$1`, [c.organizationId]);
    await m.query(`DELETE FROM store_execution_assets WHERE organization_id=$1`, [c.organizationId]);
    await m.query(`DELETE FROM o4o_asset_snapshots WHERE organization_id=$1`, [c.organizationId]);
    await m.query(`DELETE FROM store_product_profiles WHERE organization_id=$1`, [c.organizationId]);
    await m.query(`DELETE FROM store_products WHERE organization_id=$1`, [c.organizationId]);
    await m.query(`DELETE FROM store_local_products WHERE organization_id=$1`, [c.organizationId]);
    // 마지막 활성 매장 서비스가 끝난 경우 매장 식별정보를 비식별화한다. 사용자 계정 businessInfo 는 USER_SHARED 라 보존.
    await m.query(
      `UPDATE organizations
          SET name='Deleted Store ' || substring(id::text,1,8),
              "isActive"=false, address=NULL, address_detail=NULL, phone=NULL, description=NULL,
              business_number=NULL, metadata='{}'::jsonb, storefront_config='{}'::jsonb,
              storefront_blocks=NULL, updated_at=NOW()
        WHERE id=$1`,
      [c.organizationId],
    );
  }

  async purge(id: string, apply: boolean): Promise<{ plan: StoreOwnerPurgePlan; deleted: boolean }> {
    const c = await this.getCase(id);
    if (!['terminated', 'failed'].includes(c.status)) {
      throw Object.assign(new Error('종료 완료된 case만 파기할 수 있습니다.'), { statusCode: 409, code: 'TERMINATION_NOT_READY_FOR_PURGE' });
    }
    const plan = await this.buildPurgePlan(id);
    if (!apply) return { plan, deleted: false };

    const gcsObjects = await this.collectGcsObjects(c, plan.sharedPurgeEligible);
    try {
      for (const objectName of gcsObjects) {
        await this.storage.bucket(MEDIA_BUCKET).file(objectName).delete({ ignoreNotFound: true });
      }
    } catch (error) {
      await this.dataSource.query(
        `UPDATE store_owner_termination_cases SET status='failed', failure_reason=$2, updated_at=NOW() WHERE id=$1`,
        [c.id, 'PURGE_INCOMPLETE:GCS_DELETE_FAILED'],
      );
      throw Object.assign(new Error('GCS 파기가 완료되지 않아 DB 파기를 중단했습니다.'), {
        statusCode: 502, code: 'PURGE_INCOMPLETE',
      });
    }

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await this.deleteServiceScoped(runner, c);
      if (plan.sharedPurgeEligible) await this.deleteShared(runner, c);
      await runner.query(`DELETE FROM organization_service_enrollments WHERE organization_id=$1 AND service_code=$2`, [c.organizationId, c.serviceKey]);
      await runner.query(
        `UPDATE store_owner_termination_cases
            SET status='purge_completed', purge_completed_at=NOW(), updated_at=NOW(), failure_reason=NULL
          WHERE id=$1`,
        [c.id],
      );
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      await this.dataSource.query(
        `UPDATE store_owner_termination_cases SET status='failed', failure_reason=$2, updated_at=NOW() WHERE id=$1`,
        [c.id, 'PURGE_INCOMPLETE:DB_DELETE_FAILED_AFTER_GCS'],
      );
      throw error;
    } finally {
      await runner.release();
    }
    const post = await this.buildPurgePlan(id);
    const remainingServiceRows = post.entries.filter((e) => e.classification === 'SERVICE_SCOPED').reduce((n, e) => n + e.count, 0);
    if (remainingServiceRows > 0 || (plan.sharedPurgeEligible && post.entries.filter((e) => e.classification === 'ORGANIZATION_SHARED').some((e) => e.count > 0))) {
      await this.dataSource.query(
        `UPDATE store_owner_termination_cases SET status='failed', failure_reason=$2, updated_at=NOW() WHERE id=$1`,
        [c.id, 'PURGE_INCOMPLETE:POST_ASSERTION_FAILED'],
      );
      throw Object.assign(new Error('파기 후 검증에 실패했습니다.'), { statusCode: 500, code: 'PURGE_INCOMPLETE' });
    }
    return { plan, deleted: true };
  }
}
