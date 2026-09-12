/**
 * AutomationJobService — WO-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1
 *
 * "얇은 automation job 레코드 + 기존 Media Library 연결".
 * - Job 자체는 automation_jobs 한 테이블. workflow/scheduler/retry/executionRef 없음.
 * - asset 연결은 media_entity_links(entity_type='video-production-job', entity_id=job.id) 재사용.
 * - 정리(cleanup)는 INTERMEDIATE 만 후보로 보며, 기존 Media delete guard(다른 연결·lineage·Screen Set)를
 *   그대로 따른다. 보호되는 asset 은 Job 관계만 해제하고 삭제하지 않는다. 자동 삭제 없음.
 */
import type { DataSource, EntityManager } from 'typeorm';
import {
  AutomationJob,
  AUTOMATION_JOB_CLEANUP_DECISIONS,
  AUTOMATION_JOB_STATUSES,
  AUTOMATION_JOB_TYPES,
  type AutomationJobCleanupDecision,
} from '../entities/AutomationJob.entity.js';
import {
  MediaCatalogError,
  MediaCatalogService,
  mediaText,
  mediaUuid,
} from '../../media/services/media-catalog.service.js';
import { MediaLibraryService } from '../../media/services/media-library.service.js';

export const JOB_ENTITY_TYPE = 'video-production-job';
export const JOB_ASSET_PURPOSES = ['INPUT', 'INTERMEDIATE', 'OUTPUT'] as const;
export type JobAssetPurpose = (typeof JOB_ASSET_PURPOSES)[number];

/** Job 화면이 쓰는 asset 요약 — media_assets 전체 컬럼을 노출하지 않는다. */
export interface JobAssetLink {
  linkId: string;
  purpose: JobAssetPurpose;
  createdAt: Date;
  asset: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    title: string | null;
    originalName: string;
    assetType: string;
    mimeType: string;
    fileSize: number;
    storageType: string;
    parentAssetId: string | null;
    rootAssetId: string | null;
  };
}

export type CleanupPlan = 'KEEP' | 'UNLINK_ONLY' | 'DELETE';
export type CleanupResult =
  | 'KEPT'
  | 'UNLINKED'
  | 'DELETED'
  | 'BLOCKED'
  | 'STORAGE_DELETE_FAILED';
export interface CleanupItem {
  linkId: string;
  purpose: JobAssetPurpose;
  asset: JobAssetLink['asset'];
  plan: CleanupPlan;
  /** 보호 사유 (plan=UNLINK_ONLY 일 때) */
  reason?: 'LINKED_ELSEWHERE' | 'LINEAGE_PROTECTED' | 'SCREEN_SET_IN_USE';
  result?: CleanupResult;
  code?: string;
}

const enumOf = <T extends string>(
  value: unknown,
  values: readonly T[],
  code: string,
): T => {
  if (!values.includes(value as T)) throw new MediaCatalogError(code);
  return value as T;
};
const optionalText = (value: unknown, max: number): string | null | undefined =>
  value === undefined ? undefined : value === null || value === '' ? null : mediaText(value, max);

const ASSET_SELECT = `a.id, a.url, a.thumbnail_url AS "thumbnailUrl", a.title, a.original_name AS "originalName",
  a.asset_type AS "assetType", a.mime_type AS "mimeType", a.file_size::float8 AS "fileSize", a.storage_type AS "storageType",
  a.parent_asset_id AS "parentAssetId", a.root_asset_id AS "rootAssetId"`;

export class AutomationJobService {
  private catalog: MediaCatalogService;
  private library: MediaLibraryService;
  constructor(private ds: DataSource) {
    this.catalog = new MediaCatalogService(ds);
    this.library = new MediaLibraryService(ds);
  }

  private async locked(manager: EntityManager, id: string): Promise<AutomationJob> {
    const job = await manager.getRepository(AutomationJob).findOne({
      where: { id: mediaUuid(id) },
      lock: { mode: 'pessimistic_write' },
    });
    if (!job) throw new MediaCatalogError('JOB_NOT_FOUND', 404);
    return job;
  }
  private assertOpen(job: AutomationJob) {
    if (job.status === 'COMPLETED' || job.status === 'CANCELLED')
      throw new MediaCatalogError('JOB_CLOSED', 409);
  }

  async create(input: Record<string, unknown>, userId: string): Promise<AutomationJob> {
    const repo = this.ds.getRepository(AutomationJob);
    return repo.save(
      repo.create({
        type: enumOf(input.type ?? 'VIDEO', AUTOMATION_JOB_TYPES, 'INVALID_JOB_TYPE'),
        title: mediaText(input.title, 200),
        instructions: optionalText(input.instructions, 20000) ?? null,
        statusNote: optionalText(input.statusNote, 500) ?? null,
        status: 'DRAFT',
        createdBy: userId,
      }),
    );
  }

  /** 목록 + purpose 별 asset 건수. 여러 Job 이 서로 독립적으로 유지된다(상태 간 상호 제약 없음). */
  async list(filter: { status?: unknown; type?: unknown } = {}) {
    const qb = this.ds
      .getRepository(AutomationJob)
      .createQueryBuilder('j')
      .orderBy('j.updatedAt', 'DESC')
      .take(200);
    if (filter.type)
      qb.andWhere('j.type = :type', { type: enumOf(filter.type, AUTOMATION_JOB_TYPES, 'INVALID_JOB_TYPE') });
    if (filter.status)
      qb.andWhere('j.status = :status', { status: enumOf(filter.status, AUTOMATION_JOB_STATUSES, 'INVALID_JOB_STATUS') });
    const jobs = await qb.getMany();
    const counts = new Map<string, Record<JobAssetPurpose, number>>();
    if (jobs.length) {
      const rows: Array<{ entityId: string; purpose: JobAssetPurpose; count: string }> = await this.ds.query(
        `SELECT entity_id AS "entityId", purpose, COUNT(*)::text AS count FROM media_entity_links
          WHERE entity_type=$1 AND entity_id = ANY($2::text[]) GROUP BY entity_id, purpose`,
        [JOB_ENTITY_TYPE, jobs.map((j) => j.id)],
      );
      for (const r of rows) {
        const c = counts.get(r.entityId) ?? { INPUT: 0, INTERMEDIATE: 0, OUTPUT: 0 };
        if (r.purpose in c) c[r.purpose] = Number(r.count);
        counts.set(r.entityId, c);
      }
    }
    return jobs.map((j) => ({
      ...j,
      assetCounts: counts.get(j.id) ?? { INPUT: 0, INTERMEDIATE: 0, OUTPUT: 0 },
    }));
  }

  private async links(manager: EntityManager | DataSource, jobId: string): Promise<JobAssetLink[]> {
    const rows: Array<Record<string, unknown> & { linkId: string; purpose: JobAssetPurpose; createdAt: Date }> =
      await manager.query(
        `SELECT l.id AS "linkId", l.purpose, l.created_at AS "createdAt", ${ASSET_SELECT}
           FROM media_entity_links l JOIN media_assets a ON a.id = l.media_asset_id
          WHERE l.entity_type=$1 AND l.entity_id=$2 ORDER BY l.created_at, l.id`,
        [JOB_ENTITY_TYPE, jobId],
      );
    return rows.map(({ linkId, purpose, createdAt, ...asset }) => ({
      linkId,
      purpose,
      createdAt,
      asset: asset as JobAssetLink['asset'],
    }));
  }

  async get(id: string) {
    const job = await this.ds.getRepository(AutomationJob).findOneBy({ id: mediaUuid(id) });
    if (!job) throw new MediaCatalogError('JOB_NOT_FOUND', 404);
    return { ...job, assets: await this.links(this.ds, job.id) };
  }

  /** 기본 정보·상태 수정. COMPLETED 는 complete() 로만 진입하며 완료 후엔 수정 불가. CANCELLED 는 재개(DRAFT 등) 가능. */
  async update(id: string, input: Record<string, unknown>): Promise<AutomationJob> {
    mediaUuid(id);
    return this.ds.transaction(async (manager) => {
      const job = await this.locked(manager, id);
      if (job.status === 'COMPLETED') throw new MediaCatalogError('JOB_CLOSED', 409);
      if (input.title !== undefined) job.title = mediaText(input.title, 200);
      const instructions = optionalText(input.instructions, 20000);
      if (instructions !== undefined) job.instructions = instructions;
      const statusNote = optionalText(input.statusNote, 500);
      if (statusNote !== undefined) job.statusNote = statusNote;
      if (input.status !== undefined) {
        const status = enumOf(input.status, AUTOMATION_JOB_STATUSES, 'INVALID_JOB_STATUS');
        if (status === 'COMPLETED') throw new MediaCatalogError('USE_COMPLETE_ENDPOINT');
        job.status = status;
      }
      return manager.getRepository(AutomationJob).save(job);
    });
  }

  /** 완료 처리 + cleanupDecision 저장. 정리 실행은 별도(cleanup). */
  async complete(id: string, input: Record<string, unknown>): Promise<AutomationJob> {
    mediaUuid(id);
    const decision = enumOf(input.cleanupDecision, AUTOMATION_JOB_CLEANUP_DECISIONS, 'INVALID_CLEANUP_DECISION');
    return this.ds.transaction(async (manager) => {
      const job = await this.locked(manager, id);
      this.assertOpen(job);
      job.status = 'COMPLETED';
      job.completedAt = new Date();
      job.cleanupDecision = decision;
      return manager.getRepository(AutomationJob).save(job);
    });
  }

  /**
   * asset 연결. Job 존재 + 열린 상태 검증 후 media row lock(기존 link/delete 직렬화 규칙) 안에서 기록한다.
   * 같은 asset 을 같은 Job 에 두 purpose 로 두지 않는다 — purpose 변경은 재연결로 처리.
   */
  async linkAsset(id: string, input: Record<string, unknown>): Promise<{ linkId: string }> {
    mediaUuid(id);
    const mediaAssetId = mediaUuid(input.mediaAssetId);
    const purpose = enumOf(input.purpose, JOB_ASSET_PURPOSES, 'INVALID_PURPOSE');
    return this.ds.transaction(async (manager) => {
      const job = await this.locked(manager, id);
      this.assertOpen(job);
      await this.catalog.locked(manager, mediaAssetId);
      await manager.query(
        'DELETE FROM media_entity_links WHERE media_asset_id=$1 AND entity_type=$2 AND entity_id=$3 AND purpose<>$4',
        [mediaAssetId, JOB_ENTITY_TYPE, job.id, purpose],
      );
      const rows = await manager.query(
        `INSERT INTO media_entity_links(media_asset_id,entity_type,entity_id,purpose) VALUES($1,$2,$3,$4)
         ON CONFLICT(media_asset_id,entity_type,entity_id,purpose) DO UPDATE SET purpose=EXCLUDED.purpose RETURNING id`,
        [mediaAssetId, JOB_ENTITY_TYPE, job.id, purpose],
      );
      return { linkId: rows[0].id };
    });
  }

  async unlinkAsset(id: string, linkId: string): Promise<void> {
    mediaUuid(id);
    return this.ds.transaction(async (manager) => {
      const job = await this.locked(manager, id);
      this.assertOpen(job);
      // TypeORM pg driver 는 DELETE/UPDATE 에 [records, affected] 를 돌려준다.
      const [, affected] = await manager.query(
        'DELETE FROM media_entity_links WHERE id=$1 AND entity_type=$2 AND entity_id=$3',
        [mediaUuid(linkId), JOB_ENTITY_TYPE, job.id],
      );
      if (!affected) throw new MediaCatalogError('LINK_NOT_FOUND', 404);
    });
  }

  /**
   * 정리 계획. INTERMEDIATE 만 후보. INPUT(원본)·OUTPUT 은 항상 KEEP.
   * 후보 중 다른 entity 연결 / 후손(lineage) / Screen Set 사용이 있으면 관계만 해제(UNLINK_ONLY).
   */
  private async plan(
    manager: EntityManager,
    job: AutomationJob,
    decision: AutomationJobCleanupDecision,
    keepLinkIds: Set<string>,
  ): Promise<CleanupItem[]> {
    const links = await this.links(manager, job.id);
    const items: CleanupItem[] = [];
    for (const link of links) {
      const item: CleanupItem = { linkId: link.linkId, purpose: link.purpose, asset: link.asset, plan: 'KEEP' };
      const candidate =
        link.purpose === 'INTERMEDIATE' &&
        (decision === 'KEEP_OUTPUTS' || (decision === 'KEEP_SELECTED' && !keepLinkIds.has(link.linkId)));
      if (candidate) {
        const [elsewhere] = await manager.query(
          `SELECT 1 FROM media_entity_links WHERE media_asset_id=$1 AND NOT (entity_type=$2 AND entity_id=$3) LIMIT 1`,
          [link.asset.id, JOB_ENTITY_TYPE, job.id],
        );
        const [descendant] = await manager.query(
          'SELECT 1 FROM media_assets WHERE parent_asset_id=$1 OR root_asset_id=$1 LIMIT 1',
          [link.asset.id],
        );
        if (elsewhere) Object.assign(item, { plan: 'UNLINK_ONLY', reason: 'LINKED_ELSEWHERE' });
        else if (descendant) Object.assign(item, { plan: 'UNLINK_ONLY', reason: 'LINEAGE_PROTECTED' });
        else if (link.asset.url && (await this.library.screenSetUsageCount(link.asset.url)) > 0)
          Object.assign(item, { plan: 'UNLINK_ONLY', reason: 'SCREEN_SET_IN_USE' });
        else item.plan = 'DELETE';
      }
      items.push(item);
    }
    return items;
  }

  private cleanupInput(input: Record<string, unknown>) {
    const decision = enumOf(input.decision, AUTOMATION_JOB_CLEANUP_DECISIONS, 'INVALID_CLEANUP_DECISION');
    const raw = input.keepLinkIds;
    const list = Array.isArray(raw) ? raw : typeof raw === 'string' && raw ? raw.split(',') : [];
    return { decision, keepLinkIds: new Set(list.map((v) => mediaUuid(String(v).trim()))) };
  }

  async cleanupPreview(id: string, input: Record<string, unknown>) {
    mediaUuid(id);
    const { decision, keepLinkIds } = this.cleanupInput(input);
    return this.ds.transaction(async (manager) => {
      const job = await this.locked(manager, id);
      if (job.status !== 'COMPLETED') throw new MediaCatalogError('JOB_NOT_COMPLETED', 409);
      return { decision, items: await this.plan(manager, job, decision, keepLinkIds) };
    });
  }

  /**
   * 정리 실행. 항목마다 독립 트랜잭션: link 해제 + asset 삭제를 한 단위로 묶어, 삭제가 guard/storage 로
   * 실패하면 link 도 남긴다(BLOCKED / STORAGE_DELETE_FAILED). 결과는 항목별로 구분해 돌려준다.
   */
  async cleanupApply(id: string, input: Record<string, unknown>) {
    mediaUuid(id);
    const { decision, keepLinkIds } = this.cleanupInput(input);
    const items = await this.ds.transaction(async (manager) => {
      const job = await this.locked(manager, id);
      if (job.status !== 'COMPLETED') throw new MediaCatalogError('JOB_NOT_COMPLETED', 409);
      job.cleanupDecision = decision;
      await manager.getRepository(AutomationJob).save(job);
      return this.plan(manager, job, decision, keepLinkIds);
    });
    for (const item of items) {
      if (item.plan === 'KEEP') {
        item.result = 'KEPT';
        continue;
      }
      try {
        await this.ds.transaction(async (manager) => {
          await manager.query('DELETE FROM media_entity_links WHERE id=$1 AND entity_type=$2 AND entity_id=$3', [
            item.linkId,
            JOB_ENTITY_TYPE,
            id,
          ]);
          if (item.plan === 'DELETE') await this.library.deleteAssetIn(manager, item.asset.id);
        });
        item.result = item.plan === 'DELETE' ? 'DELETED' : 'UNLINKED';
      } catch (error) {
        const code = (error as { code?: string }).code ?? 'CLEANUP_FAILED';
        item.result = code === 'MEDIA_STORAGE_DELETE_FAILED' ? 'STORAGE_DELETE_FAILED' : 'BLOCKED';
        item.code = code;
      }
    }
    return { decision, items };
  }
}
