/**
 * Store Owner Contract Termination Lifecycle
 *
 * WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1 §5
 *
 * 계약 종료를 "계정 삭제"와 섞지 않는다.
 * - 서비스 계약 종료: enrollment / store_owner role / 공개표면 중지
 * - 반환: A/B/D/E 이용자 정보를 합리적인 JSON package 로 운영자에게 제공
 * - 파기: 종료일 + 7일 이내 active store data 정리
 * - C 공급자 원본 / F 운영·감사로그 / USER_SHARED 계정정보는 파기 대상 아님
 * - 1 Store : N Services 보호: organization-only 자산은 다른 active service 가 있으면 보존
 *
 * production apply 는 operator 가 명시적으로 호출할 때만 실행한다. preview 가 기본이다.
 */

import { createHash } from 'crypto';
import { Storage } from '@google-cloud/storage';
import type { DataSource, EntityManager } from 'typeorm';
import {
  STORE_OWNER_AGREEMENT_SERVICE_KEYS,
  STORE_OWNER_ROLE_BY_SERVICE,
} from '../common/auth/store-owner-agreement.policy.js';

export type StoreOwnerTerminationStatus =
  | 'requested'
  | 'return_pending'
  | 'return_completed'
  | 'termination_scheduled'
  | 'terminated'
  | 'purge_completed'
  | 'cancelled'
  | 'failed';

export interface StoreOwnerTerminationCase {
  id: string;
  serviceKey: string;
  organizationId: string;
  userId: string;
  status: StoreOwnerTerminationStatus;
  requestedAt: Date;
  requestedBy: string;
  returnRequested: boolean;
  returnCompletedAt: Date | null;
  terminationEffectiveAt: Date | null;
  purgeDueAt: Date | null;
  purgeCompletedAt: Date | null;
  cancelledAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreOwnerReturnPackage {
  caseId: string;
  serviceKey: string;
  organizationId: string;
  generatedAt: string;
  categories: Record<string, unknown[]>;
  manifest: {
    categories: Record<string, number>;
    hash: string;
  };
}

export interface StoreOwnerPurgePreview {
  caseId: string;
  serviceKey: string;
  organizationId: string;
  otherActiveServices: string[];
  sharedDataExcluded: boolean;
  counts: Record<string, number>;
  gcs: {
    candidateCount: number;
    retainedSharedCount: number;
  };
}

const ALLOWED_SERVICES = new Set(STORE_OWNER_AGREEMENT_SERVICE_KEYS);
const GCS_BUCKET = process.env.GCS_MEDIA_LIBRARY_BUCKET || 'o4o-media-library';
const GCS_URL_PREFIX = `https://storage.googleapis.com/${GCS_BUCKET}/`;

function parseCase(row: any): StoreOwnerTerminationCase {
  return {
    id: String(row.id),
    serviceKey: String(row.service_key),
    organizationId: String(row.organization_id),
    userId: String(row.user_id),
    status: row.status as StoreOwnerTerminationStatus,
    requestedAt: new Date(row.requested_at),
    requestedBy: String(row.requested_by),
    returnRequested: Boolean(row.return_requested),
    returnCompletedAt: row.return_completed_at ? new Date(row.return_completed_at) : null,
    terminationEffectiveAt: row.termination_effective_at ? new Date(row.termination_effective_at) : null,
    purgeDueAt: row.purge_due_at ? new Date(row.purge_due_at) : null,
    purgeCompletedAt: row.purge_completed_at ? new Date(row.purge_completed_at) : null,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    failureReason: row.failure_reason ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function tableExists(q: Pick<DataSource, 'query'> | EntityManager, table: string): Promise<boolean> {
  const rows = await q.query(`SELECT to_regclass($1) AS reg`, [`public.${table}`]);
  return Boolean(rows?.[0]?.reg);
}

async function selectRows(
  q: Pick<DataSource, 'query'> | EntityManager,
  table: string,
  whereSql: string,
  params: unknown[],
): Promise<unknown[]> {
  if (!(await tableExists(q, table))) return [];
  return q.query(`SELECT to_jsonb(t) AS row FROM ${table} t WHERE ${whereSql} ORDER BY t.id`, params)
    .then((rows: any[]) => rows.map((r) => r.row));
}

async function countRows(
  q: Pick<DataSource, 'query'> | EntityManager,
  table: string,
  whereSql: string,
  params: unknown[],
): Promise<number> {
  if (!(await tableExists(q, table))) return 0;
  const rows = await q.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE ${whereSql}`, params);
  return Number(rows?.[0]?.n ?? 0);
}

async function deleteRows(
  q: EntityManager,
  table: string,
  whereSql: string,
  params: unknown[],
): Promise<number> {
  if (!(await tableExists(q, table))) return 0;
  const rows = await q.query(`DELETE FROM ${table} WHERE ${whereSql} RETURNING 1`, params);
  return rows.length;
}

export class StoreOwnerTerminationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus = 400,
  ) {
    super(message);
    this.name = 'StoreOwnerTerminationError';
  }
}

export class StoreOwnerTerminationService {
  private storage = new Storage();

  constructor(private readonly dataSource: DataSource) {}

  private assertServiceKey(serviceKey: string): void {
    if (!ALLOWED_SERVICES.has(serviceKey)) {
      throw new StoreOwnerTerminationError('INVALID_SERVICE_KEY', '매장 경영자 계약 대상 서비스가 아닙니다.', 400);
    }
  }

  async getCase(caseId: string): Promise<StoreOwnerTerminationCase> {
    const rows = await this.dataSource.query(
      `SELECT * FROM store_owner_termination_cases WHERE id = $1 LIMIT 1`,
      [caseId],
    );
    if (!rows.length) throw new StoreOwnerTerminationError('TERMINATION_CASE_NOT_FOUND', '종료 case를 찾을 수 없습니다.', 404);
    return parseCase(rows[0]);
  }

  async listCases(serviceKeys: string[]): Promise<StoreOwnerTerminationCase[]> {
    const allowed = serviceKeys.filter((key) => ALLOWED_SERVICES.has(key));
    if (!allowed.length) return [];
    const rows = await this.dataSource.query(
      `SELECT * FROM store_owner_termination_cases
        WHERE service_key = ANY($1::text[])
        ORDER BY created_at DESC`,
      [allowed],
    );
    return rows.map(parseCase);
  }

  async createCase(input: {
    serviceKey: string;
    organizationId: string;
    userId: string;
    requestedBy: string;
    returnRequested: boolean;
    terminationEffectiveAt: Date;
  }): Promise<StoreOwnerTerminationCase> {
    this.assertServiceKey(input.serviceKey);
    if (!(input.terminationEffectiveAt instanceof Date) || Number.isNaN(input.terminationEffectiveAt.getTime())) {
      throw new StoreOwnerTerminationError('INVALID_TERMINATION_DATE', '유효한 종료일이 필요합니다.', 400);
    }
    const role = STORE_OWNER_ROLE_BY_SERVICE[input.serviceKey];

    const eligible = await this.dataSource.query(
      `SELECT 1
         FROM service_memberships sm
        WHERE sm.user_id = $1 AND sm.service_key = $2 AND sm.status = 'active'
          AND EXISTS (
            SELECT 1 FROM role_assignments ra
             WHERE ra.user_id = sm.user_id AND ra.role = $3 AND ra.is_active = true
          )
          AND EXISTS (
            SELECT 1 FROM organization_members om
             WHERE om.user_id = sm.user_id AND om.organization_id = $4
               AND om.role IN ('owner','admin','manager') AND om.left_at IS NULL
          )
          AND (
            EXISTS (
              SELECT 1 FROM organization_service_enrollments ose
               WHERE ose.organization_id = $4 AND ose.service_code = $2 AND ose.status = 'active'
            )
            OR EXISTS (
              SELECT 1 FROM platform_store_slugs pss
               WHERE pss.store_id = $4 AND pss.service_key IN ($2, CASE WHEN $2='kpa-society' THEN 'kpa' WHEN $2='k-cosmetics' THEN 'cosmetics' ELSE $2 END)
                 AND pss.is_active = true
            )
          )
        LIMIT 1`,
      [input.userId, input.serviceKey, role, input.organizationId],
    );
    if (!eligible.length) {
      throw new StoreOwnerTerminationError(
        'STORE_OWNER_TERMINATION_SUBJECT_MISMATCH',
        '해당 서비스의 활성 매장 경영자와 조직 관계를 확인할 수 없습니다.',
        409,
      );
    }

    try {
      const rows = await this.dataSource.query(
        `INSERT INTO store_owner_termination_cases
          (service_key, organization_id, user_id, status, requested_by, return_requested,
           termination_effective_at, purge_due_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7::timestamptz + interval '7 days')
         RETURNING *`,
        [
          input.serviceKey,
          input.organizationId,
          input.userId,
          input.returnRequested ? 'return_pending' : 'termination_scheduled',
          input.requestedBy,
          input.returnRequested,
          input.terminationEffectiveAt.toISOString(),
        ],
      );
      return parseCase(rows[0]);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new StoreOwnerTerminationError('TERMINATION_CASE_ALREADY_OPEN', '이미 진행 중인 종료 case가 있습니다.', 409);
      }
      throw error;
    }
  }

  private async otherActiveServices(
    organizationId: string,
    serviceKey: string,
    q: Pick<DataSource, 'query'> | EntityManager = this.dataSource,
  ): Promise<string[]> {
    const rows = await q.query(
      `SELECT DISTINCT service_code
         FROM organization_service_enrollments
        WHERE organization_id = $1 AND status = 'active' AND service_code <> $2
        ORDER BY service_code`,
      [organizationId, serviceKey],
    );
    return rows.map((r: any) => String(r.service_code));
  }

  async buildReturnPackage(caseId: string): Promise<StoreOwnerReturnPackage> {
    const current = await this.getCase(caseId);
    if (['cancelled', 'purge_completed'].includes(current.status)) {
      throw new StoreOwnerTerminationError('TERMINATION_CASE_CLOSED', '이미 종료된 case입니다.', 409);
    }
    const org = current.organizationId;
    const svc = current.serviceKey;
    const uid = current.userId;

    const categories: Record<string, unknown[]> = {};

    // A — store / business basic information. users.businessInfo 는 USER_SHARED라 반환에는 포함하되 purge 대상은 아니다.
    categories.organization = await selectRows(this.dataSource, 'organizations', 'id = $1', [org]);
    categories.serviceEnrollment = await selectRows(
      this.dataSource,
      'organization_service_enrollments',
      'organization_id = $1 AND service_code = $2',
      [org, svc],
    );
    if (await tableExists(this.dataSource, 'users')) {
      const rows = await this.dataSource.query(
        `SELECT jsonb_build_object(
             'id', id,
             'businessInfo', "businessInfo"
           ) AS row
           FROM users WHERE id = $1`,
        [uid],
      );
      categories.userSharedBusinessInfo = rows.map((r: any) => r.row);
    }

    // B — store-owned/selected products. Supplier master/original tables are intentionally excluded.
    categories.storeProducts = await selectRows(this.dataSource, 'store_products', 'organization_id = $1', [org]);
    categories.storeProductProfiles = await selectRows(this.dataSource, 'store_product_profiles', 'organization_id = $1', [org]);
    categories.storeLocalProducts = await selectRows(this.dataSource, 'store_local_products', 'organization_id = $1', [org]);
    categories.productListings = await selectRows(
      this.dataSource,
      'organization_product_listings',
      'organization_id = $1 AND service_key = $2',
      [org, svc],
    );

    // D — store independent copies / edits.
    categories.assetSnapshots = await selectRows(this.dataSource, 'o4o_asset_snapshots', 'organization_id = $1', [org]);
    categories.storeContents = await selectRows(this.dataSource, 'kpa_store_contents', 'organization_id = $1', [org]);
    categories.assetDerivations = await selectRows(
      this.dataSource,
      'store_asset_derivations',
      'organization_id = $1 AND service_key = $2',
      [org, svc],
    );

    // E — store-created execution material.
    categories.executionAssets = await selectRows(this.dataSource, 'store_execution_assets', 'organization_id = $1', [org]);
    categories.blogPosts = await selectRows(
      this.dataSource,
      'store_blog_posts',
      `store_id = $1 AND service_key = $2 AND author_role = 'store'`,
      [org, svc],
    );
    categories.pops = await selectRows(
      this.dataSource,
      'store_pops',
      `store_id = $1 AND service_key = $2 AND author_role = 'store'`,
      [org, svc],
    );
    categories.videos = await selectRows(
      this.dataSource,
      'store_videos',
      `store_id = $1 AND service_key = $2 AND author_role = 'store'`,
      [org, svc],
    );
    categories.popDocuments = await selectRows(
      this.dataSource,
      'store_pop_documents',
      'organization_id = $1 AND service_key = $2',
      [org, svc],
    );
    categories.qrCodes = await selectRows(this.dataSource, 'store_qr_codes', 'organization_id = $1', [org]);
    categories.qrPlacements = await selectRows(this.dataSource, 'store_qr_placements', 'organization_id = $1', [org]);
    categories.tablets = await selectRows(this.dataSource, 'store_tablets', 'organization_id = $1', [org]);
    categories.screenSets = await selectRows(
      this.dataSource,
      'store_tablet_screen_sets',
      'organization_id = $1 AND service_key = $2',
      [org, svc],
    );
    categories.playlists = await selectRows(this.dataSource, 'store_playlists', 'organization_id = $1', [org]);
    categories.popV2 = await selectRows(
      this.dataSource,
      'store_pop_documents',
      'organization_id = $1 AND service_key = $2',
      [org, svc],
    );
    categories.multilingualContentGroups = await selectRows(
      this.dataSource,
      'store_multilingual_product_content_groups',
      'organization_id = $1',
      [org],
    );

    const counts = Object.fromEntries(Object.entries(categories).map(([k, v]) => [k, v.length]));
    const generatedAt = new Date().toISOString();
    const payloadForHash = JSON.stringify({ caseId, serviceKey: svc, organizationId: org, generatedAt, categories });
    const hash = createHash('sha256').update(payloadForHash).digest('hex');

    await this.dataSource.query(
      `UPDATE store_owner_termination_cases
          SET return_completed_at = NOW(),
              status = CASE
                WHEN status = 'return_pending' THEN 'return_completed'
                ELSE status
              END,
              updated_at = NOW(),
              failure_reason = NULL
        WHERE id = $1`,
      [caseId],
    );

    return {
      caseId,
      serviceKey: svc,
      organizationId: org,
      generatedAt,
      categories,
      manifest: { categories: counts, hash },
    };
  }

  async terminate(caseId: string): Promise<StoreOwnerTerminationCase> {
    const current = await this.getCase(caseId);
    if (['cancelled', 'purge_completed'].includes(current.status)) {
      throw new StoreOwnerTerminationError('TERMINATION_CASE_CLOSED', '이미 종료된 case입니다.', 409);
    }
    const effective = current.terminationEffectiveAt ?? new Date();
    if (effective.getTime() > Date.now()) {
      throw new StoreOwnerTerminationError('TERMINATION_NOT_EFFECTIVE_YET', '아직 계약 종료일이 도래하지 않았습니다.', 409);
    }
    if (current.returnRequested && !current.returnCompletedAt) {
      throw new StoreOwnerTerminationError('RETURN_NOT_COMPLETED', '반환 요청이 완료되기 전에는 계약을 종료할 수 없습니다.', 409);
    }

    await this.dataSource.transaction(async (manager) => {
      const org = current.organizationId;
      const svc = current.serviceKey;
      const role = STORE_OWNER_ROLE_BY_SERVICE[svc];
      const other = await this.otherActiveServices(org, svc, manager);
      const shared = other.length > 0;

      if (await tableExists(manager, 'platform_store_slugs')) {
        await manager.query(
          `UPDATE platform_store_slugs SET is_active = false, updated_at = NOW()
            WHERE store_id = $1 AND service_key = ANY($2::text[])`,
          [org, svc === 'kpa-society' ? [svc, 'kpa'] : svc === 'k-cosmetics' ? [svc, 'cosmetics'] : [svc]],
        );
      }
      if (await tableExists(manager, 'organization_product_listings')) {
        await manager.query(
          `UPDATE organization_product_listings SET is_active = false, updated_at = NOW()
            WHERE organization_id = $1 AND service_key = $2`,
          [org, svc],
        );
      }
      for (const table of ['store_blog_posts', 'store_pops', 'store_videos']) {
        if (await tableExists(manager, table)) {
          await manager.query(
            `UPDATE ${table} SET status = 'archived', updated_at = NOW()
              WHERE store_id = $1 AND service_key = $2 AND author_role = 'store'`,
            [org, svc],
          );
        }
      }
      if (await tableExists(manager, 'store_pop_documents')) {
        await manager.query(
          `UPDATE store_pop_documents SET status = 'archived', updated_at = NOW()
            WHERE organization_id = $1 AND service_key = $2`,
          [org, svc],
        );
      }
      if (await tableExists(manager, 'store_tablet_screen_sets')) {
        await manager.query(
          `UPDATE store_tablet_screen_sets SET status = 'archived', updated_at = NOW()
            WHERE organization_id = $1 AND service_key = $2 AND deleted_at IS NULL`,
          [org, svc],
        );
      }

      if (!shared) {
        if (await tableExists(manager, 'store_qr_codes')) {
          await manager.query(
            `UPDATE store_qr_codes SET is_active = false, updated_at = NOW() WHERE organization_id = $1`,
            [org],
          );
        }
        if (await tableExists(manager, 'store_qr_placements')) {
          await manager.query(
            `UPDATE store_qr_placements
                SET status = 'ended', ended_at = COALESCE(ended_at, NOW()), updated_at = NOW()
              WHERE organization_id = $1 AND status = 'active'`,
            [org],
          );
        }
        if (await tableExists(manager, 'store_tablets')) {
          await manager.query(
            `UPDATE store_tablets SET is_active = false, updated_at = NOW() WHERE organization_id = $1`,
            [org],
          );
        }
        if (await tableExists(manager, 'store_playlists')) {
          await manager.query(
            `UPDATE store_playlists
                SET is_active = false, publish_status = 'draft', updated_at = NOW()
              WHERE organization_id = $1`,
            [org],
          );
        }
        if (await tableExists(manager, 'organization_channels')) {
          await manager.query(
            `UPDATE organization_channels
                SET status = 'TERMINATED', updated_at = NOW()
              WHERE organization_id = $1`,
            [org],
          );
        }
      }

      if (await tableExists(manager, 'organization_service_enrollments')) {
        await manager.query(
          `UPDATE organization_service_enrollments
              SET status = 'inactive', updated_at = NOW()
            WHERE organization_id = $1 AND service_code = $2`,
          [org, svc],
        );
      }
      await manager.query(
        `UPDATE service_memberships SET status = 'withdrawn', "updatedAt" = NOW()
          WHERE user_id = $1 AND service_key = $2`,
        [current.userId, svc],
      );
      await manager.query(
        `UPDATE role_assignments SET is_active = false, updated_at = NOW()
          WHERE user_id = $1 AND role = $2 AND is_active = true`,
        [current.userId, role],
      );

      await manager.query(
        `UPDATE store_owner_termination_cases
            SET status = 'terminated',
                termination_effective_at = COALESCE(termination_effective_at, NOW()),
                purge_due_at = COALESCE(purge_due_at, COALESCE(termination_effective_at, NOW()) + interval '7 days'),
                updated_at = NOW(),
                failure_reason = NULL
          WHERE id = $1`,
        [caseId],
      );
    });

    return this.getCase(caseId);
  }

  private async collectMediaCandidates(
    current: StoreOwnerTerminationCase,
  ): Promise<{ deletable: { id: string; gcsPath: string }[]; retainedShared: number }> {
    if (!(await tableExists(this.dataSource, 'media_assets')) || !(await tableExists(this.dataSource, 'store_execution_assets'))) {
      return { deletable: [], retainedShared: 0 };
    }
    const rows = await this.dataSource.query(
      `SELECT DISTINCT ma.id, ma.url, ma.gcs_path AS "gcsPath"
         FROM media_assets ma
         JOIN store_execution_assets sea
           ON sea.organization_id = $1
          AND (sea.file_url = ma.url OR sea.url = ma.url OR (sea.html_content IS NOT NULL AND sea.html_content ILIKE '%' || ma.url || '%'))
        WHERE ma.uploaded_by = $2
          AND ma.storage_type = 'internal'
          AND ma.gcs_path IS NOT NULL
          AND (ma.service_key = $3 OR ma.service_key IS NULL)`,
      [current.organizationId, current.userId, current.serviceKey],
    ) as { id: string; url: string; gcsPath: string }[];

    const deletable: { id: string; gcsPath: string }[] = [];
    let retainedShared = 0;
    for (const asset of rows) {
      const externalExecutionRefs = await this.dataSource.query(
        `SELECT 1 FROM store_execution_assets
          WHERE organization_id <> $1
            AND (file_url = $2 OR url = $2 OR (html_content IS NOT NULL AND html_content ILIKE '%' || $2 || '%'))
          LIMIT 1`,
        [current.organizationId, asset.url],
      );
      const entityLinks = await this.dataSource.query(
        `SELECT 1 FROM media_entity_links WHERE media_asset_id = $1 LIMIT 1`,
        [asset.id],
      ).catch(() => []);
      const descendants = await this.dataSource.query(
        `SELECT 1 FROM media_assets WHERE parent_asset_id = $1 OR root_asset_id = $1 LIMIT 1`,
        [asset.id],
      );
      const externalScreenRefs = await this.dataSource.query(
        `SELECT 1
           FROM store_tablet_screen_blocks b
           JOIN store_tablet_screen_sets s ON s.id = b.screen_set_id
          WHERE s.organization_id <> $1
            AND b.config::text ILIKE '%' || $2 || '%'
          LIMIT 1`,
        [current.organizationId, asset.url],
      ).catch(() => []);
      if (externalExecutionRefs.length || entityLinks.length || descendants.length || externalScreenRefs.length) {
        retainedShared += 1;
      } else {
        deletable.push({ id: asset.id, gcsPath: asset.gcsPath });
      }
    }
    return { deletable, retainedShared };
  }

  async previewPurge(caseId: string): Promise<StoreOwnerPurgePreview> {
    const current = await this.getCase(caseId);
    const org = current.organizationId;
    const svc = current.serviceKey;
    const otherActiveServices = await this.otherActiveServices(org, svc);
    const sharedDataExcluded = otherActiveServices.length > 0;
    const counts: Record<string, number> = {};

    // Service-scoped A/B/D/E.
    counts.productListings = await countRows(this.dataSource, 'organization_product_listings', 'organization_id = $1 AND service_key = $2', [org, svc]);
    counts.assetDerivations = await countRows(this.dataSource, 'store_asset_derivations', 'organization_id = $1 AND service_key = $2', [org, svc]);
    counts.blogPosts = await countRows(this.dataSource, 'store_blog_posts', `store_id = $1 AND service_key = $2 AND author_role = 'store'`, [org, svc]);
    counts.pops = await countRows(this.dataSource, 'store_pops', `store_id = $1 AND service_key = $2 AND author_role = 'store'`, [org, svc]);
    counts.videos = await countRows(this.dataSource, 'store_videos', `store_id = $1 AND service_key = $2 AND author_role = 'store'`, [org, svc]);
    counts.popDocuments = await countRows(this.dataSource, 'store_pop_documents', 'organization_id = $1 AND service_key = $2', [org, svc]);
    counts.screenSets = await countRows(this.dataSource, 'store_tablet_screen_sets', 'organization_id = $1 AND service_key = $2', [org, svc]);
    counts.storeSlugs = await countRows(
      this.dataSource,
      'platform_store_slugs',
      `store_id = $1 AND service_key = ANY($2::text[])`,
      [org, svc === 'kpa-society' ? [svc, 'kpa'] : svc === 'k-cosmetics' ? [svc, 'cosmetics'] : [svc]],
    );

    if (!sharedDataExcluded) {
      counts.storeProducts = await countRows(this.dataSource, 'store_products', 'organization_id = $1', [org]);
      counts.storeProductProfiles = await countRows(this.dataSource, 'store_product_profiles', 'organization_id = $1', [org]);
      counts.localProducts = await countRows(this.dataSource, 'store_local_products', 'organization_id = $1', [org]);
      counts.executionAssets = await countRows(this.dataSource, 'store_execution_assets', 'organization_id = $1', [org]);
      counts.assetSnapshots = await countRows(this.dataSource, 'o4o_asset_snapshots', 'organization_id = $1', [org]);
      counts.storeContents = await countRows(this.dataSource, 'kpa_store_contents', 'organization_id = $1', [org]);
      counts.contentProductLinks = await countRows(this.dataSource, 'kpa_store_content_product_links', 'organization_id = $1', [org]);
      counts.qrCodes = await countRows(this.dataSource, 'store_qr_codes', 'organization_id = $1', [org]);
      counts.qrPlacements = await countRows(this.dataSource, 'store_qr_placements', 'organization_id = $1', [org]);
      counts.tablets = await countRows(this.dataSource, 'store_tablets', 'organization_id = $1', [org]);
      counts.playlists = await countRows(this.dataSource, 'store_playlists', 'organization_id = $1', [org]);
      counts.multilingualContentGroups = await countRows(this.dataSource, 'store_multilingual_product_content_groups', 'organization_id = $1', [org]);
      counts.organizationChannels = await countRows(this.dataSource, 'organization_channels', 'organization_id = $1', [org]);
    }

    const media = sharedDataExcluded ? { deletable: [], retainedShared: 0 } : await this.collectMediaCandidates(current);
    return {
      caseId,
      serviceKey: svc,
      organizationId: org,
      otherActiveServices,
      sharedDataExcluded,
      counts,
      gcs: { candidateCount: media.deletable.length, retainedSharedCount: media.retainedShared },
    };
  }

  async purge(caseId: string, apply = false): Promise<StoreOwnerPurgePreview & { deleted: Record<string, number>; gcsDeleted: number }> {
    const current = await this.getCase(caseId);
    if (!['terminated', 'failed'].includes(current.status)) {
      throw new StoreOwnerTerminationError('TERMINATION_NOT_READY_FOR_PURGE', '계약 종료 완료 후에만 파기할 수 있습니다.', 409);
    }
    const preview = await this.previewPurge(caseId);
    if (!apply) return { ...preview, deleted: {}, gcsDeleted: 0 };

    const media = preview.sharedDataExcluded ? { deletable: [], retainedShared: 0 } : await this.collectMediaCandidates(current);
    let gcsDeleted = 0;
    try {
      // GCS first — 실패하면 DB target rows 를 삭제하지 않는다. 404 는 이미 삭제된 것으로 본다.
      const bucket = this.storage.bucket(GCS_BUCKET);
      for (const candidate of media.deletable) {
        try {
          await bucket.file(candidate.gcsPath).delete();
          gcsDeleted += 1;
        } catch (error: any) {
          if (error?.code !== 404) throw error;
        }
      }

      const deleted: Record<string, number> = {};
      await this.dataSource.transaction(async (manager) => {
        const org = current.organizationId;
        const svc = current.serviceKey;

        // service scoped — child/weak-reference rows first.
        if (await tableExists(manager, 'organization_product_channels')) {
          deleted.productChannels = await deleteRows(
            manager,
            'organization_product_channels',
            `product_listing_id IN (
               SELECT id FROM organization_product_listings WHERE organization_id = $1 AND service_key = $2
             )`,
            [org, svc],
          );
        }
        deleted.assetDerivations = await deleteRows(manager, 'store_asset_derivations', 'organization_id = $1 AND service_key = $2', [org, svc]);
        deleted.popDocuments = await deleteRows(manager, 'store_pop_documents', 'organization_id = $1 AND service_key = $2', [org, svc]);
        deleted.blogPosts = await deleteRows(manager, 'store_blog_posts', `store_id = $1 AND service_key = $2 AND author_role = 'store'`, [org, svc]);
        deleted.pops = await deleteRows(manager, 'store_pops', `store_id = $1 AND service_key = $2 AND author_role = 'store'`, [org, svc]);
        deleted.videos = await deleteRows(manager, 'store_videos', `store_id = $1 AND service_key = $2 AND author_role = 'store'`, [org, svc]);

        if (await tableExists(manager, 'store_tablet_screen_sets')) {
          if (await tableExists(manager, 'store_tablet_screen_blocks')) {
            deleted.screenBlocks = await deleteRows(
              manager,
              'store_tablet_screen_blocks',
              `screen_set_id IN (
                 SELECT id FROM store_tablet_screen_sets WHERE organization_id = $1 AND service_key = $2
               )`,
              [org, svc],
            );
          }
          deleted.screenSets = await deleteRows(manager, 'store_tablet_screen_sets', 'organization_id = $1 AND service_key = $2', [org, svc]);
        }
        deleted.productListings = await deleteRows(manager, 'organization_product_listings', 'organization_id = $1 AND service_key = $2', [org, svc]);
        deleted.storeSlugs = await deleteRows(
          manager,
          'platform_store_slugs',
          `store_id = $1 AND service_key = ANY($2::text[])`,
          [org, svc === 'kpa-society' ? [svc, 'kpa'] : svc === 'k-cosmetics' ? [svc, 'cosmetics'] : [svc]],
        );

        if (!preview.sharedDataExcluded) {
          // descendants / references before parent assets.
          deleted.contentProductLinks = await deleteRows(manager, 'kpa_store_content_product_links', 'organization_id = $1', [org]);
          if (await tableExists(manager, 'store_playlist_items')) {
            deleted.playlistItems = await deleteRows(
              manager,
              'store_playlist_items',
              'playlist_id IN (SELECT id FROM store_playlists WHERE organization_id = $1)',
              [org],
            );
          }
          if (await tableExists(manager, 'store_tablet_corner_contents')) {
            deleted.tabletCornerContents = await deleteRows(manager, 'store_tablet_corner_contents', 'organization_id = $1', [org]);
          }
          if (await tableExists(manager, 'store_tablet_displays')) {
            deleted.tabletDisplays = await deleteRows(
              manager,
              'store_tablet_displays',
              'tablet_id IN (SELECT id FROM store_tablets WHERE organization_id = $1)',
              [org],
            );
          }
          if (await tableExists(manager, 'store_qr_placements')) {
            deleted.qrPlacements = await deleteRows(manager, 'store_qr_placements', 'organization_id = $1', [org]);
          }
          if (await tableExists(manager, 'store_multilingual_product_content_pages')) {
            deleted.multilingualPages = await deleteRows(
              manager,
              'store_multilingual_product_content_pages',
              'group_id IN (SELECT id FROM store_multilingual_product_content_groups WHERE organization_id = $1)',
              [org],
            );
          }

          deleted.storeProductProfiles = await deleteRows(manager, 'store_product_profiles', 'organization_id = $1', [org]);
          deleted.storeProducts = await deleteRows(manager, 'store_products', 'organization_id = $1', [org]);
          deleted.localProducts = await deleteRows(manager, 'store_local_products', 'organization_id = $1', [org]);
          deleted.storeContents = await deleteRows(manager, 'kpa_store_contents', 'organization_id = $1', [org]);
          deleted.assetSnapshots = await deleteRows(manager, 'o4o_asset_snapshots', 'organization_id = $1', [org]);

          // media_assets DB row 는 GCS delete 성공 대상만 지운다.
          if (media.deletable.length && await tableExists(manager, 'media_assets')) {
            const rows = await manager.query(
              `DELETE FROM media_assets WHERE id = ANY($1::uuid[]) RETURNING 1`,
              [media.deletable.map((m) => m.id)],
            );
            deleted.mediaAssets = rows.length;
          }
          deleted.executionAssets = await deleteRows(manager, 'store_execution_assets', 'organization_id = $1', [org]);
          deleted.qrCodes = await deleteRows(manager, 'store_qr_codes', 'organization_id = $1', [org]);
          deleted.tablets = await deleteRows(manager, 'store_tablets', 'organization_id = $1', [org]);
          deleted.playlists = await deleteRows(manager, 'store_playlists', 'organization_id = $1', [org]);
          deleted.multilingualGroups = await deleteRows(manager, 'store_multilingual_product_content_groups', 'organization_id = $1', [org]);
          deleted.organizationChannels = await deleteRows(manager, 'organization_channels', 'organization_id = $1', [org]);

          // organization row 는 광범위한 FK 때문에 hard delete 하지 않는다.
          // active store 데이터 파기 후 식별성/공개성을 제거한 비활성 tombstone 으로 최소화한다.
          if (await tableExists(manager, 'organizations')) {
            await manager.query(
              `UPDATE organizations
                  SET "isActive" = false,
                      name = '종료된 매장',
                      metadata = '{}'::jsonb,
                      "updatedAt" = NOW()
                WHERE id = $1`,
              [org],
            );
          }
        }

        // enrollment row 는 종료 증빙/다중서비스 이력을 위해 inactive 로 보존한다.
        await manager.query(
          `UPDATE store_owner_termination_cases
              SET status = 'purge_completed', purge_completed_at = NOW(), updated_at = NOW(), failure_reason = NULL
            WHERE id = $1`,
          [caseId],
        );
      });

      return { ...preview, deleted, gcsDeleted };
    } catch (error) {
      await this.dataSource.query(
        `UPDATE store_owner_termination_cases
            SET status = 'failed', failure_reason = $2, updated_at = NOW()
          WHERE id = $1`,
        [caseId, error instanceof Error ? error.message.slice(0, 1000) : 'PURGE_INCOMPLETE'],
      ).catch(() => undefined);
      throw new StoreOwnerTerminationError(
        'PURGE_INCOMPLETE',
        '매장 데이터 파기를 완료하지 못했습니다. case를 확인한 뒤 재처리해야 합니다.',
        500,
      );
    }
  }

  async overdueCases(serviceKeys: string[]): Promise<StoreOwnerTerminationCase[]> {
    const allowed = serviceKeys.filter((key) => ALLOWED_SERVICES.has(key));
    if (!allowed.length) return [];
    const rows = await this.dataSource.query(
      `SELECT * FROM store_owner_termination_cases
        WHERE service_key = ANY($1::text[])
          AND status IN ('terminated','failed')
          AND purge_completed_at IS NULL
          AND purge_due_at IS NOT NULL
          AND purge_due_at < NOW()
        ORDER BY purge_due_at ASC`,
      [allowed],
    );
    return rows.map(parseCase);
  }
}
